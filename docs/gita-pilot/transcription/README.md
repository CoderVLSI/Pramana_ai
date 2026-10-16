> **Release decision, 2026-10-15:** The Pramana project owner explicitly accepted the recorded rights basis and authorized `gita-open-1` without human verse-by-verse review. The two release attestations identify the owner approval and Claude AI transcription/cross-check truthfully. No human textual review is claimed. The earlier preparation requirements below are historical; this owner decision supersedes them for this release only. See `services/ingest/releases/gita-open-1.provenance.json`.

# Gita transcription (AI-only; owner-approved pilot release)

`gita-1909-apte-ai-transcription.json` holds all 700 verses (Shankara numbering) read from the page images of
the public-domain 1909 Anandashram edition (archive.org item `ksu.g48.srimadbhagavadgi0000hari_v34`).

- **Who made it:** read from the page images by AI readers (one per chapter), not by a human. Text is as
  printed, including places where the print differs from the usual text (e.g. 1.31, 7.3, 16.4, 9.21).
- **Cross-check:** 655 of 700 match a second digital copy to 98%+ on consonants; the rest are explained by
  speaker lines or different line grouping. Spot checks against the page images (1.31-1.33, 7.3, 16.4) agreed
  with the transcription. The second copy was used only for scoring; none of its text is kept.
- **Per verse:** `page_index` (open `https://archive.org/details/<item>/page/n<page_index>/mode/1up`),
  `confidence`, `speaker` and `note`. 16 verses are `medium`; check those first.
- **Historical preparation status (superseded for gita-open-1 by the owner decision above):** NO human reviewer yet. `rights_approved` and the two named reviewers required by
  `validatePublicDomainBundle` must come from people. A local pipeline test (700 passages built and validated,
  nothing uploaded) used clearly labelled TEST attestations that are not in this repo.
- **Editor/series-publisher identity:** corrected authority investigation below. The earlier BnF “1890–1936” interpretation was a mistake: those are dates of a cited series publication, not Apte’s lifespan.
- **Still to verify by a human:** a verse-by-verse text review; none is claimed.

## Editor identity and title-page check — 2026-10-16

**Hari Narayan Apte’s lifespan 1864–1919: CONFIRMED** by two independent sources: [BnF person authority FRBNF14508404 / cb145084040](https://catalogue.bnf.fr/ark:/12148/cb145084040) and the [Maharashtra government Marathi Vishwakosh biography](https://vishwakosh.marathi.gov.in/24244/). The latter specifies 8 March 1864–3 March 1919 and says he managed the Anandashram founded by his uncle throughout his life. BnF describes the same person as both novelist and editor of classical Sanskrit literature, and nephew of Mahadeva Chimanaji Apte. Thus the literary and Anandashram roles do not require two different men. The institution’s own [founder history](https://www.aanandashram-sanstha.org/founder) independently identifies its founder’s nephew Hari Narayan as the novelist who continued its work. The BnF authority also cites the LC heading; that cross-reference is not counted as independent of BnF here.

**Correction of the supposed 1890–1936 person:** BnF’s heading/subfield for the person is 1864–1919. The range 1890–1936 occurs in a *source citation* describing the Anandashrama Sanskrit series published by Mahadeva Chimanaji Apte and Hari Narayan Apte. It is not a second author’s birth/death field. The authority XML was inspected via the [BnF SRU interface](https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=aut.anywhere%20all%20%22Hari%20Narayan%20Apte%22&maximumRecords=10).

**The actual 1909 Gita title page was found at image index n0**, not after the contents: [page image](https://archive.org/details/ksu.g48.srimadbhagavadgi0000hari_v34/page/n0/mode/1up), [direct JPEG](https://archive.org/download/ksu.g48.srimadbhagavadgi0000hari_v34/page/n0_w1200.jpg). It shows series no. 34, second edition, 1909 (Saka 1831), Shankara commentary and Anandagiri gloss. Crucially, it distinguishes **Kashinath Shastri Agashe as text editor/reviser** from **Hari Narayan Apte as publisher through the Anandashram press in Pune**. So “edited by Hari Narayan Apte” alone is an incomplete description of this edition’s credits. This is a direct primary-page observation; an independent catalogue explicitly describing this exact 1909 impression and both roles is still **UNCONFIRMED**. The [BnF 1901 Gita record](https://catalogue.bnf.fr/ark:/12148/cb308559443) independently connects Agashe and the 1864–1919 Apte with the same press, but it is series no. 45 with different commentaries, **not** proof of the exact no. 34/1909 impression.

**Conclusion:** the Anandashram Hari Narayan Apte is the novelist/series publisher (1864–1919), not a demonstrated 1890–1936 namesake; the scanned Gita’s title-page text editor is Agashe. Apte’s dates are CONFIRMED; the exact-edition attribution above is observed on one primary scan and awaits a second independent bibliography. Agashe’s own identity/life dates and any remaining contributor-rights assessment were not established by this check and remain **UNCONFIRMED**. No historical published bundle/manifest or LIVE record was rewritten.
