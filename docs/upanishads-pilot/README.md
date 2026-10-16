# Principal Upanishads transcription (AI-only, owner-approved pilot release)

`upanishads-1906-nirnaya-sagar-ai-transcription.json` holds the plain mantra/prose text of the first 28 Upanishads of the book
(the eleven principal ones, then Kaivalya through Muktika), 2,434 entries, read from page images of "Isadi-ashtavimshatyupanishadah" (The Twenty-eight Upanishads),
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
- **Rights (updated authority check, 2026-10-16):** first publication 1906 is documented by the scan/catalogue, but editor life dates **1863–1931 are UNCONFIRMED**. The earlier Google AI overview is not an independent authority. See the detailed rights findings below; the new BnF evidence conflicts with 1931. Published releases retain their historical owner-approved provenance; no content or release manifest was silently rewritten.

## Owner publication approval — 2026-10-16

The project owner accepted the rights basis for the 1906 Nirnaya Sagar edition, including the reported 1863–1931 editor dates supported by one Google AI overview and still awaiting a second authority source. The owner authorized publication of the AI transcription without human verse-by-verse review. The release attestations name the owner approval role and Claude AI transcription/merge-check role truthfully. This decision supersedes the earlier “not for release” preparation label for these eleven pilot releases only.

The requested releases include all 1,572 **numbered units**. Thirty unnumbered entries (including peace invocations) are excluded by the supplied preparation tool. Taittiriya has 16 sections mapped to sequential unit numbers; numbering is edition-specific. Text fields are preserved unchanged. The source XML was re-downloaded on 2026-10-16; its SHA-256 matches `f71a2a102086055bced71e6570ccd97a628eb17972c8a42426da199ec298ed95`.

## Publication result

All eleven releases passed isolated local TEST and LIVE verification on 2026-10-16. See [publication report](release-report-2026-10-16.md), [TEST results](test-verification-2026-10-16.json) and [LIVE results](live-verification-2026-10-16.json). App flag unchanged.
- **Brihajjabala and Kaushitaki** were flagged by their own reader as unreliable (images failed to display for
  it); every entry of those two is set to `medium` until an independent re-read from the 1925 edition is compared.
- **Mixed section schemes** (e.g. Narayana, Muktika, Hayagriva): the release preparation folds them into a single
  `section` level so every passage still has a unique, checkable locator.

## Rights: independent editor authority investigation — 2026-10-16

**Result: exact birth/death dates UNCONFIRMED.** No two independently sourced records agreeing on 1863–1931 were found. In particular, the newly inspected library authority gives a conflicting death year, not corroboration of the AI overview.

| Source | What it establishes | Limit / status |
| --- | --- | --- |
| [BnF authority FRBNF13517021, ark cb135170219](https://catalogue.bnf.fr/ark:/12148/cb135170219) | Vāsudeva Lakṣmaṇa Śāstrī Paṇaśīkara, with the Pansikar/Panshikar English variants; heading dates `18..–1925`; Sanskrit editor | **1925 UNCONFIRMED**: one authority, conflicts with 1931. Its source notes cite a Berlin record with 1925, but that citation is not a separately inspected independent confirmation. |
| [BnF bibliographic record cb39437814h](https://catalogue.bnf.fr/ark:/12148/cb39437814h) | Associates that same `18..–1925` authority with the Nirnaya Sagar Brahmasutra editor | Same BnF authority lineage; not a second independent death-date source. |
| [CiNii/NII authority DA04472828](https://ci.nii.ac.jp/author/DA04472828) | Numerous Sanskrit/English name forms and Nirnaya Sagar editorial credits | No life dates in the inspected authority heading; cannot corroborate 1931. |
| [University of Pennsylvania Online Books Page, Harvard-local-name entry](https://onlinebooks.library.upenn.edu/webbin/book/lookupname?key=Panshikar%2C+Vasudeva+Laxman+Shastri%2C+%28Harvard+local+name%29) | Links Panshikar to *The twenty-eight Upanishads*, Nirnaya-sagar Press, 1906 | Name/work connection, not a birth/death authority. |
| [2010 reproduction of a Natyasampada family account](https://groups.google.com/g/soc.culture.tamil/c/76WTeesge1A) | Reproduces family dates 1860–1937 for the grandfather Vasudevshastri Laxmanshastri Panshikar | **UNCONFIRMED**: reproduced family material, not independently checked original; conflicts with both 1925 and 1931. Do not treat repeated mirrors as independent evidence. |

Method: inspected BnF SRU authority XML (`aut.anywhere all "Pansikar"` / `"Panshikar"`) in addition to catalogue pages. VIAF cluster 115976397 is linked by BnF, but the direct VIAF endpoint returned HTTP 403; Wikidata API also returned 403. LOC name suggestion searches did not resolve this editor and are not evidence of an absent LOC record. No dates were inferred from years of posthumous reprints.

**Rights decision:** US first-publication basis is 1906; the owner previously accepted this release basis. The exact editor lifespan and a fully corroborated India rights determination remain **UNCONFIRMED** under this task’s two-independent-source rule. All three reported death years would be old enough for a 60-year term to have elapsed, but that observation does not establish which date/person is correct or identify all contributors. Obtain an independently sourced obituary/biography or original authority source before upgrading the status. No new text source, transcription, reviewer or rights approval was created by this investigation.
