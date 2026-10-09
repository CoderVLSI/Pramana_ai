# All 18 Mahapuranas: Gita Press, Gorakhpur references

Publisher choice is confirmed by the user. Usage permission for the user's books/PDFs is currently unclear. A public Vishnu Purana candidate now has a private, unreviewed page-aware OCR index. No publisher text is embedded remotely, quoted by the app, or indexed into approved RAG. See `archive-sourcing.md`.

Official catalog metadata was inspected on 9 October 2026. Candidate catalog codes and product URLs are in `packages/corpus-schema/catalogue-candidates.json`. These are acquisition leads, not selected print editions or licensed texts. A catalog listing is not a redistribution or API-use license. The terms page did not establish permission for these operations.

The catalog includes explicitly abridged (`Sankshipta`) and digest editions for several works. Do not call a collection of summaries "all 18 complete Mahapuranas." Candidate copies must be inspected for coverage, Sanskrit text, translation authorship, volume sequence, page numbering, and print edition. The selected enumeration retains Shiva; variations in other traditional lists remain separately documented.

## Intake workflow

1. Receive the user's digital copies privately. Record file SHA-256, title page, publisher, catalog code, print year, language, volume, and complete/abridged/selected status. Owning a copy does not itself settle publisher-text usage rights.
2. Obtain a usage record for Sanskrit witness transcription, modern translations, scan display, indexing, external embedding/model submission, quotations, and audio separately. If an operation is not covered, keep it disabled. Do not contact the publisher without the user's instruction.
3. Extract draft text locally, preserving source originals. Map volume/khanda/skandha/samhita/chapter/verse and both printed/PDF page numbers according to the actual edition. Store drafts outside the approved corpus.
4. Check OCR and verse numbering with two independent named reviewers. Verify full-edition coverage against a reviewed count. Keep Sanskrit and licensed translations separate.
5. Prepare a reviewed JSON source bundle. Run `npm run ingest:gita-press -- input.json output.json`. This is a validator/normalizer; it does not independently certify permission proofs or reviewer identities and does not automatically publish, embed, or index output.
6. Publish immutable releases only after rights and editorial sign-off. Then integrate lexical/vector retrieval with edition/license filters and passage-level citation checks. Production index and full RAG retrieval still need to be implemented and connected.

The importer requires exact publisher/edition metadata, edition-specific hierarchy levels, page locators, source checksums, rights approval, index/quote permissions, distinct reviewers, and coverage confirmation. It rejects abridged editions by default. `--allow-abridged` prepares a separately labeled abridged pack; it never satisfies the complete-edition target.

Source register: `GET /v1/corpus/register`. The app now defaults to the 18-work Gita Press collection, reports that it has no indexed passages, and keeps Bhagavad Gita development fixtures in a separate selectable collection.

## Source material needed next

The actual Gita Press PDF/book copies, including title/copyright pages and all volumes, and the available usage-permission record. The architecture PDF remains the only user attachment. Web sourcing is now handled directly; one archive candidate has a private draft OCR index.

Sources: [Gita Press catalog](https://gitapress.org/catalogue), [Gita Press terms page](https://gitapress.org/terms-condition), [Gita Press e-books page](https://www.gitapress.org/ebook).
