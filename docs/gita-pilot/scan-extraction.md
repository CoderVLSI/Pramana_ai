# Gita pilot: our own text from a public-domain printed edition (draft, 2026-10-15)

**Why:** every typed copy found so far has terms attached (see `source-notices.md`). A new transcription of a clearly out-of-copyright printed edition has no such terms and a clean provenance.

**Book used for the first test:** archive.org item `ksu.g48.srimadbhagavadgi0000hari_v34`, "Srimad Bhagavad Gita Vol-34", Ananda Ashram Mudranalaya, 1909, edited by Hari Narayan Apte (the Anandashram Sanskrit Series edition with Shankara's commentary and sub-commentaries, 626 page images). archive.org marks no licence, so the rights basis is ours to record: a 1909 print and an editor believed to have died in 1919. **A reviewer must confirm the editor's death year and that the item is the complete, unabridged edition before release.**

**OCR source:** archive.org's own text reading of that item (`..._djvu.txt`, retrieved 2026-10-15, sha256 `a4d8ddeadedf208cd82449cd91a83ed57a2835b8ff650b1d163e5311aa6645f6`). The large-type verse lines read well; the small-print commentary is garbled and is ignored.

**Method (`services/ingest/scan_locate_extract.py`):**
1. Use any digital copy as a *map* only, to locate where each verse starts in the scan text (consonant skeleton + fuzzy match, moving forward through the book).
2. Keep the scan's own OCR text from that start up to the scan's printed verse-number marker, and require the number to equal the expected verse number.
3. Compare with the expected per-chapter counts for this edition's numbering (Shankara tradition: 47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78 = 700; chapter 13 has 34).

**Result after the second pass (2026-10-15):** 696 of 700 verses located (4 still missing: 6.23, 6.35, 18.67, 18.78). Closeness of the scan's OCR to the map copy, by verse: 158 at 95% or better, 246 at 85-94%, 168 at 60-84%, 124 below 60%. 35 verses were found by their words because the printed verse number was unreadable. A reader should treat only the 95%+ group as "probably right" and still check it against the page image. The low groups are mostly lines the OCR split, cut or merged with commentary (for example 11.32 and 11.33).

**Nothing here is publishable.** The map copy (Sanskrit Wikisource, CC BY-SA) was used only to find positions and to score closeness; none of its text is kept. The draft text itself is not committed.

**Why quality stops here:** archive.org's automatic OCR has no page breaks and cannot tell the large verse type from the small commentary type. Two things would improve it a lot: (1) re-reading the page images with a stronger OCR engine or the layout (hOCR) data, which needs this sandbox to reach archive.org's file servers (\*.us.archive.org) in addition to archive.org itself; (2) page-image links for reviewers.

**Page links (done):** `services/ingest/scan_layout_extract.py` reads archive.org's `_djvu.xml` and attaches a page number to each drafted verse (639 of 696 placed, page order never goes backwards; the other 57 get a `page_hint` of the pages to look between). Reviewers open `https://archive.org/details/<item>/page/n<page_index>/mode/1up`. Verse text is not changed by this step.

**Next:** (1) improve text quality (stronger OCR of page images); (2) finish the 4 missing verses by hand; (3) two named reviewers compare every verse to the page; (4) then fill \`provenance.template.json\` with this book as the original source and build the bundle.
