# Voice models and fallback policy

Official documentation checked 9 October 2026.

| Provider | Main | Fallbacks | Notes |
|---|---|---|---|
| OpenAI | `gpt-realtime-2.1` | `gpt-realtime-2.1-mini`, `gpt-realtime-2` | Realtime API, server-side WebSocket adapter |
| Gemini | `gemini-3.8-live` | `gemini-3.8-live-extended-thinking`, `gemini-3.1-flash-live-preview` | Google GenAI Live adapter; legacy preview skipped from 17 November 2026 |

Sources:

- [OpenAI Realtime 2.1](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)
- [OpenAI Realtime 2.1 Mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
- [OpenAI Realtime 2](https://developers.openai.com/api/docs/models/gpt-realtime-2)
- [OpenAI WebSocket guide](https://developers.openai.com/api/docs/guides/voice-websockets)
- [Gemini Live quickstart](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk)
- [Gemini model shutdown schedule](https://ai.google.dev/gemini-api/docs/deprecations)

Model access depends on the account, region, quota, and current provider availability. A connection check requests selected-model metadata, not audio. It does not prove live-session readiness. Model names and retirement dates are pinned in `services/api/src/provider-models.ts`; recheck the catalog before release. Older Gemini previews are not a long-term fallback strategy.

## Settings

Open the header gear or About → API keys & voice settings. Add OpenAI and/or Gemini keys, choose the active provider/model, choose and reorder fallback models, save, then test the connection. Replace or remove individual keys, or delete the entire settings session.

Credentials are encrypted with AES-256-GCM on the backend and never returned to the app. The app holds a private bearer session token in Android SecureStore; the web preview uses tab-scoped sessionStorage. Keys are entered transiently in a masked input and cleared after save. Reloading the browser tab retains its settings session; closing it loses access. There is no account-based recovery or cross-device sync yet.

Development encryption key: generated once in the ignored local data directory, with owner-only permissions. Production requires a stable 64-hex-character `SETTINGS_MASTER_KEY` from a secret manager. Losing or changing this key makes saved credentials unreadable. Credential traffic requires HTTPS except loopback, or an explicit non-production LAN override. Reverse proxy trust must be configured to the actual trusted proxy.

## Fallback behavior

The main model is tried first, followed by the user-selected ordered same-provider fallbacks. Cross-provider fallback is off by default and can be enabled in Settings; both provider keys should be saved. Verified scripts may then go to the second provider, with that provider's usage charges.

Retry eligible: provider capacity errors, rate limits, server failures, network interruptions, or timeouts. Authentication/configuration errors, mismatched speech wording, and source-verification failures stop without retry. Attempts are bounded to four model requests and sixty seconds, with at most twenty seconds per attempt. No partial generated audio is released.

## Strict speech boundary

Realtime sessions stay on the backend. The app cannot obtain unrestricted generative session credentials. The verified-turn endpoint first resolves sources and checks source review/citations; only then may it call a voice adapter. Audio is buffered, the model's output transcript must match the authorized script, and a router-level check repeats the comparison before returning WAV audio. Output transcription is an additional check, not proof that every audio sample was spoken faithfully.

All current corpus fixtures remain unapproved and `safe_to_speak: false`. Thus no scripture speech or provider billing is triggered by asking fixture questions. Native microphone streaming, app audio playback, natural duplex conversation, and actual provider-account audio tests are not completed. This change adds configuration, provider adapters, and fallback routing without bypassing the architecture's source gate.
