package org.pramana.study

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.media.*
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.SystemClock
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/** PCM16 transport (kept alive in the background by PramanaLiveService while a conversation runs): 16 kHz microphone, 24 kHz streamed speaker.
 * Never saves microphone audio. Each playback task is bounded and cancellable. */
@ReactModule(name = "PramanaLiveAudio")
class PramanaAudioModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), LifecycleEventListener {
  private val manager = context.getSystemService(android.content.Context.AUDIO_SERVICE) as AudioManager
  private val output = Executors.newSingleThreadExecutor()
  private val pendingBytes = AtomicInteger(0)
  private val capturedFrames = AtomicLong(0)
  private val writtenFrames = AtomicLong(0)
  @Volatile private var running = false
  @Volatile private var lastError = ""
  @Volatile private var playbackEpoch = 0
  // Wall-clock time until which queued reply audio is still audible. Without
  // hardware echo cancellation the microphone would hear the reply and the
  // provider would interrupt itself, so capture is withheld on the loudspeaker.
  @Volatile private var replyAudibleUntil = 0L
  @Volatile private var headsetRoute = false
  @Volatile private var track: AudioTrack? = null
  private var record: AudioRecord? = null
  private var captureThread: Thread? = null
  private var echo: AcousticEchoCanceler? = null
  private var noise: NoiseSuppressor? = null
  private var oldSpeaker = false
  @Volatile private var serviceOn = false
  private var focused = false
  private val focus = AudioManager.OnAudioFocusChangeListener { change ->
    if (running && change < 0) {
      emit("error", "Audio focus was lost. Tap the microphone to reconnect.")
      shutdown()
    }
  }
  init { context.addLifecycleEventListener(this) }
  override fun getName() = "PramanaLiveAudio"
  @ReactMethod fun addListener(name: String) {}
  @ReactMethod fun removeListeners(count: Int) {}
  private fun emit(type: String, data: String = "") {
    if (type == "error") lastError = data
    if (!context.hasActiveReactInstance()) return
    val value = Arguments.createMap()
    value.putString("type", type)
    value.putString("data", data)
    context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("PramanaLiveAudio", value)
  }
  private fun detectHeadset(): Boolean = try {
    manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).any {
      when (it.type) {
        AudioDeviceInfo.TYPE_WIRED_HEADSET, AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
        AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
        AudioDeviceInfo.TYPE_USB_HEADSET -> true
        else -> Build.VERSION.SDK_INT >= 31 && it.type == AudioDeviceInfo.TYPE_BLE_HEADSET
      }
    }
  } catch (_: Exception) { false }
  // While the service runs, Android keeps the microphone and the network connection alive in
  // the background; if it cannot start, the session still stops when the app is minimized.
  private fun startKeepAlive(listening: Boolean) {
    try {
      androidx.core.content.ContextCompat.startForegroundService(
        context, Intent(context, PramanaLiveService::class.java).putExtra("capture", listening))
      serviceOn = true
    } catch (_: Exception) { serviceOn = false }
  }
  private fun stopKeepAlive() {
    if (!serviceOn) return
    serviceOn = false
    try { context.stopService(Intent(context, PramanaLiveService::class.java)) } catch (_: Exception) {}
  }
  @Synchronized @ReactMethod
  fun start(capture: Boolean, promise: Promise) {
    shutdown()
    try {
      if (capture && context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
        throw SecurityException("Microphone permission is required.")
      oldSpeaker = manager.isSpeakerphoneOn
      if (manager.requestAudioFocus(focus, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED)
        throw IllegalStateException("Another app is using audio. Close it and retry.")
      focused = true
      startKeepAlive(capture)
      manager.mode = AudioManager.MODE_NORMAL
      // Media output follows the user's speaker/headset route and media volume.
      // Communication mode can send replies to a quiet call/earpiece route on OEM phones.
      val outMin = AudioTrack.getMinBufferSize(24000, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
      require(outMin > 0)
      track = AudioTrack.Builder()
        .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        .setAudioFormat(AudioFormat.Builder().setSampleRate(24000).setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
        .setBufferSizeInBytes(maxOf(outMin * 2, 4800))
        .setTransferMode(AudioTrack.MODE_STREAM).build()
      require(track?.state == AudioTrack.STATE_INITIALIZED)
      track?.setVolume(1.0f)
      if (Build.VERSION.SDK_INT >= 31) track?.setStartThresholdInFrames(1)
      lastError = ""
      replyAudibleUntil = 0L
      headsetRoute = detectHeadset()
      capturedFrames.set(0)
      writtenFrames.set(0)
      running = true
      if (capture) {
        val inMin = AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        require(inMin > 0)
        val recorder = AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, 16000,
          AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, maxOf(inMin * 2, 5120))
        record = recorder
        require(recorder.state == AudioRecord.STATE_INITIALIZED)
        try {
          if (AcousticEchoCanceler.isAvailable()) { echo = AcousticEchoCanceler.create(recorder.audioSessionId); echo?.enabled = true }
        } catch (_: Exception) { echo?.release(); echo = null }
        try {
          if (NoiseSuppressor.isAvailable()) { noise = NoiseSuppressor.create(recorder.audioSessionId); noise?.enabled = true }
        } catch (_: Exception) { noise?.release(); noise = null }
        recorder.startRecording()
        require(recorder.recordingState == AudioRecord.RECORDSTATE_RECORDING)
        captureThread = Thread({
          try { android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_AUDIO) } catch (_: Exception) {}
          val buffer = ByteArray(1280)
          var packets = 0
          var gain = 1.0
          try {
            while (running && record === recorder) {
              val count = recorder.read(buffer, 0, buffer.size)
              if (count < 0) throw IllegalStateException("Microphone capture failed.")
              if (count > 0 && running && record === recorder) {
                packets++
                if (packets % 5 == 0) {
                  var energy = 0.0
                  for (i in 0 until count - 1 step 2) {
                    val sample = ((buffer[i].toInt() and 255) or (buffer[i + 1].toInt() shl 8)).toShort().toDouble()
                    energy += sample * sample
                  }
                  val rms = kotlin.math.sqrt(energy / maxOf(1, count / 2))
                  emit("level", (rms / 32768.0 * 1000.0).coerceIn(0.0, 100.0).toInt().toString())
                }
                if (Build.VERSION.SDK_INT >= 29 && packets % 25 == 0 &&
                    recorder.activeRecordingConfiguration?.isClientSilenced == true) {
                  emit("error", "Android silenced the microphone. Close other voice calls or enable microphone access, then retry.")
                  shutdown()
                  break
                }
                if (packets % 50 == 0) headsetRoute = detectHeadset()
                // Some phones deliver a very quiet voice-recognition signal that
                // never trips the provider's speech detector. Apply a slow, bounded
                // automatic gain (only above the noise floor) before sending.
                var peak = 0
                for (i in 0 until count - 1 step 2) {
                  val v = Math.abs(((buffer[i].toInt() and 255) or (buffer[i + 1].toInt() shl 8)).toShort().toInt())
                  if (v > peak) peak = v
                }
                // Only lift clear speech (never background noise, which would keep
                // the provider from hearing the silence that ends a turn).
                if (peak > 1500) {
                  val wanted = (9000.0 / peak).coerceIn(1.0, 3.0)
                  gain += (wanted - gain) * (if (wanted < gain) 0.5 else 0.05)
                } else gain += (1.0 - gain) * 0.1
                if (gain > 1.01) {
                  for (i in 0 until count - 1 step 2) {
                    val v = ((buffer[i].toInt() and 255) or (buffer[i + 1].toInt() shl 8)).toShort().toInt()
                    val g = (v * gain).toInt().coerceIn(-32768, 32767)
                    buffer[i] = (g and 255).toByte()
                    buffer[i + 1] = ((g shr 8) and 255).toByte()
                  }
                }
                capturedFrames.addAndGet((count / 2).toLong())
                // Half-duplex on the loudspeaker; full duplex (barge-in) on headsets.
                if (headsetRoute || SystemClock.elapsedRealtime() >= replyAudibleUntil)
                  emit("audio", Base64.encodeToString(buffer, 0, count, Base64.NO_WRAP))
              }
            }
          } catch (_: Exception) {
            if (running && record === recorder) {
              emit("error", "Microphone capture stopped. Tap the microphone to retry.")
              shutdown()
            }
          }
        }, "PramanaMicrophone").apply { start() }
        Handler(Looper.getMainLooper()).postDelayed({
          if (running && record === recorder && capturedFrames.get() == 0L) {
            emit("error", "The microphone started but produced no audio. Close other voice apps, check microphone access, and retry.")
            shutdown()
          }
        }, 5000)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      shutdown()
      promise.reject("AUDIO_START", error.message ?: "Native audio could not start.")
    }
  }
  @ReactMethod fun play(data: String) {
    if (!running) return
    val bytes = try { Base64.decode(data, Base64.NO_WRAP) } catch (_: Exception) { emit("error", "The provider sent invalid audio."); return }
    if (bytes.isEmpty()) return
    if (bytes.size > 150000 || bytes.size % 2 != 0) { emit("error", "Unsupported speaker audio."); return }
    if (pendingBytes.addAndGet(bytes.size) > 960000) {
      pendingBytes.addAndGet(-bytes.size)
      emit("error", "Speaker playback fell behind. Reconnect to continue.")
      return
    }
    val epoch = playbackEpoch
    val speaker = track
    // 24 kHz mono PCM16 = 48 bytes/ms; keep a 400 ms tail for room echo.
    val now = SystemClock.elapsedRealtime()
    replyAudibleUntil = maxOf(replyAudibleUntil, now) + bytes.size / 48 + (if (replyAudibleUntil < now) 400 else 0)
    output.execute {
      try {
        if (!running || epoch != playbackEpoch || speaker == null || track !== speaker) return@execute
        speaker.play()
        emit("playing")
        var offset = 0
        var lastProgress = SystemClock.elapsedRealtime()
        while (offset < bytes.size && running && epoch == playbackEpoch && track === speaker) {
          val written = synchronized(speaker) {
            if (!running || epoch != playbackEpoch) 0
            else speaker.write(bytes, offset, bytes.size - offset, AudioTrack.WRITE_NON_BLOCKING)
          }
          if (written < 0) throw IllegalStateException("Speaker write failed.")
          if (written == 0) {
            if (SystemClock.elapsedRealtime() - lastProgress > 3000) throw IllegalStateException("Speaker stalled.")
            SystemClock.sleep(5)
          } else { lastProgress = SystemClock.elapsedRealtime(); offset += written; writtenFrames.addAndGet((written / 2).toLong()) }
        }
      } catch (_: Exception) {
        if (running && epoch == playbackEpoch) emit("error", "Speaker audio could not play. Check audio output and reconnect.")
      } finally { pendingBytes.addAndGet(-bytes.size) }
    }
  }
  @ReactMethod fun endTurn() {
    val epoch = playbackEpoch
    val speaker = track
    output.execute {
      if (!running || epoch != playbackEpoch || speaker == null || track !== speaker) return@execute
      // Drain the small device buffer after all queued chunks, without stopping capture.
      val target = writtenFrames.get()
      val end = SystemClock.elapsedRealtime() + 2000
      while (running && epoch == playbackEpoch && SystemClock.elapsedRealtime() < end &&
        (speaker.playbackHeadPosition.toLong() and 0xffffffffL) < target) SystemClock.sleep(10)
      if (running && epoch == playbackEpoch) {
        if (target > 0 && speaker.playbackHeadPosition == 0)
          emit("error", "Reply audio arrived but Android did not play it. Try Replay reply or reconnect.")
        else emit("ended")
      }
    }
  }
  @ReactMethod fun interrupt() {
    playbackEpoch++
    replyAudibleUntil = 0L
    try { track?.let { speaker -> synchronized(speaker) {
      speaker.pause(); speaker.flush(); writtenFrames.set(0)
    } } } catch (_: Exception) {}
    emit("ended")
  }
  @ReactMethod fun stop() { shutdown() }
  @Synchronized private fun shutdown() {
    running = false
    playbackEpoch++
    stopKeepAlive()
    val recorder = record
    record = null
    try { recorder?.stop() } catch (_: Exception) {}
    try { captureThread?.takeIf { it !== Thread.currentThread() }?.join(300) } catch (_: Exception) {}
    captureThread = null
    echo?.release(); echo = null
    noise?.release(); noise = null
    recorder?.release()
    val speaker = track
    track = null
    try { speaker?.pause(); speaker?.flush(); speaker?.release() } catch (_: Exception) {}
    if (focused) {
      manager.abandonAudioFocus(focus)
      if (Build.VERSION.SDK_INT >= 31) manager.clearCommunicationDevice()
      else manager.isSpeakerphoneOn = oldSpeaker
      // MODE_NORMAL removes this app's communication-mode owner; another
      // active call retains its own mode rather than leaving ours pinned.
      manager.mode = AudioManager.MODE_NORMAL
      focused = false
    }
  }
  override fun onHostResume() {}
  override fun onHostPause() { if (running && !serviceOn) { emit("paused"); shutdown() } }
  override fun onHostDestroy() { shutdown() }
  override fun invalidate() { shutdown(); output.shutdownNow(); context.removeLifecycleEventListener(this); super.invalidate() }
}
