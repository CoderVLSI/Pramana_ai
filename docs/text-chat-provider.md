# Connected greetings and app navigation

`generateWelcome` in `services/api/src/chat-provider.ts` takes a provider, an API key supplied by the route from its settings vault, an optional name, and a query. It never reads credentials from disk, logs upstream errors, or places keys in URLs. The caller must classify ordinary greetings/navigation separately from scripture questions; this module is not an alternate scripture-answer route.

Gemini lists key-authorized model metadata and selects up to two Flash models advertising `generateContent`. Stable releases precede previews, then newer numeric versions; Live, audio, image, embedding, TTS and explicitly named thinking variants are excluded. OpenAI lists authorized models and tries `gpt-4.1-mini`, then `gpt-4.1-nano` or `gpt-4o-mini`, using the Responses API. These are ordinary text models, independent of voice Settings.

The provider selects one of five approved greeting/navigation identifiers. Only the corresponding application-authored message is returned. Arbitrary generated text, scripture quotations and fabricated citations cannot pass this allowlist. The returned model identifies the actual successful API request; the message is a template selected by that model, not unrestricted generated prose.

All requests share one eight-second timeout, with at most two generation attempts. Missing keys, authentication, quota, missing models, timeouts and network errors produce sanitized `ChatProviderError` messages. Authentication errors stop fallback. A route may provide a clearly labeled local greeting when the provider fails; it must not claim that fallback came from Gemini/OpenAI.

Verified with mocked API responses: model discovery, header credentials, exclusion of Live models, OpenAI Responses body, bounded capacity fallback, sanitized authentication failure, invalid output rejection and missing-model handling. No real user key or paid live generation was used by these tests.

Official references reviewed October 2026:

- [Gemini model discovery and supported methods](https://ai.google.dev/api/models)
- [Gemini API authentication and generation](https://ai.google.dev/api)
- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI model catalogue](https://platform.openai.com/docs/models)

## App endpoint

`POST /v1/chat` accepts `{ query, preferred_name? }` (500/80 character limits) using the same bearer token and credential-transport checks as Settings. The exact `isAppConversation` classifier permits only ordinary greeting/navigation intents; other queries return 422 and must use the scripture-question route. The active provider's stored key is read server-side.

Responses contain `kind: app_conversation`, `message`, `provider`, `model`, and `connection_status`. A successful real provider request reports `connected` with its model. Missing keys report `not_configured`; provider errors report `failed`. Both fallback states use a local greeting, `model: null`, and an explicit sanitized note identifying the local response. Fastify injection tests cover all three states, saved-key routing, intent rejection, response secrecy and input limits. No live-key call was used in validation.
