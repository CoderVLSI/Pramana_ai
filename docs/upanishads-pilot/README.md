# Principal Upanishads transcription (AI-only, owner-approved pilot release)

`upanishads-1906-nirnaya-sagar-ai-transcription.json` holds the plain mantra/prose text of the eleven principal
Upanishads (Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Aitareya, Chandogya, Brihadaranyaka,
Shvetashvatara), 1,602 entries, read from page images of "Isadi-ashtavimshatyupanishadah" (The Twenty-eight Upanishads),
Nirnaya Sagar Press, Bombay, 1906, ed. Vasudeva Laxmana Shastri Pansikar. archive.org item
`twentyeightupan00upangoog`; printed page = image index - 14. Page link:
`https://archive.org/details/twentyeightupan00upangoog/page/n<page_index>/mode/1up`.

- **Who made it:** AI readers (one per page range) transcribing exactly what is printed, not a human. Where the
  print differs from the usual text it was kept as printed and noted. Two boundary gaps found by the merge check
  (Brihadaranyaka 3.5.1 and 4.5.6) were transcribed by the project lead from the page images.
- **Numbering is this edition's own.** E.g. Kena has 34 numbered verses (khanda 1 has 8), Katha 118 (valli 2 has
  24 because the print puts two lines under one number). Do not assume it matches other editions' references.
- **Entries:** `work`, `hierarchy` (the book's own sections), `verse` (number within the smallest section),
  `printed_numbers`, `text`, `page_index`, `confidence`, `note`. Peace invocations (shanti) have an empty verse.
  The Vedic nasal sign the print draws like a digit 5 is transcribed as ꣳ (U+A8F3).
- **Quality (actual JSON counts):** all 1,602 entries: 1,267 high, 334 medium, 1 low; the 1,572 numbered release units: 1,246 high, 325 medium, 1 low. Check the medium/low entries and the long proper-name lists in
  Brihadaranyaka (4.6, 6.5) first. Merge check: no gaps or repeats in any section's verse sequence.
- **Status:** NO human verse-by-verse review. The project owner approved this AI-only pilot release on 2026-10-16; the rights basis and remaining uncertainty are recorded in each committed provenance file. No human reviewer is invented or implied.
- **Rights:** published 1906, so US public domain. Editor Vasudeva Laxmana Shastri Pansikar (Panshikar) is
  reported as 1863-1931 (a Google AI overview, screenshot shared by the project owner on 2026-10-16; one
  source, consistent with his editing record 1888-1927). Death in 1931 puts the edition in the public domain in
  India too (life + 60 years = 1992). Still to do: confirm the dates from a second source such as a library
  authority record. Contributors other than the named editor are not identified on the title page we saw.

## Owner publication approval — 2026-10-16

The project owner accepted the rights basis for the 1906 Nirnaya Sagar edition, including the reported 1863–1931 editor dates supported by one Google AI overview and still awaiting a second authority source. The owner authorized publication of the AI transcription without human verse-by-verse review. The release attestations name the owner approval role and Claude AI transcription/merge-check role truthfully. This decision supersedes the earlier “not for release” preparation label for these eleven pilot releases only.

The requested releases include all 1,572 **numbered units**. Thirty unnumbered entries (including peace invocations) are excluded by the supplied preparation tool. Taittiriya has 16 sections mapped to sequential unit numbers; numbering is edition-specific. Text fields are preserved unchanged. The source XML was re-downloaded on 2026-10-16; its SHA-256 matches `f71a2a102086055bced71e6570ccd97a628eb17972c8a42426da199ec298ed95`.

## Publication result

All eleven releases passed isolated local TEST and LIVE verification on 2026-10-16. See [publication report](release-report-2026-10-16.md), [TEST results](test-verification-2026-10-16.json) and [LIVE results](live-verification-2026-10-16.json). App flag unchanged.
