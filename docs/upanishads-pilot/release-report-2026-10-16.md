# Eleven principal Upanishads publication — 2026-10-16

Published eleven separate open-source pilot releases to LIVE `fdntjeknihekiqldyrpn` **only after all checks passed in isolated local TEST**. Both endpoints contain 1,572 Upanishad units alongside the 700-verse Gita release (2,272 passages total). App flag/configuration unchanged. No PR and no APK build.

## Approval, provenance and coverage

The project owner accepted the 1906 Nirnaya Sagar edition rights basis in the publication task on 2026-10-16, including the reported editor dates 1863–1931 from a single Google AI overview. A second authority source for those dates is still wanted; other title-page contributors are unconfirmed. Provenance records this uncertainty rather than claiming independent confirmation. No human verse-by-verse review occurred. The exact owner-approval and Claude-AI transcription/merge-check attestations requested by the owner appear in each release. The existing API `review_status: approved` marker means owner release acceptance; it does not mean human textual review.

Original archive item: https://archive.org/details/twentyeightupan00upangoog. Downloaded `twentyeightupan00upangoog_djvu.xml` on 2026-10-16. SHA-256 **`f71a2a102086055bced71e6570ccd97a628eb17972c8a42426da199ec298ed95`**, matching the supplied hash. Download and generated JSONL files remain outside Git. Each committed provenance file records the source URL, source hash, retrieval date, transcription-file hash and owner approval. No translation source was added.

The supplied JSON contains 1,602 entries; the preparation tool excludes 30 unnumbered entries (including peace invocations), yielding exactly the requested 1,572 numbered units. Completeness refers to those numbered units, not inclusion of every invocation/unnumbered paragraph. Every published original matches the corresponding input text field unchanged. Preparation was adjusted to avoid normalization/trimming even though none of the supplied entries would have changed. Printed pages use the supplied scan-index-minus-14 mapping; API scan pages are one-based.

## Per-work results

Every row below passed **both TEST and LIVE**: catalog count, Devanagari word search, exact locator search, scripture_page, scripture_record/context, original and quotation hash verification, tampered-original/quotation rejection, exact prepared-record equality, all source locators, `print_year: 1906`, and `human_verse_review: false`. All numerical reference searches returned exactly one hit.

| Work / release | Units | TEST / LIVE | Release ID | Devanagari query (hits) | Locator | Context units |
| --- | ---: | --- | --- | --- | --- | ---: |
| isha-upanishad / `isha-open-1` | 18 | PASS / PASS | `release_c7f4fd533f6279ec33c527aac35bed7a` | ईशावास्यमिदꣳ (1) | `1.1` | 5 |
| kena-upanishad / `kena-open-1` | 34 | PASS / PASS | `release_914a07b07fbdd4e3e87c1057f5e400da` | केनेषितं (1) | `1.1` | 5 |
| katha-upanishad / `katha-open-1` | 118 | PASS / PASS | `release_3966ce4a0a946bd6f38c2075c3e0dcf9` | अणोरणीयान्महतो (1) | `1.2.20` | 5 |
| prashna-upanishad / `prashna-open-1` | 67 | PASS / PASS | `release_d41783bb9cce58fda0f2906761ca943e` | सुकेशा (2) | `1.1` | 5 |
| mundaka-upanishad / `mundaka-open-1` | 64 | PASS / PASS | `release_10ca35aa8cdb2192bb7e8b28f8b9466c` | ब्रह्मा (1) | `1.1.1` | 5 |
| mandukya-upanishad / `mandukya-open-1` | 12 | PASS / PASS | `release_9b3b27239afc69530a392f09f4a8d106` | ओमित्येतदक्षरमिद५ (1) | `1.1` | 5 |
| taittiriya-upanishad / `taittiriya-open-1` | 47 | PASS / PASS | `release_bee00394ff111dd7557b94e1be01f2ff` | मित्रः (2) | `1.1.1` | 1 |
| aitareya-upanishad / `aitareya-open-1` | 33 | PASS / PASS | `release_03fec32e215137c560531b04a6d3dd55` | एवाग्र (1) | `1.1.1` | 4 |
| chandogya-upanishad / `chandogya-open-1` | 631 | PASS / PASS | `release_e7e4e5ec78a894e21e42e1d53dee43da` | ओमित्येतदक्षरमुद्गीथमुपासीतोमिति (2) | `1.1.1` | 5 |
| brihadaranyaka-upanishad / `brihadaranyaka-open-1` | 435 | PASS / PASS | `release_0f290ab78d1b1908f797c23c911408d0` | अश्वस्य (1) | `1.1.1` | 2 |
| shvetashvatara-upanishad / `shvetashvatara-open-1` | 113 | PASS / PASS | `release_9d310f25d2c90870b9e3d61a44eb09f4` | ब्रह्मवादिनो (2) | `1.1` | 5 |

Machine outputs: [TEST verification](test-verification-2026-10-16.json), [LIVE verification](live-verification-2026-10-16.json). Both paginated all 2,272 records in batches of 50; all 1,572 Upanishad original/quotation hashes and scan locators were verified. The existing 700 Gita originals remained unchanged and their remote hashes remained valid. Katha `1.2.20` resolves to `pd_62cd0f49b9f59b7f02f2d7c393b5`.

## What ran

1. Pulled `ccr-7ce880be-h31dra` with `git pull --ff-only`; read the pilot README and source preparation code.
2. Downloaded and hashed the original XML. Ran `npx tsx services/ingest/prepare-upanishad-releases.ts --in docs/upanishads-pilot/upanishads-1906-nirnaya-sagar-ai-transcription.json --out-dir /workspace/scratch/upanishads-pilot/prepared --sha256 f71a2a102086055bced71e6570ccd97a628eb17972c8a42426da199ec298ed95`.
3. Filled each provenance with owner-approved rights fields and today’s review/retrieval date, retaining the generated AI-only method/notice and false human-review flag. For each work ran the builder with its JSONL/provenance, then `npx tsx services/ingest/publish-scripture.ts services/ingest/releases/<work>-open-1.bundle.json` without `--publish`: all eleven validated. Bundles and provenance were committed before LIVE publication.
4. Ran `python3 scripts/gita-pilot-local-test.py --state /workspace/scratch/upanishads-pilot-test --bundle-list /workspace/scratch/upanishads-pilot/test-bundles.json --verify-script scripts/verify-upanishad-releases.ts`. This created a fresh isolated PostgreSQL 17 + official Supabase PostgREST 16.4 TEST core, applied baseline/open-source migrations (the open-source migration twice), published the Gita baseline and eleven Upanishads using the actual CLI `--publish` path with ephemeral local service-role credentials, then ran the verifier and access checks. This uses the previously approved local TEST method; no hosted/paid TEST project was created. Auth/Storage and hosted infrastructure were not exercised. After successful verification, the ephemeral TEST containers/gateway were removed and generated credential files/private TLS key deleted; the committed TEST evidence remains.
5. TEST also confirmed an unrelated constraint survives, invalid/JSON-null manifests are rejected, and anonymous writes/publication are denied.
6. Prepared LIVE source-data SQL using `npx tsx scripts/prepare-upanishad-mcp-publish.ts /workspace/scratch/upanishads-pilot/live-sql`. The adapter uses the exact same `prepareRelease` records as TEST/HTTP publication. Authenticated Supabase MCP staged eleven unpublished manifests and 37 bounded passage batches. Confirmed all expected counts and flags, and confirmed the public catalog still exposed only the existing 700 Gita records while staged. Published all eleven in one transaction through `publish_scripture_release`. No LIVE schema change was required: existing retrieval/open-source migrations were already applied.
7. Ran `NODE_USE_ENV_PROXY=1 NODE_USE_SYSTEM_CA=1 npx tsx scripts/verify-upanishad-releases.ts --out /workspace/scratch/upanishads-pilot/live-verification.json` against the actual public HTTPS API and production TypeScript client. All checks passed.
8. `npm test`: 107 passed, 0 failed. `npm run typecheck`: passed. `git diff --check`: passed. No service-role key was printed or committed; LIVE used the authenticated connector rather than a copied secret key.

## Changes, recovered failures and oddities

- Added `print_year` propagation from the validated source edition to API passage JSON, plus the optional typed field and validation. Every new passage contains 1906; no database column/migration was needed. Existing Gita records were not rewritten.
- The first local TEST startup hit the PostgreSQL image’s temporary initialization server: a Unix-socket readiness probe succeeded just before that server shut down. Changed the probe/SQL connection to loopback TCP, which becomes available with the final server. Fresh TEST startup then passed.
- The first search verifier selected an incomplete Mandukya word by stopping before the literal printed digit `५`. PostgreSQL correctly indexed the whole token `ओमित्येतदक्षरमिद५`. Fixed test-word extraction to retain digits, left scripture unchanged, and reran the complete clean TEST successfully before LIVE.
- The orchestration filename guard initially rejected generated names containing `open-1`; corrected the guard before any passage batch ran. No SQL/data change was needed.
- Taittiriya maps 16 single-unit sections to sequential unit number 1: valli 2/anuvaka 2–9 and valli 3/anuvaka 2–9. The original input section numbers and text remain available in the tracked transcription; this follows the supplied preparer rather than asserting cross-edition numbering equivalence.
- The original README confidence totals were stale. Actual JSON: 1,267 high / 334 medium / 1 low across all 1,602 entries; released numbered units: 1,246 high / 325 medium / 1 low. Updated README.
- The low-confidence unit is Brihadaranyaka `4.6.3` (input scan index 233), a difficult proper-name list. Its note says the print appears to jump from number 2 to 4; the source transcriber numbered it 3 by sequence. No text or numbering was silently corrected during publication.
- The pre-existing LIVE advisor warnings about `public.rls_auto_enable()` remaining executable as a security-definer function by anon/authenticated are unchanged. This publication did not modify that function. Remediation: [anonymous executable function](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated executable function](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Scripture table RLS remains enabled, and anonymous insertion, passage update and publication privileges are false.

Human text review and second-source confirmation of the editor dates remain quality/provenance follow-up work. No human reviewer names, human-review claims, modern translation or new app flag settings were introduced.
