# Indike Pramāṇa: website and API handoff for Claude

Checked: **2026-10-28 (Asia/Kolkata)**. This document is a self-contained technical briefing for an agent that cannot reach the website. It is not a scripture dataset, release approval or blanket licensing clearance.

## 1. What this service is

- Website: <https://indike.org/pramana/>
- This is **Indike's external library named Pramāṇa**, not proof of any connection to our `codervlsi/pramana_ai` repository or Supabase project.
- It aggregates Indic original-language texts, recensions, translations, commentaries, archaeological material and secondary studies. Catalogue records can exist without readable text.
- The owner asked whether its data could be downloaded into our app. No bulk download or app integration has been performed by this handoff task.

Snapshot reported by the site's About page and public stats API:

| Metric | Reported count |
| --- | ---: |
| Catalogued works (`texts`) | 218,020 |
| Works with text (`texts_available`) | 52,119 |
| Passages (`segments`) | 18,071,704 |
| Words (`words`) | 576,705,097 |
| Human translations | 29,292 |
| Machine translations | 23,122 |
| Commentaries | 23,647 |
| Recensions | 11,736 |
| Languages | 93 |

The stats response separately reports `documents_with_content: 114755`; do not equate that field with works-with-text. Counts are source claims, not independently audited inventory. Its `built` value was `2026-10-27T00:49:52` without a timezone. Earlier conversation counts are stale. The word total is not a download-size estimate.

## 2. Verified entry points

| Purpose | URL | Observation |
| --- | --- | --- |
| Home | https://indike.org/pramana/ | Read successfully |
| About | https://indike.org/pramana/about | Read successfully; source overview and citation guidance |
| About as Markdown | https://indike.org/pramana/about?format=md | Direct HTTPS request succeeded |
| Agent discovery | https://indike.org/pramana/llms.txt | Direct HTTPS request succeeded; Markdown content type confused the web reader |
| Short API overview | https://indike.org/pramana/about/api | Read successfully but not the full endpoint documentation |
| Swagger UI | https://indike.org/pramana/api/docs | Direct request succeeded; HTML points to the OpenAPI URL below |
| OpenAPI specification | https://indike.org/pramana/api/openapi.json | Direct request succeeded; API version 1.0 |
| Stats | https://indike.org/pramana/api/stats | JSON returned without a supplied API key |
| Passage response | https://indike.org/pramana/api/page/in.veda.samhita.rg.1.1.1 | JSON returned without a supplied API key |
| Citation response | https://indike.org/pramana/api/cite/in.veda.samhita.rg.1.1.1 | JSON returned without a supplied API key |

The OpenAPI server prefix is `/pramana`; endpoint paths below already begin `/api/`. Therefore a full URL is `https://indike.org/pramana` + `/api/...`.

Do **not** substitute `/pramana/openapi.json` or assume `/pramana/api` is the documentation page. Those are not the verified routes.

## 3. Stable paths and content identity

The site's discovery document describes these identifiers:

| Path | Meaning |
| --- | --- |
| `in.veda.samhita.rg` | Rigveda work |
| `in.veda.samhita.rg.1.1.1` | Rigveda passage locator 1.1.1 |
| `in.veda.samhita.rg!sayana` | Commentary identifier example |
| `in.veda.samhita.rg~en-griffith` | English translation identifier example |

The discovery document also associates `*` with a recension; the exact complete grammar was not established. Discover actual identifiers from returned metadata rather than synthesizing suffixes. The commentary/translation examples were documented by the site, not individually fetched in this check.

Human-readable passage URL: `https://indike.org/pramana/in.veda.samhita.rg.1.1.1`.

The site documents `?format=md` for human-readable pages; this was tested on About, not every passage/category. For software integrations use the JSON API, not scraped presentation HTML.

Our app's existing work IDs are different. Build an explicit mapping; never treat an external path as an existing internal edition ID or merge multiple recensions into one work's verse numbering.

## 4. Useful API operations

These methods and parameters come from the fetched OpenAPI specification. Only operations explicitly marked tested below have live-response evidence.

### GET `/api/page/{path}` — tested

Parameters: `path` required; `offset` defaults to 0; optional `script`, `show`, `lang`, `v`.

The response varies by path type: a category, work overview, section or passage. The sampled passage returned these top-level fields:

```text
path, canonical, doc, loc, breadcrumbs, claims, content_doc,
versions, content_versions, subtexts, provenance, titles,
discussed, relations, about, segment, nav, section_claims,
type, aligned, edits, models, consensus, linked, head
```

Observed `type` was `verse`; `loc` was `1.1.1`. Important nested structures:

- `doc`: identity, title, language, script, status, locator scheme, segment/word totals and date fields.
- `segment`: ID, locator, hierarchy information, text, status and word/date fields. Scripture text is intentionally omitted from this handoff.
- `provenance`: an **array**, not a single source string.
- `versions`: `recension`, `commentary`, `translation` groups.
- `nav`: `prev`, `next`.

The specification says leaving `show` unspecified sends all linked texts; `show=-` requests none. Prefer bounded responses. `script` controls display, including Indic texts stored in romanisation; do not assume a rendered Devanagari string is the original encoding. These optional parameter behaviours were documented, not individually tested here.

### GET `/api/cite/{path}` — tested

Optional `accessed` parameter. The sampled response contained:

```text
chicago, mla, bibtex, ris, csl, fields
```

`fields` included the document path, title, language, edition, editor, digital source, URL and access date. This is useful citation metadata, **not independent verification or a redistribution permission grant**.

### GET `/api/search` — small live probe passed

Required `q`; optional `scope`, `lang`, `kind`, `from`, `to`, `script`, `root`, `part`.

Pagination: `limit` default **10**, maximum **100**; `offset` default **0**.

Other documented options: `titles=true`, `xlang=true`, `variants=true`, `forms=true`, `apart=false` by default. Do not infer the precise search grammar from these names alone. `/api/search/parse` and `/api/search/options` are also described in the schema. A title query for `Rigveda` with `limit=1` returned HTTP 200 JSON; this does not validate every search option or the relevance of the full corpus.

### GET `/api/export` — one-row live probe passed

The description explicitly identifies **keyset pagination by segment ID**.

| Query parameter | Default / allowed values |
| --- | --- |
| `path` | `in` |
| `lang` | optional |
| `fmt` | `ndjson` default; `ndjson`, `csv`, `txt` |
| `after_id` | 0 |
| `limit` | 50,000 default, 500,000 maximum |
| `include_translations` | false |
| `include_mt` | false |

Do not request those large defaults while exploring. Start with one explicitly selected eligible work and a very small limit. A one-row Rigveda-prefix probe returned HTTP 200 with `application/x-ndjson`. Its row keys were `id`, `path`, `loc`, `lang`, `date_s`, `date_e`, `nwords`, `text`. That observed row had no provenance/licence field: fetch and retain source metadata separately. Resume with the returned `id` as `after_id` as documented, but verify page boundaries and deduplication before scaling. Translation inclusion and multi-page resume behaviour were not tested. The sampled row text is not reproduced here or imported into our app.

### Other documented research operations — not executed

- GET `/api/schema`: database schema discovery.
- POST `/api/sql`: advertised read-only SQL; JSON body contains `sql`.
- GET/POST `/api/query`: analytical/corpus queries, not the same as text search.

OpenAPI also lists write/admin/user operations. Their presence does not establish authorization, and global OpenAPI security declarations are not a permission grant. This handoff used public read requests only. Do not call admin/write routes for this task, and do not expose an arbitrary SQL interface directly to app users.

## 5. Critical provenance and licensing findings

### No blanket "download everything" clearance

The pages inspected describe an open/free-to-read library. They did **not** establish a single redistribution licence covering the entire corpus, source-code repository, downloadable database dump, total compressed size, service-level guarantee or rate-limit policy. Those remain **UNVERIFIED**, not absent by proof.

The site's `llms.txt` explicitly identifies inputs including **GRETIL, SARIT, DCS, SuttaCentral, CBETA, 84000, Wikisource and Internet Archive OCR**, with item-level edition/licence attribution. The About page links its Sources section back to `about#sources`; the fetched About text did not expose a comprehensive per-dataset licence matrix.

### Actual sampled passage metadata

For `in.veda.samhita.rg.1.1.1`, citation fields identify the Śākala recension, editor Theodor Aufrecht, and GRETIL digital text. The provenance array contained:

| Source | Observed licence string / scope |
| --- | --- |
| `gretil` | Creative Commons **Attribution–NonCommercial–ShareAlike 4.0 International**; digital edition and contributors listed |
| `vedicreserve` | “free for study” collection notice; no blanket redistribution permission established by that wording |

The GRETIL record named separate data-entry, conversion/revision and normalization contributors. Its printed edition field named Aufrecht's Rigveda volumes, while the citation's `year` was null. This is evidence that an ancient work, printed edition, digital transcription and display rendition are different provenance layers. Do not fill a missing printed year from memory.

`provenance` records in this sample included:

```text
 doc_id, repo, url, file, license, retrieved,
 edition, contributors, notes
```

`retrieved` was null in the sampled GRETIL record. Record our own actual retrieval time and hashes if a future eligible dataset is acquired.

**Our existing owner instructions still apply:** Gita Press, GRETIL, Sanskrit Documents and Wikisource are excluded as scripture-text sources; pre-1931 printed archive.org editions are the allowed source route. Accessing GRETIL/Wikisource through Indike does not change that origin. The sampled Rigveda item is therefore **ineligible under current project policy**, regardless of whether some licence uses are otherwise allowed. The owner has not authorized a blanket source-policy change by sharing this link.

CC BY-NC-SA also imposes conditions; it is not equivalent to public domain or unrestricted commercial redistribution. “Free for study” is not enough to assume app bundling rights. This briefing records the notices; it does not claim a completed legal assessment of every item.

## 6. What Claude should do next

1. Treat this site initially as a **discovery/metadata source**. Do not mark its contents as our reviewed scripture collection.
2. If proposing an import, inventory candidate work/edition/source/licence combinations first, including all upstream digital contributors. Separate readable texts from catalogue-only, partial and lost records.
3. Under current source rules, select only content that can actually be traced and checked against an eligible pre-1931 archive.org printing. An Indike label alone is insufficient.
4. Keep original Sanskrit, named human translations, machine translations, commentaries and recensions separate. Never silently substitute machine translation or classify all external text as human reviewed.
5. Preserve the external stable path, internal work/edition ID, locator, citation, upstream URL, licence, retrieval time and content hash. Detect overlapping/misaligned locators rather than merging by title.
6. For any approved offline delivery, prefer separately downloadable, versioned packs with sizes/checksums and deletion controls. Measure an actual eligible export before estimating storage. Do not put the entire library into the APK based on word counts.
7. If the service becomes reachable, use small requests with timeouts/retry backoff, verify pagination and ask the maintainer about bulk access terms. The maximum documented `limit` is not a suggested crawl rate.

No app, ingestion pipeline, workflow, secret, Supabase release or backend flag was changed by this handoff. Do not assume the earlier Wilson repair or Upanishad republishing was completed; that work was previously reported unfinished.

## 7. Connectivity notes and reproducible checks

The web-reading tool sometimes timed out or rejected `text/markdown` even though direct HTTPS fetching succeeded. This was a **tool/path-specific observation**, not proof that Claude's environment can reach the host or that a network block should be bypassed. Inspect its actual error and permitted network settings.

Useful public checks, requiring no secret in the tests performed here:

```bash
curl --fail --location --max-time 30 \
  'https://indike.org/pramana/llms.txt' -o indike-llms.md

curl --fail --location --max-time 30 \
  'https://indike.org/pramana/api/openapi.json' -o indike-openapi.json

curl --fail --location --max-time 30 \
  'https://indike.org/pramana/api/stats' -o indike-stats.json

curl --fail --location --max-time 30 \
  'https://indike.org/pramana/api/cite/in.veda.samhita.rg.1.1.1' \
  -o indike-citation.json
```

These are small discovery/citation checks, not a bulk scripture importer. No key is needed for the tested public GETs; that does not prove all routes are unauthenticated.

## 8. Verification boundary

Confirmed by direct responses on 2026-10-28: About Markdown, `llms.txt`, Swagger HTML, exact OpenAPI route, stats, one passage-response structure and one citation-response structure. Endpoint names/defaults above were extracted from that OpenAPI document.

Not established: corpus-wide textual accuracy, complete work inventory, global redistribution rights, all translator death dates, source-code licence/repository, database-dump access, download size, CORS/mobile reliability, export pagination correctness at scale, service rate limits, or production suitability. The small search/export probe results below qualify their operational status. No external scripture passages are reproduced in this file.

### Small probe results

| Probe | Result | Boundary |
| --- | --- | --- |
| `GET /api/search?q=Rigveda&limit=1&titles=true` | HTTP 200, JSON | Search shape verified; no broad relevance audit |
| `GET /api/export?path=in.veda.samhita.rg&limit=1&fmt=ndjson` | HTTP 200, NDJSON, one row | Export available; no bulk request or import; source excluded under current policy |

Search response keys observed: `q`, `folds`, `ref`, `meaning`, `titles`, `mode`, `works`, `groups`, `results`, `total`, `capped`, `facets`, `expansions`, `needles`, `ms`, `word`, `within`. These describe one response, not a promise that every field is always populated.

Fetched OpenAPI byte-stream SHA-256: `f18a2dc9d753169994abbba5791a338d71b7d38490d67ded72f3e32449718722`. This fingerprints the checked schema, not the corpus.
