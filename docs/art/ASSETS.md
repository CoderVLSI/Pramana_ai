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
- Canonical work ID `nrisimhatapaniya-upanishad` (and short form `nrisimhatapaniya`) resolves to this cover. This adds artwork only: it does not publish scripture or make an unavailable work appear available. The owner subsequently supplied Claude’s next-set shortlist by screenshot; those 21 covers are being generated as a separate batch.

Validation of the first twelve covers: all WebP files decoded; original prompts, export sizes and hashes recorded above. TypeScript, Expo web and Android exports passed. Browser fixture checks at 390×844 confirmed twelve distinct loaded images, 80px reader covers and 36px passage covers in both themes, without page errors or horizontal overflow. Opening a reader now resets the existing list scroll so its image and heading are visible. Fixtures were local layout data, not a scripture publication or provider session.
