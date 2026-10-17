import React from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
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
const upanishads = new Set([
  "isha",
  "kena",
  "katha",
  "prashna",
  "mundaka",
  "mandukya",
  "taittiriya",
  "aitareya",
  "chandogya",
  "brihadaranyaka",
  "shvetashvatara",
]);

/** Decorative artwork only: collection identity and source status stay in text. */
export function CollectionArtwork({
  work,
  size = 60,
}: {
  work: string;
  size?: number;
}) {
  const dark = useDarkMode();
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
  if (!kind) return null;
  return (
    <Image
      source={covers[kind][dark ? 1 : 0]}
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
