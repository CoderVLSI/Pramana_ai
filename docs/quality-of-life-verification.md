# Pramana 0.2.0 verification

Story: users configure reading and theme preferences, ask local-first questions, manage private study history/notes/resume, review alleged screenshot quotes, and opt into approved memory context; the Android app keeps device data local while calling configured providers only for connected features.

- 69 automated tests passed. These cover stored-data recovery and bounds, history retention/evidence labels, memory review/sharing separation, credential exclusion, source-language/edition selection, strict quote comparison, fixture exclusion, local-only network bypass, authentication on fact-check routes and mocked Gemini/OpenAI image-reading request formats.
- TypeScript and web export passed.
- Browser with actual local API confirmed theme/text preferences persist across reloads; local-only Study returns the appropriate source status; history recall/deletion persists; manual quote checking shows not verified without reviewed sources; image selection waits for an explicit read action and displays provider/key errors with manual input retained; library work filtering works.
- Separate browser flow verified notes/folders, bookmarking, reading resume, original-only display and data-deletion separation using clearly labelled backend development fixtures. Those fixtures are not installed in the Android APK.
- Memory browser flow confirmed explicit Remember statements create suggestions without network requests; scratchpad saves locally; memory sharing defaults off; approved items are present in the actual online Study request only after opt-in; the private scratchpad is absent from requests; save/delete persists.

Native build/launch evidence will be added after completing the new APK. No real provider credentials were used for vision or Live tests. Physical phone haptics, battery-restricted notification delivery, actual source-pack publisher downloads, vision transcription quality and real-account Live voice still require validation. This release includes zero reviewed scripture texts.

## Cloud backend preparation

Supabase owner-only migration and explicit-whitelist sync client prepared; three additional tests pass. Free project provisioning, authentication UI and two-account deployed isolation checks remain pending. Android x86_64 and arm64 release builds passed; arm64 signature verified. Emulator installation is still running, so launch is not yet verified for this build.

## Android permissions correction

The shipped preview lacked RECORD_AUDIO: the image-picker plugin's microphonePermission=false generated a removal directive. Corrected Expo configuration, regenerated Android from a clean prebuild while preserving the preview signing key, and added explicit microphone/notification declarations. App launch now requests microphone and notification permissions once; Settings includes retry and Android-settings controls. Reminders remain off until enabled. The packaged APK must pass `scripts/android-permission-check.py` before distribution. Physical prompt and voice provider verification remain pending.

## Gemini native handshake and Live error display

Compared native adapter authentication to the installed GoogleGenAI SDK: the SDK uses a `key` query parameter in its encrypted WSS handshake, while our adapter had supplied only an HTTP header. The adapter now follows the SDK format on the fixed Google endpoint; socket URLs and raw transport errors are not displayed by the app. OpenAI continues using header authentication. The Live UI now preserves a whitelist of sanitized connection-layer error messages instead of replacing all errors with a generic notice. Mock transport tests cover the updated handshake, tools and audio. These checks do not prove a real provider session works; real-key phone validation remains pending.
