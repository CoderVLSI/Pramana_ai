# Pramana privacy policy — unpublished draft

**Do not publish this document until every required placeholder and unresolved retention/deployment item is completed and checked against the release.** This describes the current development implementation, not a deployed production service. Prepared 9 October 2026.

Operator/legal developer identity: **[REQUIRED — legal/operator name]**

Privacy contact: **[REQUIRED — monitored email/address]**

Public policy URL: **[REQUIRED — stable public URL]**

Effective date: **[REQUIRED — actual publication date]**

## What the current app processes

Pramana is a scripture study preview. No name/email account registration is implemented. A random settings-session token identifies a provider-settings profile; it is not a named account, but it is a persistent identifier for that profile.

| Data | Purpose and current storage |
|---|---|
| Study questions and selected source filters | Sent to the configured Pramana backend to retrieve sample passages. The application code does not persist question history in a database or file. Questions remain in the current UI state. Backend request/infrastructure logging must still be assessed; this is not a promise that no infrastructure ever logs requests. |
| Saved passage identifiers | Stored locally on the device using app storage. The current bookmark feature does not synchronize them to the backend. |
| Correction reports | When you submit a report, its passage identifier, entered reason, generated case identifier, received status and submission time are saved on the backend. Reports may contain personal information if you type it. Do not include provider keys or other secrets in reports. |
| Provider API keys and preferences | If you choose to save a key, it is sent to the configured backend and stored with provider/model/fallback preferences in an AES-256-GCM encrypted profile. The running backend decrypts keys when necessary to call a provider; this is not end-to-end encryption that prevents the operator from accessing them. Saved keys are not returned to the app. |
| Settings-session token | Stored in native Android secure storage; the web preview stores it in browser-tab session storage. It authorizes access to that profile. Clearing this token alone can leave the server profile behind. |
| Network/operational data | The backend receives connection IP addresses and uses them in an in-memory rate-limit map, with roughly minute-long counters. Its request logger can record request URL, connection information, response status and timings. Hosting/proxy logs and their retention depend on the final deployment. Authorization headers and the API-key field are configured for redaction in application logging. |

The source code does not add advertising, analytics or payment SDKs. This must be rechecked against the final packaged SDK dependency inventory and hosting integrations before publication; do not infer that no third party can receive any data.

## Providers and other recipients

If you press a provider connection test, the backend authenticates to the selected OpenAI or Google Gemini service using your key to check model access. This check is not a live audio conversation and does not send your study question as part of the model-metadata test. Provider services receive the authenticated request and related network/account information according to their terms.

Normal text study questions currently use local backend sample retrieval; they are not sent to an AI generation provider by the question handler. A server voice endpoint exists, but the current samples fail its approved-source gate, and the app has no connected live microphone/audio playback flow. Consequently this build should not be described as recording user microphone conversations.

If approved voice playback is enabled in a future release, the selected provider would receive a verified reference/translation script for speech synthesis and return audio/transcription. Optional cross-provider fallback would permit another configured provider to receive that script; it is disabled by default. The operator must update this policy and the Data safety declaration before enabling materially different audio or AI data flows.

The final backend/hosting operator and infrastructure recipients are **[REQUIRED — deployment provider, service locations and recipient details]**. This draft does not invent a host or processing country.

## Retention and deletion

- Bookmarks can be removed with the bookmark control. Android app-data controls can clear app-local data; secure-storage behavior should be verified on the release device.
- Settings let you remove a provider key or delete the current server profile and its locally stored session token. “Reconnect settings session” clears the local identifier and starts another session; it is not the same as deleting the previous server profile.
- The current backend has no automatic profile-expiry policy. Encrypted profiles otherwise remain until deleted. **[REQUIRED — operator retention and backup-deletion periods]**.
- Correction reports currently have no automatic expiry or in-app deletion endpoint. **[REQUIRED — report retention period and a functional contact-based deletion process, including how a case identifier is used to locate a report]**.
- Backend and infrastructure log retention: **[REQUIRED — confirmed duration, controls and backup handling]**.

There is no implemented user-account system to delete. If named accounts are added later, their deletion process and applicable Play requirements must be implemented and disclosed.

## Security and your choices

Use a trusted backend over HTTPS. Production settings require an operator-supplied encryption master key; a local-development key is not an adequate production deployment plan. Encryption reduces exposure of stored credentials but cannot guarantee absolute security. Users can choose not to enter provider credentials, remove a saved key, delete the settings profile, remove bookmarks or avoid submitting a report.

Current development builds do not provide an offline full scripture corpus. Current corpus registrations and private OCR preparation do not imply that scripture text or voice features are publicly available.

## Children, requests and policy changes

Target age group and any children's-use handling: **[REQUIRED — owner decision aligned with the actual app and Play declarations]**. Do not publish an invented age cutoff or claim children are categorically excluded without an implemented/product decision.

For privacy questions or deletion requests, contact **[REQUIRED — privacy contact]**. Applicable user-rights request handling and response process: **[REQUIRED — operator process appropriate to deployment/users]**.

Future changes to data processing must be reflected in this policy and communicated as appropriate. Before release, the operator must verify these disclosures against the signed application, backend deployment and third-party SDKs, and provide a public policy accessible from both the app and store listing.
