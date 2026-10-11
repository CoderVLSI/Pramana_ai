package org.pramana.study

import android.Manifest
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

/** Foreground-only PCM16 transport: 16 kHz microphone, 24 kHz streamed speaker.
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
  @Volatile private var track: AudioTrack? = null
  private var record: AudioRecord? = null
  private var captureThread: Thread? = null
  private var echo: AcousticEchoCanceler? = null
  private var noise: NoiseSuppressor? = null
  private var oldSpeaker = false
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
  @Synchronized @ReactMethod
  fun start(capture: Boolean, promise: Promise) {
    shutdown()
    try {
      if (capture && context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
        throw SecurityException("Microphone permission is required.")
      oldSpeaker = manager.isSpeakerphoneOn
      if (manager.requestAudioFocus(focus, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED)
        throw IllegalStateException("Another app is using audio. Close it and retry.")
      focused = true
      manager.mode = AudioManager.MODE_IN_COMMUNICATION
      // Respect wired/Bluetooth headsets; otherwise use the loudspeaker.
      val headset = manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS).any {
        it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET || it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
        it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || it.type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
        it.type == AudioDeviceInfo.TYPE_USB_HEADSET
      }
      if (Build.VERSION.SDK_INT >= 31) {
        if (!headset) manager.availableCommunicationDevices.firstOrNull {
          it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
        }?.let { manager.setCommunicationDevice(it) }
      } else manager.isSpeakerphoneOn = !headset
      val outMin = AudioTrack.getMinBufferSize(24000, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
      require(outMin > 0)
      track = AudioTrack.Builder()
        .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
        .setAudioFormat(AudioFormat.Builder().setSampleRate(24000).setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
        .setBufferSizeInBytes(maxOf(outMin * 2, 4800))
        .setTransferMode(AudioTrack.MODE_STREAM).build()
      require(track?.state == AudioTrack.STATE_INITIALIZED)
      lastError = ""
      capturedFrames.set(0)
      writtenFrames.set(0)
      running = true
      if (capture) {
        val inMin = AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        require(inMin > 0)
        val recorder = AudioRecord(MediaRecorder.AudioSource.VOICE_COMMUNICATION, 16000,
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
          try {
            while (running && record === recorder) {
              val count = recorder.read(buffer, 0, buffer.size)
              if (count < 0) throw IllegalStateException("Microphone capture failed.")
              if (count > 0 && running && record === recorder) {
                packets++
                if (Build.VERSION.SDK_INT >= 29 && packets % 25 == 0 &&
                    recorder.activeRecordingConfiguration?.isClientSilenced == true) {
                  emit("error", "Android silenced the microphone. Close other voice calls or enable microphone access, then retry.")
                  shutdown()
                  break
                }
                capturedFrames.addAndGet((count / 2).toLong())
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
    output.execute {
      try {
        if (!running || epoch != playbackEpoch || speaker == null || track !== speaker) return@execute
        speaker.play()
        emit("playing")
        var offset = 0
        while (offset < bytes.size && running && epoch == playbackEpoch && track === speaker) {
          val written = synchronized(speaker) {
            if (!running || epoch != playbackEpoch) 0
            else speaker.write(bytes, offset, bytes.size - offset, AudioTrack.WRITE_NON_BLOCKING)
          }
          if (written < 0) throw IllegalStateException("Speaker write failed.")
          if (written == 0) SystemClock.sleep(5) else { offset += written; writtenFrames.addAndGet((written / 2).toLong()) }
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
      if (running && epoch == playbackEpoch) emit("ended")
    }
  }
  @ReactMethod fun interrupt() {
    playbackEpoch++
    try { track?.let { speaker -> synchronized(speaker) {
      speaker.pause(); speaker.flush(); writtenFrames.set(0)
    } } } catch (_: Exception) {}
    emit("ended")
  }
  @ReactMethod fun stop() { shutdown() }
  @Synchronized private fun shutdown() {
    running = false
    playbackEpoch++
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
  override fun onHostPause() { if (running) { emit("paused"); shutdown() } }
  override fun onHostDestroy() { shutdown() }
  override fun invalidate() { shutdown(); output.shutdownNow(); context.removeLifecycleEventListener(this); super.invalidate() }
}
