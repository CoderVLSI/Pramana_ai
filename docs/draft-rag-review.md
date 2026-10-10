# Private RAG search and source review

`services/ingest/search_drafts.py` searches all local page-aware draft indexes in one offline query. It returns source asset identity, scan ordinal, exact OCR excerpts, hashes and explicit unreviewed status. This is a preparation/review tool; it does not expose private scans through the public app or approve them for scripture answers.

The search preserves Hindi/Sanskrit combining characters, expands a small explicit English-to-Hindi vocabulary, and quotes query tokens before passing them to SQLite FTS5. It ranks by matched terms plus reciprocal local rank; it is lexical retrieval, not a semantic model or translation service. Multi-volume sources stay separate. A generic archive page image is never assigned to a multi-asset volume because that would risk linking to the wrong scan.

Repaired pages override the corresponding archive OCR. Repairs require matching recorded text checksums. Pages that fail the Devanagari script smoke check are excluded from returned Hindi/Sanskrit evidence, but remain in the inventory. A passing script check establishes script presence, not OCR accuracy. Manifest/index checksum mismatches, unknown source scopes and escaped database paths are rejected. Every database query is read-only and has a three-second progress deadline.

From the repository root:

```sh
python3 services/ingest/search_drafts.py --catalog
python3 services/ingest/search_drafts.py --query 'vishnu dharma' --limit 10
python3 services/ingest/search_drafts.py --query 'भक्ति' --source narada-puran-gita-press-gorakhpur
python3 services/ingest/search_drafts.py --query 'राम' --output services/ingest/private/reviews/rama-search.json
python3 services/ingest/search_drafts.py --source narada-puran-gita-press-gorakhpur --page 7 --output services/ingest/private/reviews/narada-scan-7.json
```

An exact-page review export includes the full OCR, its checksum, an empty printed-page/chapter/verse mapping, and incomplete review checklist. Fill those fields only by comparing with the printed scan. The export is not an approved ingestion pack. Excerpt exports must remain under the ignored private directory.

To repair the next bounded batch, use the existing resumable OCR tool:

```sh
python3 services/ingest/repair_ocr.py narada-puran-gita-press-gorakhpur --pages 7-16
```

Continue source/title-page confirmation, distinguish full texts from abridgements, map printed pages and chapter/verse hierarchy, compare OCR with the scan, and record applicable usage evidence. Then use the existing validated bundle importer and `PRAMANA_APPROVED_CORPUS_DIR`. The app's approved retrieval and live `search_scripture` tool consume that reviewed corpus; they do not silently promote private OCR.

Validation includes scoped cross-volume retrieval, repaired-page precedence, tampered repair rejection, wrong-script exclusion, manifest mismatch rejection, bounded hostile-looking query text and exact-page exports with no invented citation mapping.
