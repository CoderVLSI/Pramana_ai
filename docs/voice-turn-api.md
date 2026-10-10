# Voice turn endpoint

`POST /v1/voice/turn` accepts `query` (up to 2,000 characters), optional `preferred_name` (80 characters), and optional `work_ids` / `edition_ids` (up to 160 entries, 200 characters each). It uses the same bearer-token settings profile, encrypted vault and HTTPS transport checks as provider Settings.

Exact ordinary greeting/navigation intents call the connected text adapter using the selected provider key, then use the configured realtime speech model and fallback order. Text-provider failure is identified explicitly as a local greeting. Missing keys preserve text with no audio.

Scripture requests run `answerStrict`. Only a verified answer with approved, audio-enabled citations is spoken, using the exact reference and source translation. Other scripture requests speak a fixed application-authored source-status message. Unsupported answer prose is never passed to the speech provider. Buffered speech must pass the existing transcript-to-script verification gate; failed or altered wording returns no audio.

The response includes `text`, `kind` (`app_conversation`, `verified_scripture` or `source_status`), `provider`, `audio`, optional scripture `answer`, and optional sanitized `note`. `audio` is null or the existing verified WAV response: `audio_base64`, `mime_type`, `transcript`, `provider`, `model`, `fallback_used`, `attempted_models`. This is a turn-based endpoint: microphone capture and playback belong to the client; it does not provide an unrestricted continuous provider session.

`/v1/voice/models` reports `voice_ready: true` for this turn route, while `approved_source_audio_ready: false` records the current corpus limitation. Availability of a backend route is not a claim of verified scripture sources or real-device audio testing.

Mocked Fastify integration validation covers missing keys, connected greeting selection, unsupported-source fixed speech, an approved test-only source, temporary-capacity fallback and rejection of altered speech. The test temporarily marks a fixture approved in its isolated test process and restores it afterward; no production corpus approval is performed. No real provider key, paid speech call or physical-device test was used.

## Client interaction

Enable Voice mode in Study. Tap Speak your question, allow microphone access, edit the transcript and press Ask aloud. Listening is limited to 30 seconds. Stop controls interrupt capture or reply playback. Rishi speaking animation follows actual playback events; it does not animate merely because a provider request is pending. Windows requires a browser speech service (Edge/Chrome recommended); devices without recognition can type and receive spoken replies.

Speech input uses the operating system/browser recognizer, which may process microphone audio through its own provider. Pramana sends the reviewed transcript to its backend, not raw microphone audio to Gemini/OpenAI. Replies use transcript-checked provider WAV, with explicitly disclosed device TTS fallback. This is a chained tap-to-talk flow, not streaming duplex voice or web-grounded fallback.

## Validation and limits

TypeScript and 27 JavaScript tests pass, including route authentication, missing keys, exact approved speech, fixed unsupported-source status, capacity fallback and withheld mismatched audio. Packaged Chromium checks use simulated recognition/TTS events and provider WAV responses: no microphone before a tap, transcript review before sending, speaking/end/stop animation, replay and source abstention all pass without browser errors. Actual microphone recognition and paid provider calls need a device/key test; these are not claimed as tested. Native Android arm64 release compilation and APK signature/RECORD_AUDIO checks pass. The Android preview still requires a reachable backend; localhost in its default development configuration does not refer to the Windows backend from a phone.

Web-grounding capabilities were checked against official documentation on 2026-10-10: Gemini Live supports explicitly configured Google Search tools (https://ai.google.dev/gemini-api/docs/live-tools); OpenAI Responses offers web_search (https://developers.openai.com/api/docs/guides/tools-web-search), which a Realtime function tool can call through the backend. Neither web tool is currently enabled in Pramana. Web citations would be labeled independently from edition-verified scripture citations.
