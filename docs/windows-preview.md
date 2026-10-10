# Windows portable preview

Download package: Pramana-Windows-preview.zip. Extract completely and open Start-Pramana.cmd. Supports Windows 10/11 x64 and includes an official checksum-verified Node.js v22.23.3 runtime, static Expo web export, and a compiled local Fastify backend. Edge app mode is used when Edge is found; default browser fallback otherwise. Keep the console open and press Ctrl+C to stop.

Servers bind only to loopback. The backend now supports HOST and PRAMANA_DATA_DIR overrides; defaults for existing development remain unchanged. The Windows launcher stores backend settings and feedback under LOCALAPPDATA/Pramana/data. No credentials or private scripture OCR are included in the ZIP.

The five Gita development fixtures support local test searches. All other collections remain pending source review. Tap-to-talk voice and spoken replies are available; browser live conversation supports microphone/audio streaming and source tools; native Android uses device-transcription turns. This is a portable browser-based preview, not a native Windows installer.

Validation: TypeScript and all 43 JavaScript tests and 10 Python pipeline tests pass. Packaged browser-to-API flow confirms ordinary greetings no longer enter scripture search, no-key fallback is explicit, scripture abstention remains enforced, and the settings token persists across reloads. Provider adapters and saved-key route were tested with mocked Gemini/OpenAI responses, not a real user key. Windows launcher has not been exercised on Windows.

Greetings/app help now use the configured provider’s text API. Voice mode can speak greetings and source-status replies; scripture audio still requires reviewed audio-enabled passages. Saving a key does not approve scripture sources. Browser settings tokens persist across app sessions; keys remain encrypted in the local backend.

ZIP SHA-256: b0ebbd8e77eda7963dd1e717bd271e53ab0111cc68fb041023df61c0b4cb2e4f

Voice validation: packaged browser checks passed editable dictation, provider WAV playback, device speech fallback, reply replay/stop and Rishi playback events. Recognition, device synthesis and provider responses were simulated; HTML audio playback was exercised with a test WAV. Physical microphone and live-key testing remain pending.

Live validation: simulated browser capture, PCM playback, interruption, source cards and Rishi animation pass. The packaged browser-to-backend connection reports missing-provider failures safely. Real-key streaming and physical-device testing remain pending.

Profiles include an editable preferred name and six bundled chibi avatars (Vishnu, Shiva, Durga, Ganesha, Surya, Skanda). Name and avatar save/reload and header edit were verified in the browser. Existing profiles default to Vishnu; avatar choice stays local and does not change Ishta Devata.

Automatic external search: local misses in text, tap-to-talk and enabled live sessions use the selected provider web search. Results retain external/unverified labels, HTTPS source links and Gemini suggestions; local approved citations remain unchanged. 43 tests pass, including grounded Gemini route/voice mocks and OpenAI executed-search/citation checks. Real-key web-search testing remains pending.
