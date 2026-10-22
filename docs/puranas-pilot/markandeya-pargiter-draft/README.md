# Markandeya Purana, English (F. E. Pargiter, Bibliotheca Indica, Calcutta 1904) — extractor + first draft, NOT FOR PUBLICATION

Source: archive.org item `cu31924022991974` (818 image leaves; translation text ≈ n44–n770; index leaves from n771). Pargiter d. 1927 (two sources, see ../source-candidates.md). Public domain in the US (1904) and expired in India.
`build_mp.py` builds a draft from archive.org's machine reading of the same scan: it keeps main-text lines, drops running heads and footnotes (by vertical gap), splits at numbered verses and 'Canto' headings.
Status (first pass): 136 cantos reached (expected 137), ~3,750 verse units; BUT about 30 cantos show 0 verses (their first verse number or heading is not machine-read, so numbering resyncs wrongly) and canto boundaries are not reliable. The draft must not be used for counts or gap-free claims.
Next: map cantos to start pages from the printed contents (n30–n39, canto number + page number per row), then re-run the splitter per canto, then correction-only proofreaders against the page images (short corrections only; never whole paragraphs).
