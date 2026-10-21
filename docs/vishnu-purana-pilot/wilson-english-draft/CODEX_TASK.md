# Codex job: repair the thin chapters of the Wilson (1840) Vishnu Purana Book 1 draft

Goal: make `docs/vishnu-purana-pilot/wilson-english-draft/book1-draft.json` a faithful, gap-free record of Wilson's MAIN translation text for Book 1 (footnotes excluded), so it can later be published as an English-only release. Work from the page images only.

Source (public domain; H. H. Wilson d. 1860; John Murray, London 1840): archive.org item `in.ernet.dli.2015.283854`. Page image URL: `https://archive.org/download/in.ernet.dli.2015.283854/page/n<INDEX>_w1000.jpg` (use curl -sSL). Image index n = printed page + 95 for Book 1. Do NOT use any modern edition, reprint introduction, other translation, or text from memory; the printed page decides.

## Chapters to repair (image index ranges, inclusive)
Chapter 1: n96–n101; chapter 2: n102–n115; chapter 3: n116–n121 (contains a table of time measures: record it as one `kind: "table"` entry, rows joined with " | ", main text only); chapter 7: n144–n152; chapter 10: n177–n180; chapter 21: n244–n249.
In the current draft these chapters have text missing (the script mistook main text for footnotes on some pages), and about 44 leaked footnote entries elsewhere were dropped by rule — also spot-check chapters 4, 5, 6, 15, 22 for a missing paragraph.

## Rules
1. Transcribe ONLY the main translation block of each page (the larger type), paragraph by paragraph as printed. Skip footnotes (smaller type at the foot of the page, numbered), running headers and page numbers.
2. Keep Wilson's printed spelling and diacritics exactly (Vishńu, Brahmá, Púrańa…). Join words hyphenated across line ends. Remove footnote reference numerals/asterisks after words.
3. Chapter headings: `CHAP. N.` plus the printed italic summary go in one entry with verse "0".
4. Do not guess unreadable letters: mark `"confidence": "low"` and say what is unclear in `"note"`.
5. Write in small steps (a few pages at a time) so no single output is huge. Keep the JSON valid after every write.
6. Output: replace the entries for each repaired chapter in `book1-draft.json` in place, same fields (`kind, book, chapter, verse, page_index, text`; add `confidence`, `note` where needed). Renumber `verse` (paragraph number) within each repaired chapter from 1.
7. Do NOT change anything under `apps/`, `packages/`, `services/`, `.github/`, or any other file. Do not publish anything to Supabase. Do not print long passages of the book in chat; report counts and page ranges only.

## Report back (short)
Per chapter: pages read, paragraphs, characters, any low-confidence spots, and any page where main text could not be separated from footnotes.
