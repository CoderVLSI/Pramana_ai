# Continuous live study conversation

`createLiveAgent` maintains a server-side Gemini Live or OpenAI Realtime connection using the selected settings profile. Provider credentials remain in server transport headers or the Gemini SDK; the client receives no provider key. The authenticated WebSocket/session layer is responsible for validating messages, selecting collection filters, and calling this adapter.

Interface: `createLiveAgent({ profile, send, runTool, preferredName?, enableWebSearch? })` returns `start()`, `inputAudio(base64)`, `inputText(text)`, `endInput()`, `interrupt()`, and `close()`. Microphone input is mono PCM16 at 16 kHz. Gemini receives that format directly; OpenAI input is linearly resampled to its required 24 kHz PCM format. Output audio is mono PCM16 at 24 kHz.

Events include `ready` (provider/model), `audio` (base64 `data`, `rate` and `sample_rate` 24000), `transcript` (role/text deltas), `tool` (name/status), `sources` (name/result), `interrupted`, `turn_end`, and sanitized `error`. Streaming responses carry `generated_unverified: true`. They are conversational model output, not the strict transcript-verified speech offered by `/v1/voice/turn`. Client labels must preserve this distinction.

Gemini tools include `search_scripture`, `corpus_status`, and optional built-in Google Search grounding. OpenAI declares the first two functions plus optional `web_search`, which the server tool dispatcher must implement. Custom-tool arguments are validated; source IDs and review statuses flow through tool results. Instructions require searches before scripture claims, exact returned source IDs, explicit draft-source qualifications, and separation of external web material. Instructions reduce hallucination risk but do not guarantee factual correctness or enforce every spoken citation before streaming.

OpenAI uses server VAD to detect turns, generate responses, and interrupt on speech. Explicit interruption sends `response.cancel`. Gemini uses automatic microphone activity detection; `interrupt()` signals the client to stop queued playback, while subsequent microphone speech interrupts provider generation. There is no fabricated Gemini cancellation endpoint. `endInput()` sends Gemini `audioStreamEnd`; OpenAI's VAD manages commits.

Limits: ten-minute session, twenty custom-tool invocations, fifteen-second tool timeout, twenty-second connection setup, 100 text turns, 24 MB microphone input and 64 MB output. Google Search calls are provider-managed and can incur additional charges; the custom-tool counter does not cap built-in searches. Provider tool failures return a sanitized result and never fabricated source data. Session disconnect stops output and closes provider transports. Session history is held by the provider for the connection and is not persisted by this adapter.

Nine mocked protocol tests cover both transports, real function-response dispatch shape, PCM resampling, stream events, sanitization and interruption. No real-key generation or physical microphone test was used. Unsupported model/tool combinations can still fail at runtime and produce a sanitized reconnect error; startup can retry at most two configured targets for transport/capacity failure, respecting cross-provider opt-in. Authentication failure never retries. Once ready or any audio/tool use has occurred, sessions are never replayed into another model.

Official references reviewed:

- [Gemini Live tool use](https://ai.google.dev/gemini-api/docs/live-api/tools)
- [Gemini Live SDK setup](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk)
- [OpenAI Realtime client events](https://developers.openai.com/api/reference/resources/realtime/client-events)
- [OpenAI Realtime server events](https://developers.openai.com/api/reference/resources/realtime/server-events)

OpenAI parallel function results are queued. The adapter waits for the original response to finish and all pending tools to resolve, then sends every function output followed by one continuation request. Duplicate call IDs do not dispatch again; interrupted tool rounds do not automatically resume.

When enabled, a local scripture-tool miss automatically performs a grounded text web search using the selected provider. The result has `fallback_from: local_scripture`, `local_source_status: not_verified`, and external source status. The live web-search switch disables this automatic fallback. Text `/v1/study` and tap-to-talk use the same dispatcher after an empty local result; web evidence never enters approved local citations. Gemini REST grounding requires search queries and HTTPS grounding links; OpenAI requires an executed search call and HTTPS citations.
