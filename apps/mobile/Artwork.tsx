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
// Each released work has its own symbolic cover; both catalog ID forms resolve.
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
  shvetashvatara: require("./assets/art/upanishads/shvetashvatara.webp"),
  nrisimhatapaniya: require("./assets/art/upanishads/nrisimhatapaniya.webp"),
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
