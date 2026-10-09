# Pramana

Android-first scripture study companion built with Expo / React Native and a Fastify TypeScript API.

**Development prototype.** Five Bhagavad Gita fixtures demonstrate reference lookup, passage retrieval, citation integrity, bookmarks, reading, and correction reporting. Sanskrit fixtures still require named-edition mapping and scholarly review. English text is a development rendering; no publisher translation or scan is bundled.

## Run

Node 22+:

```sh
npm ci
npm run dev
```

Open http://localhost:8081. API: http://localhost:3001. Try `Bhagavad Gita 2.47`, `action`, or `restless mind`. Unsupported questions return `NOT_VERIFIED`.

Android: run `npm run api` and `npm run android -w @pramana/mobile`. Set `EXPO_PUBLIC_API_URL` to a device-reachable backend (emulator: `http://10.0.2.2:3001`; physical device: your computer's LAN address). Set `CLIENT_ORIGIN` for the web client's origin. Use HTTPS in production.

```sh
npm run typecheck
npm test
npm run build:web
```

## Structure

- `apps/mobile`: Study, Library, Saved, About, passage reader, app branding.
- `services/api`: exact and keyword retrieval, extractive answers, citation gate, local correction storage, IP rate limits.
- `services/ingest`: rights-manifest validator and immutable-ID import preparation.
- `packages/citation-schema`: shared data contracts.
- `infra/001_initial.sql`: proposed Postgres/pgvector schema, not used by the fixture runtime.
- `eval`: citation integrity, abstention, edition scope, and tampering tests.

## Trust and privacy

Answers contain verbatim development translation excerpts only. Text study needs no LLM calls or provider keys. Optional provider keys can be configured in Settings. The gate checks IDs, release, hashes, metadata, and excerpt spans; it does not establish scholarly accuracy. All fixture responses have `safe_to_speak: false`. Voice stays unavailable until approved sources and a provider are configured.

Bookmarks remain on the device. Corrections are stored in the local API's ignored `services/api/data/reports.jsonl`. No accounts, analytics, or raw audio recording are connected. Voice keys are encrypted on your backend; only a settings-session token is saved on the device. This API is for local development, not public production exposure.

## Corpus import

```sh
npx tsx services/ingest/import.ts source-bundle.json validated-bundle.json
```

Manifest requires `edition_id`, `license_id`, `release`, `publisher`, `source_url`, `permission_proof`, `rights_approved: true`, and two distinct `reviewers`. Passages require `work_id`, positive integer `chapter` and `verse`, and `original`. Translations require `translation_license_id`. Output is exclusively created and not automatically published or connected to the fixture API. Permission proofs and reviewer identities must be independently validated.

## Android builds

`apps/mobile/eas.json` includes internal APK and production AAB profiles. After configuring your Expo account/project and production API, run `npx eas-cli build --platform android --profile preview` from `apps/mobile`. No signed APK has been produced in this workspace.

## Before launch

Select precise editions, clear licenses, complete scholarly review, connect Postgres/auth/audits, add hybrid retrieval and entailment verification, and pass the plan's 250-case benchmark. Then validate the provider adapters with real accounts and integrate native microphone capture and audio playback. Edition comparison, Hindi/Telugu UI, offline packs, and full-duplex voice remain future work.

## Voice provider settings and fallback

Use the header gear or About → API keys & voice settings. Add/replace/remove provider keys, select models, reorder fallback models, and test metadata access. Defaults are OpenAI Realtime 2.1 and Gemini 3.8 Live. Cross-provider backup is optional and off by default. See [research and setup details](docs/voice-provider-research.md).

The backend encrypts keys with AES-256-GCM. Production requires `SETTINGS_MASTER_KEY`; local development creates an ignored owner-only encryption key. Android uses SecureStore for the session token, and web uses tab-scoped sessionStorage. Use HTTPS for remote credentials. Native LAN HTTP development requires the explicit non-production setting `ALLOW_INSECURE_LOCAL_SETTINGS=true`.

Provider audio is buffered and checked before release. Fixtures still cannot pass the voice source gate. The adapters and fallback routing have mocked tests; live microphone streaming, in-app audio playback, and real-account provider audio validation remain pending.

## Corpus scope

All 18 Mahapuranas are listed in the library as planned; none is ingested into RAG yet. See the [corpus register](docs/corpus-register.md), [validation record](docs/verification.md), and [original architecture plan](docs/architecture-plan.pdf).
