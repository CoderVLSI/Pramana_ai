# Gita pilot: our own text from a public-domain printed edition (draft, 2026-10-15)

**Why:** every typed copy found so far has terms attached (see `source-notices.md`). A new transcription of a clearly out-of-copyright printed edition has no such terms and a clean provenance.

**Book used for the first test:** archive.org item `ksu.g48.srimadbhagavadgi0000hari_v34`, "Srimad Bhagavad Gita Vol-34", Ananda Ashram Mudranalaya, 1909, edited by Hari Narayan Apte (the Anandashram Sanskrit Series edition with Shankara's commentary and sub-commentaries, 626 page images). archive.org marks no licence, so the rights basis is ours to record: a 1909 print and an editor believed to have died in 1919. **A reviewer must confirm the editor's death year and that the item is the complete, unabridged edition before release.**

**OCR source:** archive.org's own text reading of that item (`..._djvu.txt`, retrieved 2026-10-15, sha256 `a4d8ddeadedf208cd82449cd91a83ed57a2835b8ff650b1d163e5311aa6645f6`). The large-type verse lines read well; the small-print commentary is garbled and is ignored.

**Method (`services/ingest/scan_locate_extract.py`):**
1. Use any digital copy as a *map* only, to locate where each verse starts in the scan text (consonant skeleton + fuzzy match, moving forward through the book).
2. Keep the scan's own OCR text from that start up to the scan's printed verse-number marker, and require the number to equal the expected verse number.
3. Compare with the expected per-chapter counts for this edition's numbering (Shankara tradition: 47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78 = 700; chapter 13 has 34).

**First-pass result:** 592 of 700 verses located with the matching printed verse number; 88 not located and 20 with a marker mismatch (listed in the draft). Located verses still contain OCR errors (example: "मा फरेष" for "मा फलेषु"), so **nothing here is publishable**. Every verse needs a human to compare it to the scan page. The map copy (Sanskrit Wikisource, CC BY-SA) was used only to find positions and none of its text is kept.

**Next:** (1) a second pass for the 108 unmatched verses; (2) an OCR-error pass using the scan page images; (3) two named reviewers compare every verse to the page; (4) then fill `provenance.template.json` with this book as the original source and build the bundle.
