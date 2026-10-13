# Scripture backend — integration with Claude's app branch

This branch starts from `548e9a0` on `ccr-7ce880be-h31dra`. It changes retrieval adapters and Library data access; it does not replace the voice implementation or app UI. Merge through a PR rather than overwriting either branch. No new npm dependencies are required.

## What actually exists

The private archive inventory contains 31 scan assets / 35,445 scan pages. The new unified private index contains 33,635 searchable pages; 1,810 pages failed the script-quality filter. These are OCR review materials, not 33,635 approved verses or complete editions. It preserves source/volume IDs, repair precedence, exact OCR hashes and null printed-page/verse mappings. Narada/Garuda OCR and incomplete or abridged editions remain source work. Four Vedas and most of the 108 Upanishads still lack established Gita Press coverage.

The public reviewed corpus remains **zero passages**. The Supabase migration, publisher and app client are ready to serve genuine reviewed bundles, but no rights/editorial approval or publisher identity has been invented. No private OCR or test-only fixtures have been uploaded or bundled.

## Deploy on the existing free Supabase project

1. Open Pramana's SQL editor: https://supabase.com/dashboard/project/fdntjeknihekiqldyrpn/sql/new
2. Run `supabase/migrations/202610130001_scripture_retrieval.sql`. The migration creates source releases, indexed passages, RLS policies and RPCs. It does not change user accounts/settings or create paid resources.
3. Check `select public.scripture_catalog();`. An empty list / count zero is expected until a real reviewed release is published. Check that the Data API exposes the public schema. The app's public key can read released scripture but cannot ingest, publish or modify it.
4. Prepare a real Gita Press bundle using the existing schema and source-review workflow. Original text and translated text have separate usage/audio records. The importer checks coverage and source metadata before making network requests.
5. On a trusted backend terminal, supply `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` through a local environment or secret manager. Never send the service-role key in chat, add it to a public environment variable or put it in the app. Run:

```sh
npx tsx services/ingest/publish-scripture.ts reviewed-bundle.json
npx tsx services/ingest/publish-scripture.ts reviewed-bundle.json --publish
```

The first command is validation only. The second stages 100 passages per request and publishes atomically after a count/scope check. Failed staging remains invisible to public app users. An unpublished import resumes by rerunning the same file; the manifest must match exactly and repeated passage batches are idempotent. Published releases are immutable; use a new release identifier for subsequent corrections. Nothing deletes an existing published release automatically.

6. Run the public connectivity script below and confirm a real citation search. Then build the app with `EXPO_PUBLIC_SCRIPTURE_BACKEND_ENABLED=true`. This is intentionally off until deployment/source intake is complete, so an unavailable database cannot slow the working voice app.

```sh
npx tsx scripts/check-scripture-backend.ts
```

The free project is appropriate for an initial reviewed collection; monitor actual table/index size and current Supabase quotas before committing to a complete corpus. No paid resource or embedding API is used. Private 264 MB SQLite review data stays local; the bulk archive scans are not uploaded to Supabase.

## App contract

`retrieveScripture(query, selection)` searches installed sources first, then the reviewed Supabase corpus on a miss, then the existing caller can perform web fallback. Local-only filters avoid the cloud call. Backend unavailability is explicitly reported in caveats and negatively cached for 60 seconds; it is not represented as proof of scripture absence.

Study, fact-check and ordinary voice turns share this retrieval callback. The Live `search_scripture` tool uses it as well. Library counts, passage browsing and the source reader can read released cloud sources. Exact IDs, chapter/verse hierarchy, volume, scan/printed page, source hashes, release and edition filters survive the round trip. Response text is hash-checked before it becomes citation evidence. Audio is allowed only when the returned source record allows it. Generated Live narration retains the app's generated-output label.

Supabase RPCs: `scripture_catalog()`, `search_scripture(search_query, selected_works, selected_editions, selected_language, exact_locator, result_limit)`, `scripture_page(page_offset,page_limit)`, `scripture_record(passage_id)`. `publish_scripture_release(release_id)` is service-role only. The search uses PostgreSQL full-text indexes, explicit English/Hindi aliases and hierarchical reference lookup; it is not multilingual semantic retrieval.

## Private source work

```sh
python3 services/ingest/build_review_index.py --root /path/to/ignored/private --output /path/to/ignored/private/unified-review.sqlite
python3 services/ingest/build_review_index.py --root /path/to/ignored/private --output /path/to/ignored/private/unified-review.sqlite --query 'भक्ति'
python3 services/ingest/search_drafts.py --source SOURCE_ID --page SCAN_ORDINAL
```

Review search is private preparation, not a public answer endpoint. The app receives a source only after source/edition verification, OCR comparison, printed-page and verse mapping, and applicable usage records are completed. The source ledger must distinguish abridged/partial editions; downloading a scan does not establish full-work coverage.

## Checks and their limits

Real PostgreSQL 17 tests exercise the migration, anonymous write/publish denial, unpublished-source isolation, publication counts, Hindi FTS, work/language scopes and hierarchical references. JavaScript tests cover returned text hashes, scopes, audio restrictions, staging failure and unavailable-versus-empty responses. Python tests cover combining characters, repaired-page precedence, source scoping, exclusions and preservation of the old index after a failed rebuild.

Seven real private-index queries were measured five times each: median retrieval 5.19–12.84 ms, worst 42.32 ms on this workspace. This measures lexical retrieval from the local 33,635-page index, not phone/network latency or AI generation.

Live Supabase deployment, actual reviewed-source publication and phone retrieval still need verification. Tests use labeled synthetic fixtures only; they are not corpus content.
