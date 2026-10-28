# Indike Pramāṇa — integration plan for scripture search and optional offline packs

Status: **plan only** (2026-10-28). Nothing was downloaded, imported, published or changed: no app code, backend flag, workflow, secret or Supabase release. No keys were used or printed. This plan contains no scripture text.

**How facts are labelled.** `[H]` = stated in `docs/research/indike-pramana-handoff.md` (checked by another agent on 2026-10-28); I could not re-verify it because indike.org is blocked from my environment (the egress proxy returns 403 for the host, which I did not try to bypass). `[R]` = measured by me in this repository. `[P]` = our project policy (owner instructions). `[A]` = my arithmetic or assumption, unmeasured. `[?]` = unresolved.

## 1. Bottom line

1. Under **current owner policy**, almost nothing on Indike can be imported as scripture text. Policy `[P]`: the only text route is a pre-1931 printed edition on archive.org, with page-level provenance, a public-domain basis, the owner's rights approval, and the label "AI-transcribed, not yet human-reviewed" until humans review. GRETIL, Sanskrit Documents, Wikisource, Gita Press and any modern edition are excluded as text sources, and Indike aggregates several of them `[H]`.
2. Indike is still useful in three **non-text** ways, in this order of safety: (A) a research/discovery tool for our team, (B) outbound "find this work on Indike" links, (C) optionally a metadata-only external results panel. None of these puts external text into our reviewed-scripture collection.
3. **Optional offline packs should be built from our own approved releases**, not from Indike. Our measured sizes are tiny (section 6), so offline delivery does not depend on Indike at all.
4. Nothing should be built until the owner answers the decisions in section 9 and the maintainers answer the licence questions in section 5.

## 2. Verified facts vs unresolved questions

| Topic | Verified (with source) | Unresolved |
| --- | --- | --- |
| What it is | An external Indic-texts library named Pramāṇa, run by Indike `[H]`. No established connection to our repo or Supabase project `[H]`. | Who maintains it, governance, continuity. |
| Scale | API stats (built 2026-10-27, no timezone): 218,020 works; 52,119 with text; 18,071,704 passages; 576,705,097 words; 29,292 human and 23,122 machine translations; 23,647 commentaries; 11,736 recensions; 93 languages `[H]`. | **The home page the owner screenshotted on 2026-10-28 shows different, rounder figures** (107k texts, 48k readable, 442M words, 14M passages, 93 languages): a cached page, an older build or a different counting rule. `[H]` also warns `documents_with_content` is 114,755 and is not "works with text". Treat all counts as unaudited. |
| API | OpenAPI 1.0; server prefix `/pramana`; routes `/api/page/{path}`, `/api/cite/{path}`, `/api/search`, `/api/export`, plus schema, SQL and query routes `[H]`. Public GETs on stats, page and cite returned JSON with no key `[H]`. OpenAPI SHA-256 `f18a2dc9…8722` `[H]`. | Authentication model beyond those GETs, rate limits, uptime guarantee, CORS and mobile reliability, API stability across versions. |
| Search | `q` required; `limit` default 10, max 100; a 1-result title probe returned HTTP 200 `[H]`. | Relevance on our corpus; Devanagari/IAST handling; ranking; query grammar. |
| Export | Keyset pagination by segment id; default `limit` 50,000, max 500,000; `fmt` ndjson/csv/txt; one-row probe returned id, path, loc, lang, dates, word count, text, with **no licence or provenance field** in the row `[H]`. | Multi-page resume and dedup correctness; translation inclusion; per-row licence retrieval at scale; terms for bulk use. |
| Citations | `/api/cite` returns chicago, mla, bibtex, ris, csl and a `fields` object (path, title, language, edition, editor, digital source, URL, access date); the sample had `year` null `[H]`. | Reliability of editor/edition fields across the corpus. |
| Licensing | No single corpus licence was established. The sampled record cited GRETIL under CC BY-NC-SA 4.0 and a "free for study" notice from a second collection `[H]`. `llms.txt` names inputs GRETIL, SARIT, DCS, SuttaCentral, CBETA, 84000, Wikisource and Internet Archive OCR, with item-level attribution `[H]`. | Whole-corpus redistribution rights; dump/licence of the database; source-code licence; per-item licence accuracy; commercial-use position; attribution wording. |
| Identifiers | Paths like `in.veda.samhita.rg`, `….1.1.1`; `!` marks a commentary, `~` a translation; `*` is associated with a recension but the grammar is not established `[H]`. | Full path grammar; stability of paths over time. |

## 3. What can be eligible under current policy

Applying `[P]` to the sources `[H]` says Indike aggregates:

| Indike input | Eligible as our scripture text? | Reason |
| --- | --- | --- |
| GRETIL | **No** | Excluded by owner; also CC BY-NC-SA in the sampled record. |
| Wikisource | **No** | Excluded by owner. |
| Sanskrit Documents / Gita Press | **No** (not named by Indike but common upstreams) | Excluded by owner. |
| SARIT, DCS | **No under current policy** | Modern scholarly digital editions or annotated corpora; not a pre-1931 printed-edition route; DCS is itself built on earlier e-texts (provenance unclear `[?]`). |
| SuttaCentral, CBETA, 84000 | **No** | Modern translations/digitisations and outside our current Hindu-scripture scope. |
| "Vedic reserve" (free for study) | **No** | A study notice is not a redistribution permission `[H]`. |
| Internet Archive OCR | **Only as discovery** | The route is allowed only when we verify the text against the page images of a pre-1931 printing ourselves. Machine OCR is never scripture text; we already use archive.org's own scans and machine reading as a draft step. Indike adds no verified text here. |

Consequence: **no Indike text should be imported now.** The sampled Rigveda passage is a GRETIL-derived item and is ineligible `[H]`, `[P]`. A change of source policy is the owner's decision (section 9, Q1).

## 4. Recommended integration options (ranked)

| Option | What it does | Risk | Verdict |
| --- | --- | --- | --- |
| **A. Team research tool** | Offline scripts, run by us, that call small `search`/`page`/`cite` requests to find editions, translators, contributors and scan hints, writing notes to `docs/` (no passage text stored). | Low | **Do first**, once the host is reachable; use timeouts and backoff, no crawling. |
| **B. Outbound links** | In the app, a "Find on Indike" link per work or verse, opening indike.org in the browser. We store only an explicit mapping from our work id to an Indike path. | Low | **Do after owner approval** (and a courtesy check with the maintainers). Label as an external site, not reviewed by Pramana. |
| **C. Metadata-only external results** | When our corpus has no match, call Indike search live and show titles, source labels and licence strings with links, **no passage text**. | Medium: sends users' search text to a third party (a privacy and policy-text change), depends on uptime, CORS and terms. | **Later, only behind a flag**, after the maintainers confirm terms and the privacy text is updated. |
| **D. Offline packs from Indike data** | Bundle Indike-sourced text on the device. | High: licence, policy, accuracy | **Blocked.** |
| **E. Bulk import of Indike text** | Load export rows into our Supabase tables. | High | **Blocked** under current policy; see section 8 for the conditions that would be needed. |

## 5. Provenance, citations and licensing

### Provenance fields we must keep for anything derived from Indike (metadata only, phase A–C)

`indike_path`, our internal `work_id` and `edition_id`, locator, upstream URL, upstream licence string(s) as returned, contributors list, `retrieved_at` (our own timestamp; Indike's was null in the sample `[H]`), our content hash if any content is ever fetched, Indike API version and OpenAPI SHA, and a status label `external_unreviewed`. Keep **originals, human translations, machine translations, commentaries and recensions in separate records**; never silently substitute a machine translation or merge recensions into one verse numbering `[H]`.

### Where it lives

A **separate** table or collection (for example `external_refs`), never `scripture_passages` or `scripture_releases`. Those two are for approved, rights-cleared, owner-accepted releases; a different table guarantees no external item can ever be shown as reviewed scripture. Passage ids from external sources must not use our `pd_`/`gp_` prefixes.

### Path mapping

A hand-written mapping table (our work id ↔ Indike path), reviewed by a person. Never synthesise `!`/`~`/`*` suffixes; discover them from returned metadata `[H]`. Detect overlapping or misaligned locators rather than merging by title.

### Citations

For our own verses, citations stay built from our manifests (work, edition, scan page and image link). For external links, we may show Indike's `cite` output (chicago/mla/bibtex/ris) as "as provided by Indike", never as verification. Do not backfill missing years from memory `[H]`.

### Licensing: questions to ask the maintainers `[?]`

1. May a mobile app call the public API directly, and what are the rate limits, terms of use and attribution wording?
2. Is the per-record `license` field authoritative? Can you provide a licence-filtered export (for example public-domain only)?
3. What are the terms for bulk export or database dumps, and is there a published licence for the dump and for the source code?
4. Do you have a policy on commercial use, given the NonCommercial terms on some upstream items?
5. How stable are paths, and will you announce breaking changes?

CC BY-NC-SA and "free for study" are not equivalent to public domain and do not allow assuming bundling or commercial redistribution rights `[H]`. This plan is not a legal assessment.

## 6. Storage and download sizes

**Measured locally `[R]`:** our 12 approved release bundles (the Gita and the 11 principal Upanishads) hold **2,272 passages in 1,884,547 bytes raw and about 206,160 bytes gzip-compressed** (about 830 bytes raw and 90 bytes compressed per passage, including manifest and provenance overhead). The old device-pack code in `apps/mobile/device-corpus.ts` caps a pack at 5 MB and 30 packs; its import screen was removed from the app.

**Indike, arithmetic only `[A]`:** the export default would need ≥ 362 requests at 50,000 rows each, or ≥ 37 at the 500,000 maximum, to cover 18,071,704 passages `[H]`. The 576,705,097-word figure is **not** a size: at an assumed 5–25 bytes per word for mixed Latin and Devanagari text, the raw text is roughly 3–15 GB and perhaps 1–5 GB compressed. This range is deliberately wide and unmeasured; the real figure needs one small measured export, and even that would describe ineligible text. Do not put any such library in the APK.

**Our own offline packs, planning arithmetic `[A]`:** at about 1 KB raw and 0.1 KB compressed per passage, a 10,000-verse Purana is on the order of 10 MB raw and 1 MB compressed, and a few hundred thousand verses across the 18 Mahapuranas would be on the order of hundreds of MB raw and tens of MB compressed. These are order-of-magnitude figures that depend on how many verses we eventually publish.

**Pack design (for our own releases):** one downloadable pack per work or edition, versioned, with SHA-256 and size shown before download, gzip or similar compression, a user-set storage budget, a delete control, and delta updates for new releases. Packs contain only approved releases from our Supabase and carry their labels ("AI-transcribed, not yet human-reviewed" and review status) inside the pack.

## 7. Citations, labels and user-facing honesty

External content must never carry our "Reviewed" badge, our verse-card styling, or text-to-speech permission. External-result cards, if ever built, are visually distinct ("External library · not verified by Pramana") and show their own source and licence string. Machine translations from Indike, if ever shown, are labelled machine-generated.

## 8. Conditions that would be needed before any text import (E)

1. Owner explicitly changes the source policy (Q1).
2. A per-item chain of evidence from a pre-1931 printed edition, page-level locators, and a public-domain basis we can verify ourselves.
3. A licence-filtered export with item-level provenance, or written permission from the maintainers.
4. Our own verification against page images (as for every other text) before anything is labelled approved; Indike's label is never sufficient.
5. Separate storage, a rollback plan and a deletion path.

## 9. Decisions needed from the owner

1. **Policy (Q1):** keep the source restrictions exactly as they are, so Indike is research and link-out only? (Recommended.)
2. **Link-out (B):** may the app show "Find on Indike" links, once the maintainers have been asked? (Recommended yes.)
3. **External results panel (C):** worth building later, given the privacy change of sending search text to a third party? (Recommended: not yet.)
4. **Cross-checking:** may our team compare our verified readings against GRETIL-derived text found through Indike to flag disagreements? The owner's rule excludes it as a text source; using it even only to flag differences should not happen without explicit permission. (Recommended: no.)
5. **Maintainer contact:** do you want me to draft the message with the questions in section 5?

## 10. Safe check script for when the host becomes reachable

Only the small public requests listed in the handoff (stats, OpenAPI, llms.txt, one cite), each with `--max-time 30`, bounded retries with backoff, and a recorded SHA-256 of each response. No `export` beyond a one-row probe, no `sql`, no `query`, no admin or write routes, no crawling. Re-check the stats discrepancy in section 2 and record the build timestamp.

## 11. What I did not do

I did not reach indike.org, call any endpoint, download data, import anything, store keys, change app code, flags, workflows or secrets, or publish anything.
