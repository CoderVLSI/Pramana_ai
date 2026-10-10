# Corpus intake status — 2026-10-10

These are private draft scan indexes, not approved in-app scripture citations.

- Vamana download recovered: 489 scan pages, checksum and search checks passed.
- Valmiki Ramayana: two candidate volumes, 1,890 scan pages. Edition, kanda coverage, verse mapping and permissions remain unverified.
- Mahabharata: six candidate volumes, 15,432 scan pages, checksum and Hindi search checks passed. Exact edition and parva/verse completeness remain unverified.
- Narada and Garuda: 32 pages re-OCRed; 768 Narada and 622 Garuda pages remain unrepaired. Cover evidence identifies abridged Hindi-only editions. They cannot establish complete Sanskrit works.
- Upanishads: 11 individual principal-text metadata leads; 97 of the 108 Muktika entries remain unlocated in the bounded search. Isha and Kena each have five repaired pages; their remaining 53 and 147 pages need repair. A compilation is not counted as proof of all members.
- Four Vedas: complete matching Gita Press Samhita editions have not been established.
- Skanda candidate is abridged; Brahmanda coverage remains uncertain.

The backend can now load reviewed raw bundles through PRAMANA_APPROVED_CORPUS_DIR, revalidate provenance, scope retrieval, and return exact cited excerpts. Draft/private OCR cannot be used as an approved bundle. With no approved bundles configured, the true approved passage count remains zero.

Saving an AI key does not approve scripture sources. Ordinary greetings and app help now have a separate connected-provider route; scripture requests retain the source gate. Live conversation now supports scripture and web-search tools, but its scripture tool still excludes unreviewed drafts.

## Federated draft retrieval update

The offline review search now covers 31 scan assets / 35,445 scan pages. Vishnu’s legacy index was rebuilt with the current checksum-aware schema. Source inventories report wrong-script samples and checksum-verified local repair counts. Search preserves volume identity, applies exact source scopes, excludes wrong-script page evidence, and prefers repaired pages. Exact-page exports retain empty printed-page and verse mappings until scan review.

See [review commands](draft-rag-review.md) and [machine-readable counts and local timings](draft-rag-progress-2026-10-10.json). These totals describe scans, not complete works or approved scripture coverage. No source excerpts are committed or distributed in the app.
