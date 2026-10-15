# Gita pilot publication — 2026-10-15

Published `gita-open-1` to LIVE after the isolated local TEST passed. LIVE project: `fdntjeknihekiqldyrpn`. Release ID: `release_0f6413e8f45e2dbb6bc17add00b8f797`.

The app flag remains OFF. No PR was opened. This is Sanskrit only, AI transcription and AI cross-check with owner acceptance, **without human verse-by-verse review**. The two attestations describe those roles; the existing API `review_status: approved` denotes release acceptance, not human textual review. All records explicitly carry `human_verse_review: false` and a review notice. Audio permission was not granted; `safe_to_speak` is false.

## Commands and results

1. Generated external `verses.jsonl` from the transcription, preserving each text field unchanged: 700 lines, chapter counts 47,72,43,42,29,47,30,28,34,42,55,20,34,27,20,24,28,78. Confidence metadata: 684 high, 16 medium.
2. Downloaded the original archive.org `_djvu.xml`. SHA-256 `9fea0499eea11026a9f38464e1c4ff6f3ba5c8b3622ee8168ff1e53d133ab2d2` matches the owner's hash.
3. Built with `npx tsx services/ingest/build-public-domain-bundle.ts --verses <external verses.jsonl> --provenance services/ingest/releases/gita-open-1.provenance.json --out services/ingest/releases/gita-open-1.bundle.json`. Validated with `npx tsx services/ingest/publish-scripture.ts services/ingest/releases/gita-open-1.bundle.json`: 700 passages.
4. Ran `python3 scripts/gita-pilot-local-test.py --state /workspace/scratch/gita-pilot-test`. Applied baseline and open-source migrations, repeated the latter for idempotency, then ran the publisher with `--publish` using ephemeral TEST credentials. Preserved an unrelated CHECK constraint; malformed and JSON-null manifests were rejected; anonymous writes/publication were denied.
5. Only after TEST passed, applied the same open-source migration through authenticated Supabase MCP to LIVE. Prepared the exact bundle using `scripts/prepare-gita-pilot-mcp-publish.ts`, staged 14 batches of 50, and called the same publication RPC. No LIVE service-role key was retrieved, printed, committed or placed in app code.
6. Ran `scripts/verify-gita-pilot-release.ts` against both public HTTP APIs. Machine results: [release-verification-2026-10-15.json](release-verification-2026-10-15.json).
7. `npm test`: 100 passed, 0 failed. `npm run typecheck`: passed.

| Check | TEST | LIVE |
| --- | --- | --- |
| scripture_catalog / pilot count | 700 | 700 |
| search_scripture कर्मण्येवाधिकारस्ते | 1 hit, 2.47 | 1 hit, 2.47 |
| search_scripture 2.47 | 1 hit | 1 hit |
| scripture_page | all 700, pages of 50 | all 700, pages of 50 |
| scripture_record 2.47 | scan page 93, context 5 | scan page 93, context 5 |
| original / quotation hashes | 700 / 700 valid | 700 / 700 valid |
| source locators | all 700 matched | all 700 matched |
| altered text | rejected by client | rejected by client |

2.47 passage ID: `pd_9b807fa534f78bcfc5c909bccca6`. Printed page remains NULL because it is not mapped; scan index 92 is displayed as one-based scan page 93. No printed page was invented. Roman transliteration search was not added.

## Migration findings and changes

The supplied migration dropped every CHECK constraint on scripture_releases, including unrelated checks. It now removes only the known legacy publisher/location checks and its own named checks. New checks reject SQL/JSON NULL via fail-closed expressions; array validation guards against wrong JSON types. Both environments enforce RLS. LIVE checks confirmed anonymous INSERT, UPDATE and publication privileges are false and RLS is enabled on both scripture tables.

The existing LIVE security advisors also flag the unrelated, pre-existing `public.rls_auto_enable()` security-definer event function as executable by anon/authenticated. This task did not change that function. References: [anon advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Recovered failures and method changes

The full local Supabase CLI stack failed to extract because of disk space. With owner authorization for local TEST, used an isolated PostgreSQL 17 plus official Supabase PostgREST 16.4 core stack and a locally trusted HTTPS gateway. This tested the database, actual Data API, RLS, publication and TypeScript client; it did not test hosted infrastructure or Supabase Auth/Storage. No paid TEST project was created. Ephemeral TEST service-role credentials stayed outside Git.

The first TEST run exposed a real reader bug: `record()` allowed only gp_ IDs although public-domain passages use pd_. Fixed the identifier validation and added a regression test; reran TEST successfully before LIVE. Source locators now honestly support scan-only records, and the bundle builder preserves input text exactly. Owner-approved AI-only review metadata is propagated into API records and answer caveats.

## Remaining work

The owner must explicitly approve enabling the app backend flag after retrieval-code review; it remains off. No APK was built or phone behavior verified in this publication task. Human text review, including medium-confidence verses, remains future quality work. Title-page contributors other than Apte remain unconfirmed, as recorded in the owner-accepted provenance. This release has no translation or audio permission.
