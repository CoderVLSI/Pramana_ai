/** Single source of truth for colour. Legacy hex values used across the app are
 * remapped to these roles at render time (see ui.tsx), so every screen follows one palette. */
export type Role =
  | "page"
  | "surface"
  | "surfaceAlt"
  | "line"
  | "ink"
  | "muted"
  | "placeholder"
  | "primary"
  | "onPrimary"
  | "accentText"
  | "accentSoft"
  | "accentSoft2"
  | "saffron"
  | "saffronSoft"
  | "danger"
  | "dangerSoft"
  | "success";

export const palette: Record<"light" | "dark", Record<Role, string>> = {
  light: {
    page: "#FAF8F5",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F0EA",
    line: "#E8E3DA",
    ink: "#1C1917",
    muted: "#6B645B",
    placeholder: "#9A9389",
    primary: "#4338CA",
    onPrimary: "#FFFFFF",
    accentText: "#4338CA",
    accentSoft: "#ECEAFD",
    accentSoft2: "#E2DFFB",
    saffron: "#B45309",
    saffronSoft: "#FEF1DC",
    danger: "#B42318",
    dangerSoft: "#FDECEA",
    success: "#15803D",
  },
  dark: {
    page: "#0F0E13",
    surface: "#17161D",
    surfaceAlt: "#201F29",
    line: "#2D2C38",
    ink: "#F4F1EC",
    muted: "#AEA8A0",
    placeholder: "#8A857D",
    primary: "#6D64E8",
    onPrimary: "#FFFFFF",
    accentText: "#B3AEFF",
    accentSoft: "#25234A",
    accentSoft2: "#2E2B66",
    saffron: "#F3B25B",
    saffronSoft: "#3A2B17",
    danger: "#FF9A8E",
    dangerSoft: "#40201C",
    success: "#6EE7A0",
  },
};

type Slot = "text" | "fill" | "line";
type Entry = Partial<Record<Slot, Role>>;
const entries: [string[], Entry][] = [
  [["#f6f4ee", "#f3f0e6", "#f5f1e7"], { fill: "page", line: "line" }],
  [
    ["#fffefa", "#ffffff", "#fff", "white", "#faf9f4"],
    { fill: "surface", line: "line", text: "onPrimary" },
  ],
  [["#fffdf1", "#c6cda9"], { text: "onPrimary", fill: "surface" }],
  [
    ["#f0f1e9", "#eeefe6", "#edf0e5", "#e5eddf", "#e4ebdd"],
    { fill: "surfaceAlt", line: "line" },
  ],
  [["#e4e5db"], { fill: "surfaceAlt", line: "line" }],
  [["#e0e6d8", "#e3e8dc"], { fill: "accentSoft", line: "line" }],
  [["#cce7d1"], { fill: "accentSoft2", line: "line", text: "accentText" }],
  [
    [
      "#dcded2",
      "#dce2d5",
      "#d8ddd2",
      "#bdc6bc",
      "#abb7a8",
      "#d4d8cb",
      "#d4d8ca",
    ],
    { line: "line", fill: "surfaceAlt" },
  ],
  [
    ["#263d35", "#143d29", "#000", "#000000", "#273c2c"],
    { text: "ink", fill: "primary", line: "line" },
  ],
  [
    [
      "#778179",
      "#526459",
      "#959c92",
      "#4a5b51",
      "#52634f",
      "#52645b",
      "#838b80",
      "#67816c",
    ],
    { text: "muted", line: "line", fill: "surfaceAlt" },
  ],
  [
    ["#315444", "#174c3c", "#185837", "#67977d"],
    { text: "accentText", fill: "primary", line: "primary" },
  ],
  [["#b27e42", "#755019", "#914626"], { text: "saffron", fill: "saffron" }],
  [["#f7e9de"], { fill: "saffronSoft", line: "saffronSoft" }],
  [["#a02f2f"], { text: "danger", fill: "danger", line: "danger" }],
];
const table = new Map<string, Entry>();
for (const [colors, entry] of entries)
  for (const color of colors) table.set(color, entry);

export function themeColor(
  value: string | undefined,
  slot: Slot,
  dark: boolean,
): string | undefined {
  if (!value) return value;
  const role = table.get(value.toLowerCase())?.[slot];
  return role ? palette[dark ? "dark" : "light"][role] : value;
}
export const colors = (dark: boolean) => palette[dark ? "dark" : "light"];
