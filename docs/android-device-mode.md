# Android device mode

Android now defaults to direct provider connections. Expo SecureStore stores a separate, versioned device-connection profile under Android Keystore protection. Provider keys never enter AsyncStorage, URLs, public build variables, or the settings response. Saving, replacing, removing a key and deleting all connections work locally, without a Pramana server. Existing backend keys are not copied automatically; enter them again on the phone. The name/profile store remains separate and editable.

1. Install the new device-mode APK.
2. Open Settings, choose Gemini or OpenAI, enter your own key and Save settings.
3. Tap Test connection. This calls the official provider model-metadata endpoint directly; it does not prove live voice access or usable billing quota.
4. Try a greeting, a scripture question with external sources, then Live conversation. Provider charges are billed to your account.

Text greetings use accessible text models. Scripture questions currently have no installed approved corpus, so the app searches the selected provider's web tool and labels its results external/unverified. Gemini requires actual grounding queries and HTTPS sources; OpenAI requires an executed search call and HTTPS citations. Web failures do not release ungrounded answers. Downloadable, reviewed local scripture packs remain future work; there are zero approved passages in this device build.

Regular voice mode uses the device speech service for input and speech synthesis for replies. Live conversation connects by native authenticated WebSocket to Gemini or OpenAI. Android sends device-transcribed text turns and plays streamed PCM provider audio; it is not raw-microphone, full-duplex streaming. Tool calls check actual local corpus status and can use external web search when enabled. Source filters come from the app selection, not model-provided scope. Generated speech remains unverified. Live startup is limited to two configured targets; completed conversations are not automatically replayed after failure. Text/web calls use the selected provider.

Android connections do not use `EXPO_PUBLIC_API_URL` by default. Set `EXPO_PUBLIC_CONNECTION_MODE=backend` only for an explicit backend build; its production HTTPS validation remains enabled. Web/Windows still use their backend and do not put provider keys into browser storage.

Validation: device storage/request tests and native transport protocol tests use simulated providers. They cover persistence, concurrent saves, redaction, deletion, header credentials, metadata failures, non-streaming native fetch, grounding checks, live text/audio/tools and missing-key errors. Actual Android Keystore behavior and provider WebSocket access need installed-device checks with the user's account. No real key was available to this workspace.

## Preview artifact — 10 October 2026

The local arm64 Android preview build succeeded and its APK signature verifies (test/debug certificate, not a Play upload certificate). Package `org.pramana.study`, version `0.1.0` / code `1`, minimum API 24, target API 36. APK size: 37,066,803 bytes. SHA-256: `1ef4bd8eae1e8220877a4ebc8ee0b6cb324dedc81355026e8fdb27bf342a8ea7`. The compiled bundle includes the device settings/provider modules and excludes backend implementation sources.

All 52 JavaScript tests and TypeScript checks pass. Web and Android exports also passed during implementation; the final APK was rebuilt after the Android fixture-reader and recovery-control edits. Production config accepts direct device mode without a backend URL and still rejects missing HTTPS URLs in explicit backend mode. No real Android phone or user API-key test has been performed here.
