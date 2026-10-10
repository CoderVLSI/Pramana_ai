# Pramana privacy policy — unpublished draft

Do not publish until the required identity, contact and release-specific items are completed. Updated 10 October 2026. This describes development device mode and the optional backend/web mode; it does not certify a production release.

Operator/legal developer identity: **[REQUIRED — legal/operator name]**
Privacy contact: **[REQUIRED — monitored email/address]**
Public policy URL: **[REQUIRED — stable public URL]**
Effective date: **[REQUIRED — actual publication date]**

## Default Android device mode

No named account registration or Pramana backend is required. Optional setup asks for preferred name, language, study interests, interaction preference, avatar and Ishta Devata. Setup can be skipped; these preferences can be edited or deleted. Ishta Devata can reveal religious preferences and is optional.

| Data | Purpose and current handling |
|---|---|
| Provider API keys and model/fallback settings | Stored locally in Expo SecureStore, backed by Android Keystore. Keys are sent directly to the selected official provider using encrypted HTTPS/WebSocket connections and authenticated headers. Keys are not kept in AsyncStorage, URLs, public build variables or returned to the Settings form. The app reads keys locally to authenticate requests. |
| Name and study preferences | Stored locally in AsyncStorage, which is not encrypted by the app. Preferred name can be sent with greetings and live requests. Other profile preferences remain local. Avatar choices use bundled images and do not request photo-library access. |
| Questions and selected collections | Questions are sent directly to Gemini/OpenAI for greetings or external web search. Live tools use the app-selected collection scope, but no approved local scripture pack is installed. Up to 50 regular text turns are saved locally with evidence labels and source references; users can delete individual turns or clear history. Live sessions and audio are not recorded into this history. Providers may retain authenticated requests under their own terms. |
| Microphone input | Android's speech-recognition service transcribes speech and may process audio remotely. Regular voice input can be reviewed before sending. Live mode sends final transcription text turns to the selected AI provider; raw Android microphone audio is not streamed to that provider. |
| Spoken replies | Regular replies use device speech synthesis, which may use a device/provider service. Live plays streamed AI audio and stores temporary WAV playback files in the app cache. Normal completion/stop cleans up files; interrupted app termination can leave cache files. Generated live speech and external answers remain unverified. |
| Bookmarks and correction drafts | Bookmarks remain in device app storage. Corrections remain local and are not submitted to a reviewer; a bounded list keeps at most 50 drafts. Device app-data controls can remove them. |
| Connection/operational information | Provider services receive authenticated request metadata, including network/account information. No Pramana backend receives default Android requests. The application does not intentionally log provider credentials. |

Provider connection checks request model metadata, not a voice generation or scripture question. They do not prove billing quota or live voice availability. External web search sends the question to the selected provider, requires actual search evidence, and displays external sources separately. Opening HTTPS source links contacts their operators. Gemini search suggestions are rendered in a JavaScript-disabled native WebView and may load provider assets.

Live tools can search external references when the web-search switch is enabled. A search miss is not proof of absence from scripture. Live startup can try at most two configured models; another provider can receive context only when cross-provider fallback is explicitly enabled. Started conversations are not automatically replayed after a failure. Text and web calls use the selected provider. Live sessions stop on user action, app backgrounding, failure or the ten-minute limit.

Saved also contains a private scratchpad, pending memory suggestions and editable approved personal memories. These are stored locally in AsyncStorage. Explicit preference statements may become suggestions; the app does not infer preferences from arbitrary chats or train a model. Memory sharing is off by default. If enabled, only approved memory items are sent as personal context for online explanations and new Live sessions. The private scratchpad, unapproved suggestions and full history are not uploaded as memory. Common credential-shaped content is excluded from memory context. Memories never establish scripture evidence. Scratchpad and memory have separate edit, deletion and sharing controls.

Local reading preferences include theme, text size, line spacing, display mode and voice speed. Personal notes, bookmark folders and per-work reading positions are stored in AsyncStorage and are not encrypted by the app. They are not automatically uploaded. Settings can clear history, notes, folders and reading positions; bookmarks, profile, keys, packs and reminders have separate controls.

Screenshot fact-checking uses the system image picker. Selecting a screenshot does not send it to an AI provider. Tapping **Read screenshot with my AI provider** sends JPEG/PNG image data directly to the configured provider in Android device mode, or through the configured backend in web/backend mode. Image reading uses the provider’s quota and retention policy. Screenshots and extracted text are not intentionally persisted in Pramana history; picker/native caches and operating-system backups require release-device validation. Typed or reviewed quote text and its optional claimed reference can be sent for web fact-checking when the fallback switch is enabled. A wording match does not validate screenshot authenticity, attribution or interpretation.

Optional daily study reminders use local Android notifications. Notification permission is requested only when the user enables reminders. No notification server or push token registration is used. Reminder content is generic and does not expose religious preferences or questions. Android may delay delivery under battery restrictions.

## Optional backend mode and Windows/web

Web/Windows retain a configured Pramana backend. An explicitly selected Android backend build also uses it. These modes store provider keys and settings in AES-256-GCM encrypted backend profiles. The operator can decrypt keys to make provider calls; this is not end-to-end encryption against the operator. A settings-session bearer token is stored in browser localStorage or native SecureStore and authorizes the profile. Clearing that token alone does not delete the server profile.

Backend retrieval serves reviewed scripture excerpts separately from development fixtures. Questions, greetings, preferred name, source scope, web requests and voice scripts pass through the backend as applicable. Browser Live streams microphone audio to the backend/provider; native backend Live uses device transcription. Scripted backend narration checks returned transcripts before releasing audio; live generated speech remains unverified. Corrections are stored on the backend. Application and hosting logs can retain connection/status/timing data, with credential fields configured for redaction.

Backend operator/host, locations and recipients: **[REQUIRED if releasing backend mode — actual host, service locations and recipients]**.
Backend profiles, correction reports, logs and backup retention/deletion periods: **[REQUIRED if releasing backend mode — operator policy and functional deletion process]**. No automatic server profile/report expiry is currently implemented.

## Deletion and choices

Settings can remove individual keys or delete all device connection settings. Profile preferences and bookmarks have separate controls; deleting a study profile does not delete credentials or bookmarks. Android app-data controls remove app-local data; secure-storage and backup behavior must be verified on the actual release device. Previously saved backend keys are not migrated to the phone or removed automatically; delete the old backend profile through that build if desired.

Backend-mode Settings can delete the current encrypted server profile and session token. Reconnecting a session only clears its local identifier; it can leave the old profile on the server. Requests already sent to third-party providers cannot be recalled by deleting local keys; their retention and deletion policies apply.

## Providers, security and release requirements

Recipients include Google Gemini or OpenAI when configured, the device/browser speech service when used, and external websites when opened. Provider usage is billed to the user's account. Encryption reduces stored-key exposure but does not guarantee absolute security. No advertising, analytics or payment SDK is intentionally added; the final signed dependency inventory and third-party processing must be checked before publication.

There is no full offline scripture corpus in this build. Private OCR indexes, registered collections and publisher source leads do not establish approved in-app scripture availability.

Target age group/children's handling: **[REQUIRED — actual product decision and Play declarations]**.
User-rights/deletion request handling: **[REQUIRED — operator contact and applicable process]**.

Before publication, verify this policy against the signed build, providers, optional hosting and SDKs, complete the placeholders, host it publicly, and link it from the app and store. Future changes in processing must be reflected here.

### Optional cloud account and backups

Users may create an email/password account with Supabase. Supabase processes account credentials and email confirmation. Pramana keeps session tokens in device secure storage on Android, or browser tab session storage on web; passwords are not persisted by the app. Signing in does not upload local study data. Users can manually upload profile and reading preferences, and separately choose whether to include approved memories. The latest upload replaces their previous backup. API keys, private scratchpad, chat history, screenshots, and unapproved suggestions are excluded. Users can restore with confirmation or delete the cloud backup. Backup deletion leaves the authentication account intact; account deletion support is a release requirement still pending.
