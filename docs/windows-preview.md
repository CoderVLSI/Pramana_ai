# Windows portable preview

Download package: Pramana-Windows-preview.zip. Extract completely and open Start-Pramana.cmd. Supports Windows 10/11 x64 and includes an official checksum-verified Node.js v22.23.3 runtime, static Expo web export, and a compiled local Fastify backend. Edge app mode is used when Edge is found; default browser fallback otherwise. Keep the console open and press Ctrl+C to stop.

Servers bind only to loopback. The backend now supports HOST and PRAMANA_DATA_DIR overrides; defaults for existing development remain unchanged. The Windows launcher stores backend settings and feedback under LOCALAPPDATA/Pramana/data. No credentials or private scripture OCR are included in the ZIP.

The five Gita development fixtures support local test searches. All other collections remain pending source review. Live voice remains unconnected. This is a portable browser-based preview, not a native Windows installer.

Validation: TypeScript and all 26 JavaScript tests and 10 Python pipeline tests pass. Packaged browser-to-API flow confirms ordinary greetings no longer enter scripture search, no-key fallback is explicit, scripture abstention remains enforced, and the settings token persists across reloads. Provider adapters and saved-key route were tested with mocked Gemini/OpenAI responses, not a real user key. Windows launcher has not been exercised on Windows.

Greetings/app help now use the configured provider’s text API. Live voice remains unconnected; saving a key does not approve scripture sources. Browser settings tokens persist across app sessions; keys remain encrypted in the local backend.

ZIP SHA-256: 1b543b207d3e7a039adcb2a5e70e745edd205bca8f13a5bdcf0abf014f66a513
