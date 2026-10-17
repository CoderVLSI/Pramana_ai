import React from "react";
import {
  Image,
  type ImageStyle,
  type ImageSourcePropType,
  type StyleProp,
} from "react-native";
import { useDarkMode } from "./ui";

const covers = {
  gita: [
    require("./assets/art/cover-bhagavad-gita.webp"),
    require("./assets/art/cover-bhagavad-gita-dark.webp"),
  ],
  upanishads: [
    require("./assets/art/cover-upanishads.webp"),
    require("./assets/art/cover-upanishads-dark.webp"),
  ],
  vedas: [
    require("./assets/art/cover-vedas.webp"),
    require("./assets/art/cover-vedas-dark.webp"),
  ],
  puranas: [
    require("./assets/art/cover-puranas.webp"),
    require("./assets/art/cover-puranas-dark.webp"),
  ],
};
// Individual symbolic covers support both short IDs and full catalog IDs.
const upanishadCovers: Record<string, ImageSourcePropType> = {
  isha: require("./assets/art/upanishads/isha.webp"),
  kena: require("./assets/art/upanishads/kena.webp"),
  katha: require("./assets/art/upanishads/katha.webp"),
  prashna: require("./assets/art/upanishads/prashna.webp"),
  mundaka: require("./assets/art/upanishads/mundaka.webp"),
  mandukya: require("./assets/art/upanishads/mandukya.webp"),
  taittiriya: require("./assets/art/upanishads/taittiriya.webp"),
  aitareya: require("./assets/art/upanishads/aitareya.webp"),
  chandogya: require("./assets/art/upanishads/chandogya.webp"),
  brihadaranyaka: require("./assets/art/upanishads/brihadaranyaka.webp"),
  brahma: require("./assets/art/upanishads/brahma.webp"),
  kaivalya: require("./assets/art/upanishads/kaivalya.webp"),
  jabala: require("./assets/art/upanishads/jabala.webp"),
  shvetashvatara: require("./assets/art/upanishads/shvetashvatara.webp"),
  hamsa: require("./assets/art/upanishads/hamsa.webp"),
  aruneya: require("./assets/art/upanishads/aruneya.webp"),
  garbha: require("./assets/art/upanishads/garbha.webp"),
  narayana: require("./assets/art/upanishads/narayana.webp"),
  paramahamsa: require("./assets/art/upanishads/paramahamsa.webp"),
  amritabindu: require("./assets/art/upanishads/amritabindu.webp"),
  amritanada: require("./assets/art/upanishads/amritanada.webp"),
  atharvashiras: require("./assets/art/upanishads/atharvashiras.webp"),
  atharvashikha: require("./assets/art/upanishads/atharvashikha.webp"),
  maitrayaniya: require("./assets/art/upanishads/maitrayaniya.webp"),
  kaushitaki: require("./assets/art/upanishads/kaushitaki.webp"),
  brihajjabala: require("./assets/art/upanishads/brihajjabala.webp"),
  nrisimhatapaniya: require("./assets/art/upanishads/nrisimhatapaniya.webp"),
  kalagnirudra: require("./assets/art/upanishads/kalagnirudra.webp"),
  maitreya: require("./assets/art/upanishads/maitreya.webp"),
  subala: require("./assets/art/upanishads/subala.webp"),
  kshurika: require("./assets/art/upanishads/kshurika.webp"),
  mantrika: require("./assets/art/upanishads/mantrika.webp"),
  sarvasara: require("./assets/art/upanishads/sarvasara.webp"),
  niralamba: require("./assets/art/upanishads/niralamba.webp"),
  shukarahasya: require("./assets/art/upanishads/shukarahasya.webp"),
  vajrasuchi: require("./assets/art/upanishads/vajrasuchi.webp"),
  tejobindu: require("./assets/art/upanishads/tejobindu.webp"),
  nadabindu: require("./assets/art/upanishads/nadabindu.webp"),
  dhyanabindu: require("./assets/art/upanishads/dhyanabindu.webp"),
  brahmavidya: require("./assets/art/upanishads/brahmavidya.webp"),
  yogatattva: require("./assets/art/upanishads/yogatattva.webp"),
  atmabodha: require("./assets/art/upanishads/atmabodha.webp"),
  naradaparivrajaka: require("./assets/art/upanishads/naradaparivrajaka.webp"),
  trishikhibrahmana: require("./assets/art/upanishads/trishikhibrahmana.webp"),
  sita: require("./assets/art/upanishads/sita.webp"),
  yogachudamani: require("./assets/art/upanishads/yogachudamani.webp"),
  nirvana: require("./assets/art/upanishads/nirvana.webp"),
  mandalabrahmana: require("./assets/art/upanishads/mandalabrahmana.webp"),
  dakshinamurti: require("./assets/art/upanishads/dakshinamurti.webp"),
  sharabha: require("./assets/art/upanishads/sharabha.webp"),
  skanda: require("./assets/art/upanishads/skanda.webp"),
  mahanarayana: require("./assets/art/upanishads/mahanarayana.webp"),
  advayataraka: require("./assets/art/upanishads/advayataraka.webp"),
  ramarahasya: require("./assets/art/upanishads/ramarahasya.webp"),
  ramatapaniya: require("./assets/art/upanishads/ramatapaniya.webp"),
  vasudeva: require("./assets/art/upanishads/vasudeva.webp"),
  mudgala: require("./assets/art/upanishads/mudgala.webp"),
  shandilya: require("./assets/art/upanishads/shandilya.webp"),
  paingala: require("./assets/art/upanishads/paingala.webp"),
  bhikshuka: require("./assets/art/upanishads/bhikshuka.webp"),
  maha: require("./assets/art/upanishads/maha.webp"),
  shariraka: require("./assets/art/upanishads/shariraka.webp"),
  yogashikha: require("./assets/art/upanishads/yogashikha.webp"),
  turiyatitavadhuta: require("./assets/art/upanishads/turiyatitavadhuta.webp"),
  sannyasa: require("./assets/art/upanishads/sannyasa.webp"),
  paramahamsaparivrajaka: require("./assets/art/upanishads/paramahamsaparivrajaka.webp"),
  akshamalika: require("./assets/art/upanishads/akshamalika.webp"),
  avyakta: require("./assets/art/upanishads/avyakta.webp"),
  ekakshara: require("./assets/art/upanishads/ekakshara.webp"),
  annapurna: require("./assets/art/upanishads/annapurna.webp"),
  surya: require("./assets/art/upanishads/surya.webp"),
  akshi: require("./assets/art/upanishads/akshi.webp"),
  adhyatma: require("./assets/art/upanishads/adhyatma.webp"),
  kundika: require("./assets/art/upanishads/kundika.webp"),
  savitri: require("./assets/art/upanishads/savitri.webp"),
  atma: require("./assets/art/upanishads/atma.webp"),
  pashupatabrahma: require("./assets/art/upanishads/pashupatabrahma.webp"),
  parabrahma: require("./assets/art/upanishads/parabrahma.webp"),
  avadhuta: require("./assets/art/upanishads/avadhuta.webp"),
  tripuratapini: require("./assets/art/upanishads/tripuratapini.webp"),
  devi: require("./assets/art/upanishads/devi.webp"),
  tripura: require("./assets/art/upanishads/tripura.webp"),
  katharudra: require("./assets/art/upanishads/katharudra.webp"),
  bhavana: require("./assets/art/upanishads/bhavana.webp"),
  rudrahridaya: require("./assets/art/upanishads/rudrahridaya.webp"),
  yogakundalini: require("./assets/art/upanishads/yogakundalini.webp"),
  bhasmajabala: require("./assets/art/upanishads/bhasmajabala.webp"),
  rudrakshajabala: require("./assets/art/upanishads/rudrakshajabala.webp"),
  ganapati: require("./assets/art/upanishads/ganapati.webp"),
  darshana: require("./assets/art/upanishads/darshana.webp"),
  tarasara: require("./assets/art/upanishads/tarasara.webp"),
  mahavakya: require("./assets/art/upanishads/mahavakya.webp"),
  panchabrahma: require("./assets/art/upanishads/panchabrahma.webp"),
  pranagnihotra: require("./assets/art/upanishads/pranagnihotra.webp"),
  gopalatapaniya: require("./assets/art/upanishads/gopalatapaniya.webp"),
  krishna: require("./assets/art/upanishads/krishna.webp"),
  yajnavalkya: require("./assets/art/upanishads/yajnavalkya.webp"),
  varaha: require("./assets/art/upanishads/varaha.webp"),
  shatyayaniya: require("./assets/art/upanishads/shatyayaniya.webp"),
  hayagriva: require("./assets/art/upanishads/hayagriva.webp"),
  dattatreya: require("./assets/art/upanishads/dattatreya.webp"),
  garuda: require("./assets/art/upanishads/garuda.webp"),
  kalisantarana: require("./assets/art/upanishads/kalisantarana.webp"),
  jabali: require("./assets/art/upanishads/jabali.webp"),
  saubhagyalakshmi: require("./assets/art/upanishads/saubhagyalakshmi.webp"),
  sarasvatirahasya: require("./assets/art/upanishads/sarasvatirahasya.webp"),
  bahvricha: require("./assets/art/upanishads/bahvricha.webp"),
  muktika: require("./assets/art/upanishads/muktika.webp"),
};
const itihasaCovers: Record<string, ImageSourcePropType> = {
  "valmiki-ramayana": require("./assets/art/itihasas/valmiki-ramayana.webp"),
  ramayana: require("./assets/art/itihasas/valmiki-ramayana.webp"),
  mahabharata: require("./assets/art/itihasas/mahabharata.webp"),
};
const upanishads = new Set(Object.keys(upanishadCovers));

/** Decorative artwork only: collection identity and source status stay in text. */
export function CollectionArtwork({
  work,
  size = 60,
}: {
  work: string;
  size?: number;
}) {
  const dark = useDarkMode();
  const individualCover =
    itihasaCovers[work.toLowerCase()] ??
    upanishadCovers[work.toLowerCase().replace(/-upanishad$/, "")];
  const kind =
    work === "bhagavad-gita"
      ? "gita"
      : upanishads.has(work) || work.includes("upanishad")
        ? "upanishads"
        : work.includes("purana")
          ? "puranas"
          : /^(rig|sama|yajur|atharva)-?veda/.test(work)
            ? "vedas"
            : null;
  if (!individualCover && !kind) return null;
  return (
    <Image
      source={individualCover ?? covers[kind!][dark ? 1 : 0]}
      accessible={false}
      resizeMethod="resize"
      style={{ width: size, height: size, borderRadius: 14 }}
    />
  );
}

export function SceneArtwork({
  scene,
  style,
}: {
  scene: "welcome" | "saved" | "verse";
  style?: StyleProp<ImageStyle>;
}) {
  const dark = useDarkMode();
  const source =
    scene === "welcome"
      ? require("./assets/art/first-launch.webp")
      : scene === "saved"
        ? require("./assets/art/empty-saved-verses.webp")
        : dark
          ? require("./assets/art/verse-card-strip-dark.webp")
          : require("./assets/art/verse-card-strip.webp");
  return (
    <Image
      source={source}
      accessible={false}
      resizeMode="cover"
      style={style}
    />
  );
}
