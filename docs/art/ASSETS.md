# Pramana original illustration assets

Created **2026-10-16** using **OpenAI image generation (`image_gen.imagegen`)**. WebP export: **ImageMagick** (resize, center crop, metadata stripping and compression only). No app code was changed.

[View the complete light/dark contact sheet](preview.webp)

## Art direction and provenance

Original text-prompted illustrations in a consistent editorial gouache treatment: warm saffron (`#D98B32`), ivory (`#F6F0E3`) and deep indigo (`#202440`), with subtle paper grain and restrained terracotta accents. Prompts expressly excluded text, pseudo-script, logos, watermarks, existing artworks, calendar art, Gita Press imagery and imitation of any artist. No external artwork or existing religious image was supplied as a reference. Dark variants were generated from this set’s own originals. These are decorative illustrations, not depictions sourced from or evidence for scripture.

## Files and short prompts

All paths below are relative to `apps/mobile/assets/art/`. Sizes use decimal KB. Every row uses the tool and date above.

| File | Pixels | KB | Short prompt |
| --- | --- | ---: | --- |
| `cover-bhagavad-gita-dark.webp` | 1024x1024 | 134.0 | Dark companion of the original: preserve composition; deep-indigo dusk/background, saffron horizon and muted ivory highlights; no text. |
| `cover-bhagavad-gita.webp` | 1024x1024 | 117.9 | Symbolic golden chariot, lowered bow and saffron cloth on a tranquil plain at dawn; no battle or people. |
| `cover-puranas-dark.webp` | 1024x1024 | 191.3 | Dark companion of the original: preserve composition; deep-indigo dusk/background, saffron horizon and muted ivory highlights; no text. |
| `cover-puranas.webp` | 1024x1024 | 185.4 | Dignified storyteller and two adult listeners beneath a flowering tree; winding river and distant temple hills. |
| `cover-upanishads-dark.webp` | 1024x1024 | 152.4 | Dark companion of the original: preserve composition; deep-indigo dusk/background, saffron horizon and muted ivory highlights; no text. |
| `cover-upanishads.webp` | 1024x1024 | 131.6 | Elder teacher and adult student beneath a banyan tree beside a still river and a blank palm-leaf manuscript. |
| `cover-vedas-dark.webp` | 1024x1024 | 130.2 | Dark companion of the original: preserve composition; deep-indigo dusk/background, saffron horizon and muted ivory highlights; no text. |
| `cover-vedas.webp` | 1024x1024 | 111.8 | Gentle sacred fire in a square stone altar, four blank folded manuscript bundles, dawn river and indigo hills. |
| `empty-saved-verses.webp` | 1200x900 | 135.7 | Open blank ivory folio, unused saffron bookmark, leaf sprig and quiet indigo landscape; hopeful beginning. |
| `first-launch.webp` | 1024x1280 | 163.8 | An inviting stone arch frames a dawn river, with closed manuscript and small lamp in the foreground; indigo sky. |
| `verse-card-strip-dark.webp` | 2160x360 | 95.7 | Dark companion of the original: preserve composition; deep-indigo dusk/background, saffron horizon and muted ivory highlights; no text. |
| `verse-card-strip.webp` | 2160x360 | 74.1 | Very quiet river line, lotus buds, banyan leaves and tiny saffron sun on ivory, with ample negative space. |

## Use and theme pairing

- Four square covers: use the unsuffixed file for light theme and `-dark` for dark theme. Render at 1:1 without further cropping important content.
- `first-launch.webp` is 4:5. `empty-saved-verses.webp` is 4:3. Both already use indigo backgrounds and work in either theme; no duplicate dark files are needed.
- The verse-card strips are 6:1. Choose the matching theme and render as a separate header image; place any verse text outside the image.
- All exports are opaque RGB WebP. Preserve aspect ratios. They are static illustrations; no runtime imports or wiring were added.
- Covers and scenes are approximately 112–191 KB each. The low-detail strips are approximately 74/96 KB; kept smaller rather than padded to meet a nominal size. Total payload is approximately 1.62 MB.

## Validation

All 12 WebP files were decoded after export and visually checked together for composition, consistent palette, absence of visible text, and light/dark treatment. Dimensions, byte sizes and SHA-256 are recorded below. This asset-only task did not require app builds or behavioral tests.

```text
8db3d8c9c61b61568ec52e2a00176d5848d401fe2ab74152a2f60fabf299a799  cover-bhagavad-gita-dark.webp
d2738d9e18b07232b20783da83956a5d1bafa31fbbfe66d301da93db11720f1a  cover-bhagavad-gita.webp
a2c4f812d38528ec1fb7f9d980fc28e2b037ae1b7b7c6016bcc7336c9a8c8ebe  cover-puranas-dark.webp
b4034bfadfdb9ac2144690dbb523223c2af4b5ceca64f83304fd2d6d77f9f30d  cover-puranas.webp
945d0b5e1587f572df68f05afb90607195504ac6c54e7f9891d83ea81d83a805  cover-upanishads-dark.webp
91b0866e02d29615bdad7c502bb67885b110152c985929a7667ac2cf61de9e87  cover-upanishads.webp
2e238fc0e9c883d28c7a0ae44d8b5f04fffc0ada932c067a08457f7e61712795  cover-vedas-dark.webp
6383bf9c47db0e1c12ac5ffb15d7a2a77fd65e0130e48ddf4cbb8dcae73901dd  cover-vedas.webp
26e10c13d23d0d4a2111a72048a86883e10947f74358865d76bf5d76fff0afbc  empty-saved-verses.webp
276f586e2f683170eb4f65924f22357b81abe396069b3e677421a683e7ab893b  first-launch.webp
c1ca742274ac5b9eb20339a3d175c12d10456fea69e0389516f64a7c239d2d27  verse-card-strip-dark.webp
b695bea06d2b81fd284ba726f244d61bbce33da3a17cf8653edc5accfff0655a  verse-card-strip.webp
```

## App icon and in-app integration — 2026-10-17

Tool: OpenAI `image_gen.imagegen`. Original text-only prompt: minimal ivory open-manuscript / lotus emblem with a saffron rising sun, deep-indigo background, no text, faces, deities, existing brands or artist imitation. No external reference artwork. Generated master retained outside the repo; PNG exports resized/stripped with ImageMagick.

- `apps/mobile/assets/icon.png`: 1024×1024 launcher, favicon and splash artwork.
- `apps/mobile/assets/adaptive-icon.png`: 1024×1024 Android foreground export, master scaled to 768×768 and centered on indigo for mask-safe padding. Background `#202440`.
- Existing generated collection covers now appear in Library, with matching dark variants. The welcome and saved scenes and themed verse-card strips are integrated as decorative art; source metadata stays separate.
- Shortened study headings, switching labels, saved instructions and chat/attachment copy. Voice/privacy details and source status remain available. Rishi remains the chat character rather than the launcher icon.

Validation for the integration: TypeScript passed; Expo web and Android bundle exports passed; resolved Expo config points to the new launcher/adaptive images and indigo splash. Chromium checks at 390×844 passed for chat, Library and Saved in light/dark themes using fixture library metadata (no provider calls): no page errors or document overflow. Visually checked the library thumbnails and compact saved scene. Corrected React Native Web intrinsic-height behavior by setting explicit scene/strip heights. Existing Metro `@noble/hashes/crypto.js` export warning remains non-blocking. This verifies bundles and web rendering, not a rebuilt APK or Android launcher installation.

## Individual Upanishad covers — 2026-10-17

[Preview the eleven principal covers and Nrisimha Tapaniya](upanishad-covers-preview.webp). Tool: OpenAI `image_gen.imagegen`, one original text-prompted image per released Upanishad. No source artwork was supplied. Shared prompt direction: editorial gouache / cut-paper, saffron, ivory and deep-indigo edges, large central motif readable at thumbnail size, respectful treatment, no text, pseudo-script, logos, calendar imagery, Gita Press artwork or artist imitation. These are symbolic illustrations, not literal reconstructions, depictions of particular source pages or evidence for scripture.

Exports: ImageMagick resize to 768×768, metadata stripping, opaque WebP quality 82; original generated masters retained outside Git. All covers have dark indigo edges and work unchanged on light and dark backgrounds. Paths are relative to `apps/mobile/assets/art/upanishads/`.

| File | Pixels | KB | Short prompt | SHA-256 |
| --- | --- | ---: | --- | --- |
| `isha.webp` | 768×768 | 111.2 | Sun, river and interconnected living landscape. | `9be0c03cc79c0baeb7b3fd51c51d92a5eed74b6a68252861706c98152279202c` |
| `kena.webp` | 768×768 | 88.4 | Quiet flame, wind-blown grass and a small ungraspable light. | `e51af73d4a42f25d0ade0546c73deaa42023fd787e97140698c246eb1c363940` |
| `katha.webp` | 768×768 | 135.0 | Seeker, chariot, two forest paths and luminous doorway. | `9d84279f6dc9b079582887dbf5228b453c9ff8fdd9df28caa0b325c853adc360` |
| `prashna.webp` | 768×768 | 132.1 | Seekers in dialogue with an elder beneath a broad tree. | `51d1a817ab8a060f6faa6128ad2a93367025205c79d3bdf444dc5370b4991644` |
| `mundaka.webp` | 768×768 | 101.1 | Two birds on a fruiting branch, one active and one watching. | `f8eda519eba964032850120cfe67627bf94205c9803bd114dc21481bc21f814c` |
| `mandukya.webp` | 768×768 | 92.6 | Nested waking, dream and stillness circles with a luminous center. | `95895769e218cac9ba656e9c60805712e4de61aff027e76d16e2a5fdc1a1c365` |
| `taittiriya.webp` | 768×768 | 112.7 | Nested lotus-like layers, grain, leaves and inner light. | `723d1ea415bfe3a4829766aeec114cf3995d57d2de64ddcd6b0b88c62314258c` |
| `aitareya.webp` | 768×768 | 114.5 | Solitary contemplation beside a river at dawn. | `65811b287ff49517f4f7041fb55861744ac5729c2346ea4a7fd08771c66dcacc` |
| `chandogya.webp` | 768×768 | 147.6 | Banyan, open seed pod, clay vessel and a quiet river. | `c696d81e8a1327dc3fcc61cd90602755bf1e98d376d30b7cf32e5bc2032b10ec` |
| `brihadaranyaka.webp` | 768×768 | 143.7 | Two philosophers in a spacious ancient forest, lamp between them. | `60367122b40d206d561fa2168e9b07881fd4a19124e6535004111a6500dc4bf9` |
| `shvetashvatara.webp` | 768×768 | 154.9 | Meditator, wheel, mountain, river and warm central sun. | `cefa14a55b61f7b03da5cf54987afd306d715c48567ae1ff0fb20e6438a1b202` |

Integration: `Artwork.tsx` resolves each released work’s short ID and `-upanishad` catalog ID to its own cover; other Upanishads retain the collection illustration until their individual artwork is added. Covers appear in Library, passage/search/saved thumbnails and the reader header. Images are decorative for accessibility; adjacent text supplies the work and reference. No scripture text, source status or retrieval behavior changed.

### Next set: Nrisimha Tapaniya — 2026-10-17

Requested first for the next set. Tool: OpenAI `image_gen.imagegen`. Short prompt: dignified serene lion-faced divine guardian seated in meditation on an ivory lotus; saffron drapery, restrained crown and sun halo; river and mountains; same original indigo/saffron/ivory editorial gouache treatment, no violence, text, external source artwork or artist imitation.

- File: `apps/mobile/assets/art/upanishads/nrisimhatapaniya.webp`, 768×768, 121.2 KB, opaque WebP quality 82.
- SHA-256: `ede73ad553444c1af53a7c6646f8db8bc464138293872cd6b597c817c6e649ea`.
- Canonical work ID `nrisimhatapaniya-upanishad` (and short form `nrisimhatapaniya`) resolves to this cover. This adds artwork only: it does not publish scripture or make an unavailable work appear available. The owner subsequently supplied Claude’s next-set shortlist by screenshot; those 21 covers are recorded in the completed next batch below.

Validation of the first twelve covers: all WebP files decoded; original prompts, export sizes and hashes recorded above. TypeScript, Expo web and Android exports passed. Browser fixture checks at 390×844 confirmed twelve distinct loaded images, 80px reader covers and 36px passage covers in both themes, without page errors or horizontal overflow. Opening a reader now resets the existing list scroll so its image and heading are visible. Fixtures were local layout data, not a scripture publication or provider session.

## Next set from Claude’s progress screenshot — 2026-10-17

[Preview the current individual-cover collection](all-upanishad-covers-preview.webp). This batch adds the 21 names supplied in the owner’s screenshot: R1’s seven, R8’s seven, R9’s four, and the partly completed Naradaparivrajaka, Paingala and Bhikshuka. Together with the eleven principal covers and Nrisimha Tapaniya, artwork coverage is **33 of the Muktika 108**. This count concerns illustrations, not released scripture content. Other works continue to use the generic Upanishad cover.

Tool: OpenAI `image_gen.imagegen`, one new text-prompted image per work, 2026-10-17. Shared prompt: original dignified symbolic editorial gouache/cut-paper, deep-indigo background and edges, saffron and ivory highlights, large central motif for a 60px thumbnail, no text, glyphs, logos, source artwork, calendar/Gita Press imagery or artist imitation. All are opaque and work in both themes; exported with ImageMagick resize/strip/WebP quality 82. Generated masters retained outside Git.

Paths below are relative to `apps/mobile/assets/art/upanishads/`.

| File | Pixels | KB | Short prompt | SHA-256 |
| --- | --- | ---: | --- | --- |
| `amritabindu.webp` | 768×768 | 72.0 | One luminous ivory-gold drop hovering over a perfectly still indigo pool. | `e50853eb496c2ac8ed5c3d753423056fc625d50759588d10e0179be045e4776b` |
| `hamsa.webp` | 768×768 | 94.2 | One graceful ivory swan moving across a quiet indigo river beneath a small golden sun. | `e3f02c69a1b966f9862f5e7e493eb52df96c80097e2624dbcf1d348e0619ce98` |
| `aruneya.webp` | 768×768 | 148.3 | A dignified adult renunciant at a simple forest threshold, setting down an unused folded cloth beside a stone step before walking toward a quiet dawn. | `4ccdac5d531e21a80afcab723ef601fa1bb9d050214f25322bf26bb80a417133` |
| `paramahamsa.webp` | 768×768 | 69.5 | A solitary ivory swan gliding above soft indigo clouds toward a golden horizon, with a distant still lake below. | `f681163a406498d3e1df7b9c53bfac3993f167e518452d7824006fefc571bd95` |
| `brahma.webp` | 768×768 | 125.7 | A small calm seated adult beside a simple lamp and a loosely coiled thread on a stone platform, beneath a vast luminous circle of sky. | `72da440dd68c61e9275e43ffeb7bc713eb659c9c0acda835ed287e91abd02dd3` |
| `amritanada.webp` | 768×768 | 110.5 | A serene adult contemplative figure beside an ivory conch. | `8702cd41d3376c8aeb81a0c765c3a19eb16e2bc8109eb428275d97345e3cbb90` |
| `atharvashiras.webp` | 768×768 | 147.3 | A simple dignified smooth upright sacred stone on a low pedestal beneath a banyan, gentle crescent moon and restrained sunlit halo behind. | `0c0dbb8a328da36d3b6bde03084f9c4e915b5ab145b33f8959bc20c5aa25f952` |
| `tripuratapini.webp` | 768×768 | 65.3 | Three softly nested lotus terraces with small distinct golden lights and a quiet moon, framed by indigo hills. | `ed7893beeb61224ae520d1ede1368271f479cb615d25584c59909210ff3c8a54` |
| `devi.webp` | 768×768 | 98.7 | A dignified compassionate adult divine mother figure seated on an ivory lotus, simple saffron and ivory drapery, restrained golden halo, one hand gently raised and one holding a lotus. | `a5da252254a5e1ab126b9782f3552c8e9e1b2d4dd0a0f1627f50deefc9535821` |
| `tripura.webp` | 768×768 | 124.3 | Three small luminous stone sanctuaries on three indigo hills linked by one quiet golden path. | `6bc163f77b1d86d1af8e2bbd6301a744acea26de89e6c9139cd846c3489a1cd9` |
| `katharudra.webp` | 768×768 | 123.8 | A dignified adult wandering renunciant beside a simple staff and bowl, a small dying ember on a stone ledge, silent river and vast dawn beyond. | `19be3cbcb20ce8343255560519c2d794ce587b86e1e394249f94065a92d05009` |
| `bhavana.webp` | 768×768 | 121.8 | An architectural lotus garden within a simple ivory stone arch, one small meditating adult at its center. | `90dc31013b95b71afea6ef45449466d44e9d66fd2739e97d158bf6565123c486` |
| `rudrahridaya.webp` | 768×768 | 147.6 | Two interlacing streams of saffron and ivory light meeting in a single lotus-shaped glow, above an indigo river. | `7c896c6ee17f777213024c5657c708d9feac1474473ef9fba1414befe0a55828` |
| `yogakundalini.webp` | 768×768 | 83.7 | A subtle golden ribbon rising around a central lotus stem from a quiet indigo pool toward a small sun, several spacious ivory lotus blossoms along its path. | `3e2f6b62ec03ff16ad625f720bdf6298c6d136b9d321ceab3dc8aa67528bf06e` |
| `tarasara.webp` | 768×768 | 113.9 | A small graceful ivory boat crossing a wide indigo river toward a golden star and dawn shoreline. | `e2d39795aa489b7f0046b13df5ac9b1b8a59ac7a175053c38fa0933874563fda` |
| `panchabrahma.webp` | 768×768 | 79.4 | Five small golden lights arranged around a central ivory lotus, each softly distinct, on a calm indigo pool with a mountain horizon. | `d7bf1c9870641be6187d3755bf13dae09e74bee6ecdb4193c6c549b7bcde270e` |
| `pranagnihotra.webp` | 768×768 | 112.3 | A small warm inner-fire-like lamp beside an ivory bowl of grain, a calm seated adult in the background and subtle flowing breath-like arcs. | `ab4dd9ef4eed14364dcde0e012fe82a33fabe71f743284b358fcd76afa12beeb` |
| `gopalatapaniya.webp` | 768×768 | 146.7 | A respectful serene young adult Krishna with deep indigo complexion, saffron drapery and a restrained peacock-feather crown, holding a simple flute beneath a tree. | `00724a21a5d2ada2f14a31cdb9013866df64b0bbf46fc11adab79d4b1f5c7613` |
| `naradaparivrajaka.webp` | 768×768 | 170.1 | A dignified elder wandering sage carrying a simple veena along a forest path beside a river, saffron robe, quiet dawn and distant mountains. | `1bebda50aa44c21f22109a435e5b89abe336b6b7819939d54252383eb88d93f4` |
| `paingala.webp` | 768×768 | 134.4 | A dignified elder teacher and adult student seated facing one another beside a reflective pool and simple lamp, with a large indigo sky opening into a warm circle of light. | `2123e564bec5535b3e065e21bd7b5b126b2644c49a746994d2983a32932d977b` |
| `bhikshuka.webp` | 768×768 | 153.8 | A dignified solitary mendicant walking quietly along a riverbank, carrying a small simple begging bowl and staff, plain ivory and saffron robes, broad open dawn horizon. | `ce4bbd111c7023e8e3531934d87b0b0891332dc1bc74e54225ff0c28f21755d6` |

The 33 exports total 3.90 MB. Every key matches the existing Muktika catalog ID; no new scripture availability/status, release data or backend flag is introduced.

Validation of the complete set: all 33 exports decoded at 768×768, have distinct SHA-256 values and match canonical IDs in `packages/corpus-schema/upanishads.ts`. Visually checked all covers together and in smaller batches. TypeScript and Expo web/Android exports passed. Chromium fixture checks at 390×844 confirmed 33 distinct loaded covers in both themes, correct reader/passage cover sizes, visible reader header after navigation, no page errors and no document overflow. No provider API or live scripture publication was involved. Native APK installation has not been tested for this artwork-only change.

## Mahanarayana content correction — 2026-10-17

File: `apps/mobile/assets/art/upanishads/mahanarayana.webp`. Tool: OpenAI `image_gen.imagegen`; original generated illustration, exported as 768×768 WebP. Short prompt: Tripadvibhuti-Mahanarayana, crowned four-armed Narayana teaching Brahma, lotus seats and symbolic cosmic radiance; saffron, ivory and indigo; no writing or external reference artwork.

Content basis: [Nirnaya Sagar 1925, printed p.308 / image n324](https://archive.org/download/in.ernet.dli.2015.427659/page/n324_w1600.jpg), inspected directly. The heading names Tripadvibhuti-Mahanarayana; the opening has Brahma ask Mahavishnu about ultimate reality. This illustrates that dialogue symbolically, rather than substituting the similarly named Taittiriya anthology or a generic lotus landscape. Decorative art is not a claim of scripture publication or human textual review.

SHA-256: `77b31dd56fa13747146b9190c1caf0fc6bcd063afeefc84af91e86ecf8473266`.

## Complete Muktika artwork and the two Itihasas — 2026-10-17

Owner requested the remaining 75 Upanishad covers and both Itihasas for future use. [View all 108 Upanishad covers](all-upanishad-covers-preview.webp) and [Ramayana / Mahabharata covers](itihasa-covers-preview.webp). Individual cover artwork now exists for **108/108 Muktika Upanishads**, plus Valmiki Ramayana and Mahabharata. This is artwork coverage only; publication, rights/review status and retrieval availability of scripture are unchanged.

Tool: OpenAI `image_gen.imagegen`, one newly generated text-prompted master per work, 2026-10-17. Common direction: dignified original editorial gouache/cut-paper, deep indigo edges/background, saffron and ivory, clear central motif at thumbnail size, subtle paper grain, no writing, glyphs, logos, copied source artwork, calendar/Gita Press imagery or artist imitation. Scenes are symbolic decorative interpretations, not source evidence or literal reconstructions. No external reference image was supplied. Generated masters remain outside Git; exports use ImageMagick resizing, metadata stripping and opaque WebP quality 82. The indigo edges work on light and dark surfaces without duplicate theme files.

Mahanarayana was revised after inspecting the 1925 Nirnaya Sagar edition, [printed p.308 / image n324](https://archive.org/download/in.ernet.dli.2015.427659/page/n324_w1600.jpg). Its heading identifies Tripadvibhuti-Mahanarayana and its opening has Brahma asking Mahavishnu about ultimate reality. The cover depicts that dialogue symbolically. Narayana was separately revised to show the deity as the central figure at the owner’s request.

The following 77 files were added in this final batch. Paths are relative to `apps/mobile/assets/art/`.

| File | Pixels | KB | Short prompt | SHA-256 |
| --- | --- | ---: | --- | --- |
| `upanishads/kaivalya.webp` | 768×768 | 54.8 | A solitary ivory lotus opening above a still indigo lake, a single clear golden dawn and distant empty mountain. | `0d60db09d146719fe4f6ea822ca9aa2a7f74b654ddb8a09cfd0fb11bfe7c932d` |
| `upanishads/jabala.webp` | 768×768 | 148.2 | A dignified wandering adult sage resting beside a river confluence and an empty simple staff, a small stone hermitage beneath trees. | `c8a80154201d20c7a3e91395087bab0bbfebe4fda56249e1bff04e4a63fef969` |
| `upanishads/garbha.webp` | 768×768 | 90.1 | An ivory lotus bud cradled inside a luminous protective golden oval, surrounded by gentle water and leaves. | `95c2072cb63a954d9d8934ddf11b0ca64d8cbb75d355e455304b86cdd8eac105` |
| `upanishads/narayana.webp` | 768×768 | 116.1 | Replace the central floating conch-only motif in this ORIGINAL Pramana cover with a respectful dignified humanoid depiction of Lord Narayana/Vishnu himself, the central subject clearly a serene adult male divine figure with blue complexion, golden crown, saffron and ivory garments, seated gracefully on an ivory lotus above the ocean. Four well-proportioned arms, four clearly separated natural hands. | `46a1d55c56c5c6b5dc27c43208dc0a33c2b3ac88dfd6172bbe8450674d49bc68` |
| `upanishads/atharvashikha.webp` | 768×768 | 64.6 | A quiet vertical golden flame rising above a small ivory lotus under a crescent moon, subtle luminous arcs suggesting inward sound, no glyphs. | `f29bd9c3946c9ccc57c2b7d1cd39d24d1517f7295554c493fb7643966acb4864` |
| `upanishads/maitrayaniya.webp` | 768×768 | 128.5 | A seated adult contemplative beside an ancient wheeled chariot reflected in a still lake, saffron light opening above indigo hills. | `dcf0dd08c3d46c6d8de3cb22e2b7efa2d0e6479987dec594ddc10785a90f7bc5` |
| `upanishads/kaushitaki.webp` | 768×768 | 121.5 | An adult traveler at a luminous simple stone doorway between a dark forest and a radiant dawn sky. | `1be3a426f957ba4366154f423a6892a7049c676589c0bd8ebb5d44fe43252ae0` |
| `upanishads/brihajjabala.webp` | 768×768 | 154.8 | A low sacred stone platform beside a small ivory bowl of pale ash and a plain meditation seat beneath a tree. | `007570c22d211cac675128aca36e6e31221ce576f026b67666c275f06dc9ab30` |
| `upanishads/kalagnirudra.webp` | 768×768 | 65.2 | A dignified dark sacred stone framed by three soft horizontal bands of warm light, a small gentle flame below and crescent moon above. | `eb1c8b86bbfa6cec18611231b6c3c0654f404b908d409a3b7d03745b7eb7560e` |
| `upanishads/maitreya.webp` | 768×768 | 139.0 | Two adult philosophers seated on opposite banks of a narrow still stream beneath a broad tree, a tiny lamp reflected between them. | `f75c83e6c91f4a75aace8468ed360add304cb50b5bef41514c320dfa721a9db5` |
| `upanishads/subala.webp` | 768×768 | 128.5 | A small ivory seed unfolding into a golden branching tree beneath a spacious indigo cosmos, reflections in still water. | `cf93e337f022203b4073702e95f05b4173ed16c59386f311b51f4c3cde3c339f` |
| `upanishads/kshurika.webp` | 768×768 | 67.8 | A very fine single ivory ray of light separating a veil of indigo mist above a closed lotus, a calm seated adult far below. | `2fa8955216ccb6058e4e594a7b20471d00ac24298c0f93ae69ad64686bdcc7fa` |
| `upanishads/mantrika.webp` | 768×768 | 64.3 | A restrained ivory conch suspended above concentric golden ripples in a pool, soft indigo mist and a single small star. | `b3064359a309152ca9acd43a0ee6745880a4163faa5f4f1e8530e35b0847c8df` |
| `upanishads/sarvasara.webp` | 768×768 | 123.8 | Several small river channels converging into a single luminous still pool with an ivory lotus at its center. | `9e9aed77339cb98711ffd6ea45e375df08ecb131fb5d2c9ff15149d4039eca85` |
| `upanishads/niralamba.webp` | 768×768 | 57.1 | One small golden light floating freely above an endless indigo horizon, no pedestal or support, delicate ivory clouds below. | `4bfa90ff81327157ae4367a4df05ed3231109347e9c168dbbdf64096b6ef37f7` |
| `upanishads/shukarahasya.webp` | 768×768 | 128.1 | A graceful green-and-gold parrot resting beside an unmarked closed ivory manuscript in a quiet grove, a subtle glow of dawn. | `56589876ce86d4401853e47b60415188f187722d53909379356a389c95e32170` |
| `upanishads/vajrasuchi.webp` | 768×768 | 81.6 | A slim brilliant ivory needle-like beam piercing a soft indigo cloud above an open stone threshold, a calm golden horizon beyond. | `9125e629ece0e2669a59115242d17c18886ece8d21373832526fddcd64a8be3c` |
| `upanishads/tejobindu.webp` | 768×768 | 98.6 | A single intensely luminous golden point above a dark reflective pool, soft ivory rays opening into a wide indigo sky. | `179c1934591d6321e30d1f5c645057157c7d25359f28715b919534c518c90bca` |
| `upanishads/nadabindu.webp` | 768×768 | 100.3 | A small ivory conch beside a pool with golden circular sound-like ripples gathering around one luminous point. | `b407a275524007a9cff0ae6ddccb3684cd34f6a08ee79a21fa36d812ddb4c620` |
| `upanishads/dhyanabindu.webp` | 768×768 | 99.0 | A calm adult seated in meditation inside one large soft golden circle, a small ivory lotus and still river below. | `31c67da14c14771a1e092b330dabe4681a69886b87ff76b0ad0f4c42cbf9d62f` |
| `upanishads/brahmavidya.webp` | 768×768 | 92.7 | An open unmarked ivory manuscript and a small golden lamp beneath a spacious indigo sky, a distant seated adult silhouetted beside the river. | `96e80e5ca3c0ddc00dfbc8275ed075b76926f5d3fb6bb94ad91567a749aa4d03` |
| `upanishads/yogatattva.webp` | 768×768 | 125.2 | A steady adult seated in simple meditation on a low stone beside a river, a balanced golden arch of light and one ivory lotus. | `1c33f89b080b13f35c92bc6b0e898e01dd07a1d9a825d201177fb4d241288ec2` |
| `upanishads/atmabodha.webp` | 768×768 | 111.6 | An adult contemplative looking into a still pool that reflects a small golden sun within an ivory ring. | `418c48232d9400593113817d4110fb2342d78605f5eedb9e5c5cd77422ef06c5` |
| `upanishads/trishikhibrahmana.webp` | 768×768 | 88.0 | Three gentle golden flames above one ivory altar-like stone, a meditating adult in the distance and an indigo mountain horizon. | `7b973b27409494178a5108a9ed3abdc18ee5bef6ead4c0c4716ffb9f760c0b5b` |
| `upanishads/sita.webp` | 768×768 | 138.9 | A dignified adult queen in plain saffron and ivory drapery seated beside a fertile garden furrow, holding a small lotus, trees and a golden earth-lit dawn. | `4d8e89f9ab2c6d85576f0a0e340cb31eb0f6d9cc689e018342fd963561e198b5` |
| `upanishads/yogachudamani.webp` | 768×768 | 77.8 | A small luminous golden jewel above an ivory lotus and a calm seated adult, rising mountain silhouette and deep indigo sky. | `410bdf6cf9c039b2489b293ee6f6771d5d899b3a19bfb3dd683d6c896864711b` |
| `upanishads/nirvana.webp` | 768×768 | 78.7 | A small ivory lamp on a stone ledge beside an utterly still indigo lake, its warm light blending gently into a spacious dawn. | `54395ec217835be8bdb48dfe5ddda6fe15ffa2b3f9144099273fe3b11baae6c6` |
| `upanishads/mandalabrahmana.webp` | 768×768 | 99.4 | A balanced circular terraced garden surrounding a tiny golden lamp on an ivory stone island, an adult seated quietly at the edge. | `fedf5a7eabd78b445926fd39b8eedb69e96698db177d8d7252e2bb0caf8bad71` |
| `upanishads/dakshinamurti.webp` | 768×768 | 142.3 | A dignified youthful adult teacher seated beneath an ancient banyan, one hand in a gentle teaching gesture, a few adult listeners and an ivory manuscript. | `62c951a98ecc946ee745c67fcb394d4cc01e294b9149fe344e8055c4a4e80883` |
| `upanishads/sharabha.webp` | 768×768 | 137.4 | An original dignified stylized winged-lion guardian carved in ivory stone at a quiet mountain sanctuary gate, warm golden halo and indigo clouds. | `39b3af36162727633442e6c2b520d63d0612d9f3727450100dc50a9198fd9358` |
| `upanishads/skanda.webp` | 768×768 | 113.2 | A dignified adult youthful divine figure in saffron beside a graceful peacock, a ceremonial spear resting upright at the side, tranquil mountain dawn. | `a1edaa474e7d6cb30c2aeb6986421214886903ff74eff63bd6db4ca47e7889db` |
| `upanishads/mahanarayana.webp` | 768×768 | 166.9 | Create an original square Upanishad book cover for Pramana: Tripadvibhuti-Mahanarayana Upanishad. Content-based scene: dignified blue-skinned four-armed Mahavishnu/Narayana, crowned, seated centrally on an ivory lotus in a luminous transcendent realm, teaching a smaller reverent four-faced Brahma seated facing him in the foreground. Brahma's faces are tastefully suggested in profile, not grotesque. Narayana holds chakra and conch. | `77b31dd56fa13747146b9190c1caf0fc6bcd063afeefc84af91e86ecf8473266` |
| `upanishads/advayataraka.webp` | 768×768 | 62.0 | Two subtle ivory arcs converging on one golden guiding star above a tranquil indigo river, a small calm seated adult below. | `4df92ce8b3eeefb6d5f0f2e7b7e261e82f122d6e6b691d6df71c04a33573020d` |
| `upanishads/ramarahasya.webp` | 768×768 | 142.0 | An elegantly curved unstrung golden bow resting beside an ivory lotus on a simple forest stone, a quiet hidden golden glow among trees. | `b8cfc36ecabba621535e9868ef257a70a154b165f4897a8623cf2f7900fff2cb` |
| `upanishads/ramatapaniya.webp` | 768×768 | 146.0 | A dignified adult Rama seated in contemplation, saffron robe, restrained crown, a simple bow resting safely beside him, ivory lotus and quiet forest river. | `7c0a0ed39857210ae0f47f592fd388bb1aeeba7fa381ef1fea4faac51477d01a` |
| `upanishads/vasudeva.webp` | 768×768 | 101.8 | A serene adult divine figure with deep indigo complexion and simple saffron drapery standing beside a still pool, small ivory conch and golden sun reflected below. | `10bee22f2a3a7cc66db621048ace1999bc5ae44d387dc847ddb068ab72ac821d` |
| `upanishads/mudgala.webp` | 768×768 | 129.7 | A small golden seed on a wide ivory stone giving rise to a luminous many-branched tree, vast indigo sky and calm water. | `7531ff20e9354b0c6db0da1a7e86e1a0ee8e8bb8ecb637dd33626142be7b1774` |
| `upanishads/shandilya.webp` | 768×768 | 150.1 | A dignified elder teacher and adult student at a quiet forest hermitage, a small ivory lotus and lamp between them, sunlit river beyond. | `aa0629c7883bc71b78f88f069568e152c059d28109c8fb40e5820798d4ae3f41` |
| `upanishads/maha.webp` | 768×768 | 154.2 | A wide circle of different small trees around one warm golden lamp beside a shared river, an unmarked ivory manuscript in the foreground. | `14f4498d3b705d3fd436a227ac7dc8e6223faa629edf81ce0d1db89dea0e6eb3` |
| `upanishads/shariraka.webp` | 768×768 | 79.2 | A calm adult human silhouette seated within a transparent-looking ivory leaf-shaped glow, surrounded by a few water, earth and flame motifs. | `0accb3b857556bb4fe7b0872093bcf84060eb27ae0635a0fe8270aa0fd0f1781` |
| `upanishads/yogashikha.webp` | 768×768 | 62.2 | A subtle rising saffron flame above a seated adult meditator, framed by an ivory lotus and a tall indigo mountain peak. | `fe7b111513ebfd83b3e04384dfa41cd7f721af39aaf9f84859a8e7841afa660c` |
| `upanishads/turiyatitavadhuta.webp` | 768×768 | 122.8 | A solitary dignified adult walking beyond a simple stone arch into a vast open indigo sky lit by a small golden sun, plain ivory cloth. | `597d7af3ae6a15bffcf35c56da39f444e2905fe373bcaeec75a07a2edd7ebeff` |
| `upanishads/sannyasa.webp` | 768×768 | 146.7 | A folded saffron robe, plain staff and small ivory bowl beside a forest path, a quiet hermitage and golden river horizon. | `70dd69890d547bb0596e8381b55a857c7ec893e6f514ae05d5a494ba0c9e723d` |
| `upanishads/paramahamsaparivrajaka.webp` | 768×768 | 109.3 | An ivory swan passing above a wandering adult sage on a river path, saffron dawn and distant indigo hills. | `b1f1b6cded015313dd04cea43af925df2582f76d60ce3901e50c552cd8b40d3a` |
| `upanishads/akshamalika.webp` | 768×768 | 111.3 | A simple loop of luminous golden meditation beads resting on unmarked ivory cloth beside a small lamp, deep indigo river and trees behind. | `dc28073a08f205404fa61b852678d6e0f9d41926d2cba430fb27ed10d68fee8e` |
| `upanishads/avyakta.webp` | 768×768 | 64.4 | Soft indigo mist opening around a faint golden light and the barely suggested outline of an ivory lotus. | `8a788f078dd3e25a59135f07c9c2fe4e876e5408ba0a81a6220d8dbf429051d3` |
| `upanishads/ekakshara.webp` | 768×768 | 49.6 | One pure golden circular light above a small ivory lotus on an indigo lake, abundant negative space, no written syllable, no script. | `d177e3fe89463b8a1d9b8509f237fbd95407d1bb3e541bcc85145ac1bfadeb6f` |
| `upanishads/annapurna.webp` | 768×768 | 141.2 | A dignified compassionate adult divine mother holding an ivory bowl of grain and a simple golden ladle, saffron drapery, restrained halo, peaceful garden. | `28ce637a889b0cadd087768cc2aff2d8fcfa0f21b337b1c8091e06bfdcda6af1` |
| `upanishads/surya.webp` | 768×768 | 90.9 | A radiant golden sun rising above an ivory stone wheel and a quiet indigo ocean, broad simple rays and a small lotus in the foreground. | `decb368fb19f0d2a6a05888c4b02fb000db258894f985aae643123f846bdb1a1` |
| `upanishads/akshi.webp` | 768×768 | 58.7 | A small golden sunrise reflected within an almond-shaped still pool bordered by ivory leaves, indigo hills beyond. | `770d2ca551e9ac4ce980e44221bcf700401396e69be27fe987205df58a914344` |
| `upanishads/adhyatma.webp` | 768×768 | 137.1 | A calm adult inside a simple ivory stone arch, a tiny warm lamp at the center of a quiet circular pool, indigo forest beyond. | `c26b3f9c3f3d0e266da29c40f4afd0bbbe7777d4d544b133a0d581510518847a` |
| `upanishads/kundika.webp` | 768×768 | 140.5 | A simple ivory water vessel and plain wooden staff beside a forest stream, a folded saffron cloth and golden dawn. | `4505afb9e79ed4f3e3450a7f766c908b0801207e0fadae06c5b8baf69e3b754c` |
| `upanishads/savitri.webp` | 768×768 | 101.0 | A golden dawn illuminating two graceful ivory birds above a quiet field and river, a single warm ray reaching a closed lotus. | `e67af852f40c93ef28d1ada082df1eed4c81d4e739afd832fdae9651efd8342b` |
| `upanishads/atma.webp` | 768×768 | 65.6 | An adult seated quietly before a still indigo lake, a single ivory ring enclosing a warm golden reflection at the center. | `c0fc543ea9b88b6efc3bab93fc85bb2026218ba5d16939558d92d5c4dbe2bd9e` |
| `upanishads/pashupatabrahma.webp` | 768×768 | 141.8 | A dignified upright sacred stone beside a gentle ivory bull in a quiet grove, crescent moon, small saffron lamp and distant mountains. | `499f01f8f1afad71bc2149b0e4e6dc77fa1cd904c6b273f87d3a433da9228ed0` |
| `upanishads/parabrahma.webp` | 768×768 | 110.7 | An immense deep-indigo sky opening into one softly luminous ivory-gold center above a nearly invisible horizon. | `98b27fe5aa3dfe578af374f19a0d9b7ff535a54c1242f25efd10f98696b3c6e9` |
| `upanishads/avadhuta.webp` | 768×768 | 106.5 | A dignified wandering adult sage beneath a broad indigo sky, simple plain cloth, open hands and a distant river, small golden horizon. | `ef2dfbdb0ce1689d7893134710ecb0228bb412eb778ca69b948b5585908fde25` |
| `upanishads/bhasmajabala.webp` | 768×768 | 100.3 | A small ivory bowl of pale sacred ash beside three soft horizontal strokes of golden light on an unmarked stone, banyan leaves and quiet dawn. | `eceac78b194fcd98e7858a140880eec4c2661a036963e5d9ff25c165c76af0f2` |
| `upanishads/rudrakshajabala.webp` | 768×768 | 165.4 | A simple necklace of textured brown-gold rudraksha beads beside an ivory lotus on a dark stone, banyan grove and saffron dawn. | `e5aaa735628cd46ec1a7f9fc7461852bdb40d39b8c65b9214c22a3d54fa205fd` |
| `upanishads/ganapati.webp` | 768×768 | 76.6 | A respectful dignified elephant-faced divine figure seated calmly on an ivory lotus, simple saffron drapery, restrained crown, gentle golden halo. | `35eb5e078eeadce0ed6fee824dfa993afd079c74b79258dc0e25b3b097fbbfdd` |
| `upanishads/darshana.webp` | 768×768 | 108.3 | An adult meditator seen through a simple ivory stone arch opening to a wide indigo lake, golden dawn reflected in the water. | `c8fe8f482956dd06584def2913a9880e053b356f2899c52473a062f99cc92462` |
| `upanishads/mahavakya.webp` | 768×768 | 76.0 | A closed unmarked ivory manuscript beneath a vast golden circle reflected in an indigo pool, a tiny seated adult at the water edge. | `4a049f03f8cda58c337c266fe17f3f9e3c4dc54157d1f0c976fdba7047282191` |
| `upanishads/krishna.webp` | 768×768 | 159.6 | A respectful serene adult Krishna with deep-indigo complexion and saffron drapery standing beneath a flowering tree, simple flute, peacock feather and warm river dawn. | `23e2edde3f33eca633d4c81450574e57f80dbe84789f1cb4934edf94825381d7` |
| `upanishads/yajnavalkya.webp` | 768×768 | 149.7 | A dignified elder philosopher with simple ivory beard teaching an adult student beside a forest fire lamp and an unmarked manuscript, indigo canopy and golden dawn. | `ecba1fec10514a58bff208b3ca1915f5a30ca365fb96b7b2eaad0f6fed3beb48` |
| `upanishads/varaha.webp` | 768×768 | 115.4 | A dignified serene boar-faced divine guardian supporting a small luminous earth-like sphere above an ivory lotus, saffron drapery and indigo ocean. | `334235bab326f263fb5583c4a0125b35967f447421204ff87d03c7fc81d69622` |
| `upanishads/shatyayaniya.webp` | 768×768 | 142.5 | An adult renunciant seated beside a plain staff, water vessel and unmarked closed manuscript on a riverbank, broad saffron dawn. | `175d41ae8509ec773f6f79b9dce43cd646b6bbffa41351201f962b4fcde80efc` |
| `upanishads/hayagriva.webp` | 768×768 | 74.1 | A dignified serene horse-faced divine teacher seated on an ivory lotus holding a closed unmarked manuscript, saffron drapery, restrained halo and indigo sky. | `dc8d6410ab2671d33e716e37c44c3026ce353991ed26b4ec5aa2831dd501baf2` |
| `upanishads/dattatreya.webp` | 768×768 | 205.5 | Original square Pramana Dattatreya Upanishad cover. Respectful traditional recognizable Lord Dattatreya as a dignified youthful ascetic deity, THREE distinct serene human heads side by side, SIX anatomically coherent arms, simple saffron drapery, matted hair and bead necklaces. Hands carry a small trident, discus, conch, water pot, rosary and staff, tastefully balanced. One gentle ivory cow behind him and exactly FOUR calm dogs around his feet, no extra animals. Quiet forest grove beside a river, central figure clear at thumbnail scale. Consistent sophisticated gouache/cut-paper illustration with warm saffron, ivory, deep indigo outer edges, golden leaves, subtle paper texture, no writing or letters or text. Original composition, no copying calendar art, Gita Press imagery, existing artwork or living artists. Symbolic devotional cover, not a literal reconstruction. | `f12f0008f9aee3fbdb9d34d835078e2885d788131b66bc40e8b32c3faaa326eb` |
| `upanishads/garuda.webp` | 768×768 | 129.3 | A dignified powerful golden eagle-like celestial bird with wings gently spread above an ivory lotus and indigo ocean, warm sun behind. | `32fca79f75c865317f6063522b9802a8e478a1115211227889a237ff5b7e416b` |
| `upanishads/kalisantarana.webp` | 768×768 | 140.0 | A small group of adult devotees walking calmly beside an indigo river under golden dawn, gentle circular ripples of light around a small ivory lamp. | `46d26bc89dcfd0731c501b4c1375e495495687a4d6e4ed96a238f32c3610e014` |
| `upanishads/jabali.webp` | 768×768 | 133.7 | An elder teacher and adult seeker beside a simple sacred stone, banyan roots and quiet stream, saffron light opening in the indigo grove. | `ea4009154ca66c25ecd83166f64a4bc4757bc76947629e4fabbea4a6d1c38b17` |
| `upanishads/saubhagyalakshmi.webp` | 768×768 | 76.6 | A dignified compassionate adult Lakshmi seated on an ivory lotus, saffron and ivory drapery, restrained golden halo, a few simple golden seeds at her feet. | `265560af79aa2df169bf4b7b6dc77bfa83b4df4fab4474ff78a42dce3b1b5ed2` |
| `upanishads/sarasvatirahasya.webp` | 768×768 | 138.5 | A dignified serene adult Sarasvati seated beside a river holding a simple veena, ivory and saffron drapery, restrained halo, unmarked manuscript nearby. | `6b55a777c83726c2ace3423e2bf49e9bb4e532aa038289c0ada16074577addb8` |
| `upanishads/bahvricha.webp` | 768×768 | 105.1 | A dignified feminine divine silhouette formed by warm light within a large ivory lotus, deep indigo cosmos and a small river below. | `36d3d322ed2fdf5a6ebafab5d5acecd7aeeb421bad07071152d123b6329d3321` |
| `upanishads/muktika.webp` | 768×768 | 152.1 | Two dignified adults, Rama and Hanuman, seated in peaceful dialogue beside a closed unmarked manuscript in a quiet grove, saffron dawn, ivory stone terrace. | `84f9bfb6276e87b6c67e5c4492a008c3c39dd2c21a6c6f9a818e15bf17687ffa` |
| `itihasas/valmiki-ramayana.webp` | 768×768 | 177.4 | A dignified adult Rama and Sita with adult Lakshmana walking calmly through a forest beside a river, Hanuman respectfully seated nearby. | `5db02b1dd9399c2c96af738d819e21db3de6b92afb3a57cdeef74a3ee99c86c9` |
| `itihasas/mahabharata.webp` | 768×768 | 142.1 | An elegant golden chariot with an unstrung bow and an unmarked ivory manuscript in the foreground, two dignified adult figures in quiet dialogue in the distance, wide indigo plain and saffron dawn. | `3609dbf576ff72d901dcfb538278f6177f394512d28709177ca4b6b5bd0dfb30` |

All 110 exports total 12.60 MB. `Artwork.tsx` uses explicit static imports for every canonical Upanishad ID and its short form, plus `valmiki-ramayana`/`ramayana` and `mahabharata`. Images appear through the existing library, passage and reader component. Android thumbnail decoding uses `resizeMethod="resize"`; the mobile reader heading is smaller to accommodate long work names beside artwork. No workflow file or backend flag changed.

Validation (2026-10-17): `npm run typecheck`, `npm run build:web`, and `npm run build:android` passed. Playwright against the web export used metadata-only fixtures: all 110 distinct cover URLs decoded in light and dark modes; canonical and short IDs resolved; Isha, Paramahamsaparivrajaka and Mahabharata reader screens showed the expected header/passage covers without page errors or horizontal overflow. All generated covers were visually inspected in contact sheets; corrected deity covers were inspected individually. This checks artwork integration, not live scripture retrieval, voice, an installed APK or a physical device. The pre-existing Metro `@noble/hashes/crypto.js` export fallback warning remains non-blocking.
