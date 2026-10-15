# Gita transcription (UNREVIEWED, not for release)

`gita-1909-apte-ai-transcription.json` holds all 700 verses (Shankara numbering) read from the page images of
the public-domain 1909 Anandashram edition (archive.org item `ksu.g48.srimadbhagavadgi0000hari_v34`).

- **Who made it:** read from the page images by AI readers (one per chapter), not by a human. Text is as
  printed, including places where the print differs from the usual text (e.g. 1.31, 7.3, 16.4, 9.21).
- **Cross-check:** 655 of 700 match a second digital copy to 98%+ on consonants; the rest are explained by
  speaker lines or different line grouping. Spot checks against the page images (1.31-1.33, 7.3, 16.4) agreed
  with the transcription. The second copy was used only for scoring; none of its text is kept.
- **Per verse:** `page_index` (open `https://archive.org/details/<item>/page/n<page_index>/mode/1up`),
  `confidence`, `speaker` and `note`. About 17 verses are `medium`; check those first.
- **Status:** NO human reviewer yet. `rights_approved` and the two named reviewers required by
  `validatePublicDomainBundle` must come from people. A local pipeline test (700 passages built and validated,
  nothing uploaded) used clearly labelled TEST attestations that are not in this repo.
- **Still to verify by a human:** editor Hari Narayan Apte's death year, that the archive.org copy is complete,
  and a sample of verses against the pages.
