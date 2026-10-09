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

Answers contain verbatim development translation excerpts only. No LLM calls or provider keys are needed. The gate checks IDs, release, hashes, metadata, and excerpt spans; it does not establish scholarly accuracy. All fixture responses have `safe_to_speak: false`. Voice stays unavailable until approved sources and a provider are configured.

Bookmarks remain on the device. Corrections are stored in the local API's ignored `services/api/data/reports.jsonl`. No accounts, analytics, or raw audio recording are connected. This API is for local development, not public production exposure.

## Corpus import

```sh
npx tsx services/ingest/import.ts source-bundle.json validated-bundle.json
```

Manifest requires `edition_id`, `license_id`, `release`, `publisher`, `source_url`, `permission_proof`, `rights_approved: true`, and two distinct `reviewers`. Passages require `work_id`, positive integer `chapter` and `verse`, and `original`. Translations require `translation_license_id`. Output is exclusively created and not automatically published or connected to the fixture API. Permission proofs and reviewer identities must be independently validated.

## Android builds

`apps/mobile/eas.json` includes internal APK and production AAB profiles. After configuring your Expo account/project and production API, run `npx eas-cli build --platform android --profile preview` from `apps/mobile`. No signed APK has been produced in this workspace.

## Before launch

Select precise editions, clear licenses, complete scholarly review, connect Postgres/auth/audits, add hybrid retrieval and entailment verification, and pass the plan's 250-case benchmark. Then integrate verified voice. Edition comparison, Hindi/Telugu UI, offline packs, and full-duplex voice remain future work.

## Corpus scope

All 18 Mahapuranas are listed in the library as planned, with no ingested passages. See [corpus register](docs/corpus-register.md), [validation record](docs/verification.md), and [original architecture plan](docs/architecture-plan.pdf).
