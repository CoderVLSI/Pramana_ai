# Bhagavad Gita pilot (open sources)

Goal: publish one real work end to end so retrieval can be tested with real data. This route uses public-domain sources, not Gita Press, because Gita Press permission is unconfirmed. Nothing here contains scripture text: the text must come from files you name and hash.

## What is built and tested
- `packages/corpus-schema/public-domain.ts`: strict validator for open-source releases (rights basis, licence, source file hashes, two reviewers, coverage confirmation). Gita Press bundles still use the original validator.
- `services/ingest/build-public-domain-bundle.ts`: turns `verses.jsonl` + `provenance.json` into a bundle. It refuses gaps, duplicates and counts that differ from the edition's declared per-chapter counts.
- `supabase/migrations/202610140001_open_source_releases.sql`: lets the database accept open-source releases beside Gita Press, with the same strictness. **Not applied yet.** Tested on a throwaway local PostgreSQL 16 (`python3 scripts/test-open-source-sql.py`); Supabase runs 17.
- Tests: `eval/public-domain-bundle.test.ts` uses labelled synthetic placeholders only.

## What a person must supply
1. **A Sanskrit Gita text with a clear licence** and a public-domain English translation (candidates: Arnold 1885 on Project Gutenberg #2388; Telang 1882, Sacred Books of the East vol. 8). The ancient text is free, but a specific digital file can carry its own terms: record the file's licence statement in `public_domain_basis`. Do not use Gita Press, Sivananda, Chinmaya, ISKCON or other modern translations.
2. **`verses.jsonl`**, one line per verse, copied or extracted from those files: `{"chapter":2,"verse":"47","original":"…","translation":"…"}`. Use `"4-5"` for a verse range.
3. **`provenance.json`** from `provenance.template.json`: the `sha256` of each downloaded file (`sha256sum file`), URLs, retrieval dates, and **this edition's verse count for each of the 18 chapters** (editions differ, for example 700 vs 701).
4. **Two named reviewers** who compare a sample against the source and set `rights_approved` and `complete_coverage_confirmed` to true.

## Steps
```sh
npx tsx services/ingest/build-public-domain-bundle.ts --verses verses.jsonl --provenance provenance.json --out gita-bundle.json
npx tsx services/ingest/publish-scripture.ts gita-bundle.json            # check only
```
Then, on a **test** Supabase project first: apply both migrations, run the publish command with `--publish`, and run `npx tsx scripts/check-scripture-backend.ts "karma" bhagavad-gita`. Only after that repeat on the live project. The service-role key stays in a local environment variable and never goes in chat, the app or a public setting.

## Still open
- Applying the new migration to the live project (Codex has Supabase access; review the SQL first).
- Turning the app flag on (`EXPO_PUBLIC_SCRIPTURE_BACKEND_ENABLED=true` in the APK build) only after a real release is published and retrieval is tested.
- The e-text reference shown in the app uses a running verse number in place of a printed page; adjust the label if desired.
