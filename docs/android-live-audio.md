Android live voice now uses a native foreground PCM transport instead of device dictation. AudioRecord captures mono PCM16 at 16 kHz in communication mode and sends 40 ms chunks to the selected Live provider. AudioTrack plays incoming 24 kHz PCM chunks immediately; capture remains active during replies. The provider detects speech boundaries and interruptions. Finish turn explicitly signals Gemini's audio stream end when needed.

The Expo config plugin registers the React Native package and copies its Kotlin sources during Android prebuild. Permission is requested before capture. Stop, backgrounding, audio-focus loss and session timeout release capture, playback and routing. No microphone audio files are written. Hardware echo cancellation/noise suppression are enabled when supported; headphones may be needed on devices with ineffective acoustic cancellation.

Voice details expose microphone/reply packet counts and a local speaker tone using the same native live-audio route. It does not contact the provider. A connected socket by itself does not establish successful capture, replies or audible sound.

Verification sources: eval/device-client.test.ts checks bidirectional Gemini PCM transport and interruption. eval/android/PramanaAudioSmokeTest.java checks native capture frames, concurrent playback, speaker playback head advancement, interruption/resumption and cleanup on Android. Silent emulator capture cannot establish audible output, recognition accuracy, echo cancellation quality or physical OnePlus behavior. Provider tests in this update use fixtures, not a user's API key.

Runtime safeguards use Android's communication-device routing on API31+, release this app's mode ownership on stop, and treat unavailable echo/noise effects as optional. A five-second missing-frame timeout and API29+ silenced-recording detection surface microphone problems rather than leaving a silent connected session.

Verification on 11 October 2026: 79 tests, TypeScript, web export, mocked browser chat/image flow, arm64 APK build, signature and actual packaged permission checks passed. The first Android instrumentation run found the registered module and started native audio, but failed the microphone-frame assertion in an audio-disabled emulator. Further runtime attempts were blocked by emulator graphics failures and audio-driver initialization failures. Native capture/playback, audible sound and a complete live provider round trip on OnePlus Nord 4 remain unverified. The shared provider test credential was not used in this update.


## Reply playback and image messages update

Phone evidence showed 14 provider reply packets and an audible native speaker-test tone. This establishes transport and tone playback, but does not establish why provider speech was inaudible. Playback now uses Android media routing/volume, a one-frame start threshold on API 31+, a bounded stalled-write check, and a playback-head check. Received reply chunks are retained in memory (bounded to 4 MB) for Replay reply. If a provider errors after delivering audio, the received reply is replayed after disconnecting rather than silently discarded with the live track. Replay pauses the live microphone and tells the user to reconnect.

Send now includes PNG/JPEG pixels and the question in the provider message, with an image bubble. Choosing an image alone does not upload it. The optional Read image OCR action remains separate. Image interpretation is generated output, not verified scripture. Live provider credentials were not available for this update; provider image schemas are covered with protocol fixtures, not a live API test. Nord 4 speech playback still needs confirmation.


## Stuck-listening follow-up

After ending the other voice session, the Nord 4 no longer reported Android microphone silencing, but no spoken transcript or reply appeared. The raw Gemini adapter now sends `realtimeInput.audio` instead of the deprecated `mediaChunks` field and forwards explicit automatic activity detection settings. Input and output transcription remain enabled. Finish turn pauses outgoing chunks until the reply completes (or a bounded 20-second wait expires), so new capture cannot immediately restart the ended audio stream. A native PCM signal-level indicator distinguishes silence from detected sound; it is a scaled level meter, not a provider transcription acknowledgement. Protocol tests verify setup, audio input, input transcript forwarding, output audio and turn completion. Live cloud speech/phone playback remain unverified.


## Two-way voice reliability update

On the loudspeaker the native module now withholds microphone chunks while queued reply audio (plus a 400 ms tail) is still audible, so the provider no longer hears its own reply and interrupts itself. With a wired, USB or Bluetooth headset, capture stays open for full-duplex barge-in. Tap Interrupt to cut a reply on the loudspeaker. Capture also applies a slow, bounded automatic gain (up to 8×, only above the noise floor) because some phones deliver a very quiet voice-recognition signal that never trips the provider's speech detector. `.github/workflows/android-apk.yml` builds the APK on GitHub Actions. Not verified on a physical phone or against a live provider; the Kotlin changes were not compiled in the cloud workspace because the Android SDK host is blocked there.
