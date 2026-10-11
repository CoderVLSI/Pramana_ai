package org.pramana.study;

import android.media.AudioRecord;
import android.app.Activity;
import android.content.Intent;
import android.media.AudioTrack;
import android.test.InstrumentationTestCase;
import android.util.Base64;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.PromiseImpl;
import com.facebook.react.bridge.ReactApplicationContext;
import java.lang.reflect.Field;
import java.util.concurrent.atomic.AtomicLong;

/** On-device native transport test, with no API credential or network.
 * Silent emulator capture verifies PCM delivery; playback verifies AudioTrack draining.
 * It does not establish audible output or recognition quality on physical hardware. */
public class PramanaAudioSmokeTest extends InstrumentationTestCase {
  private Object field(Object value, String name) throws Exception {
    Field field = value.getClass().getDeclaredField(name);
    field.setAccessible(true);
    return field.get(value);
  }
  public void testDuplexCapturePlaybackInterruptAndStop() throws Exception {
    Intent intent = new Intent(getInstrumentation().getTargetContext(), MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    Activity activity = getInstrumentation().startActivitySync(intent);
    Thread.sleep(1000);
    MainApplication app = (MainApplication) getInstrumentation().getTargetContext().getApplicationContext();
    ReactApplicationContext context = null;
    for (int i = 0; i < 120; i++) {
      context = (ReactApplicationContext) app.getReactHost().getCurrentReactContext();
      if (context != null && context.hasActiveReactInstance()) break;
      Thread.sleep(500);
    }
    assertNotNull("React context did not initialize", context);
    PramanaAudioModule audio = context.getNativeModule(PramanaAudioModule.class);
    assertNotNull("PramanaLiveAudio is not registered in the running app", audio);
    final Object[][] failure = {null};
    final boolean[] resolved = {false};
    try {
      audio.start(true, new PromiseImpl((Callback) args -> resolved[0] = true, (Callback) args -> failure[0] = args));
      assertNull("Native start rejected", failure[0]);
      assertTrue("Native start unresolved", resolved[0]);
      AtomicLong captured = (AtomicLong) field(audio, "capturedFrames");
      AtomicLong written = (AtomicLong) field(audio, "writtenFrames");
      for (int i = 0; i < 100 && captured.get() == 0; i++) Thread.sleep(50);
      assertTrue("Microphone produced no PCM frames: " + field(audio, "lastError") + "; running=" + field(audio, "running"), captured.get() > 0);
      AudioRecord recorder = (AudioRecord) field(audio, "record");
      assertEquals(AudioRecord.RECORDSTATE_RECORDING, recorder.getRecordingState());
      long before = captured.get();
      // 200 ms PCM16 mono 24 kHz tone.
      byte[] tone = new byte[9600];
      for (int i = 0; i < tone.length / 2; i++) {
        short sample = (short) (Math.sin(i * 2 * Math.PI * 440 / 24000) * 1500);
        tone[i * 2] = (byte) sample;
        tone[i * 2 + 1] = (byte) (sample >> 8);
      }
      audio.play(Base64.encodeToString(tone, Base64.NO_WRAP));
      audio.endTurn();
      Thread.sleep(600);
      assertEquals("Speaker did not write expected frames", 4800L, written.get());
      assertTrue("Microphone stopped while speaker played", captured.get() > before);
      AudioTrack track = (AudioTrack) field(audio, "track");
      assertTrue("Speaker frames never reached playback head", track.getPlaybackHeadPosition() > 0);
      audio.interrupt();
      Thread.sleep(100);
      assertEquals(AudioTrack.PLAYSTATE_PAUSED, track.getPlayState());
      assertEquals(AudioRecord.RECORDSTATE_RECORDING, recorder.getRecordingState());
      audio.play(Base64.encodeToString(tone, Base64.NO_WRAP));
      Thread.sleep(600);
      assertEquals(AudioTrack.PLAYSTATE_PLAYING, track.getPlayState());
      audio.stop();
      assertNull("Microphone not released", field(audio, "record"));
      assertNull("Speaker not released", field(audio, "track"));
    } finally { audio.invalidate(); getInstrumentation().runOnMainSync(() -> activity.finish()); }
  }
}
