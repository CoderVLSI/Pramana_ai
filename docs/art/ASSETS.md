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

[Preview all 33 individual covers](all-upanishad-covers-preview.webp). This batch adds the 21 names supplied in the owner’s screenshot: R1’s seven, R8’s seven, R9’s four, and the partly completed Naradaparivrajaka, Paingala and Bhikshuka. Together with the eleven principal covers and Nrisimha Tapaniya, artwork coverage is **33 of the Muktika 108**. This count concerns illustrations, not released scripture content. Other works continue to use the generic Upanishad cover.

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
