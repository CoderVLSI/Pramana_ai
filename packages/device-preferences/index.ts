export type ReadingDisplay = "both" | "original" | "translation";
export type Appearance = "system" | "light" | "dark";
export interface ReadingPreferences {
  appearance: Appearance;
  fontSize: number;
  lineSpacing: number;
  display: ReadingDisplay;
  voiceRate: number;
}
export interface HistoryEntry {
  id: string;
  at: string;
  query: string;
  scope: string;
  text: string;
  evidence: "local" | "web" | "conversation" | "unverified";
  references: string[];
}
export interface BookmarkNote {
  folder: string;
  note: string;
}
export interface ReadingPosition {
  id: string;
  reference: string;
  at: string;
}
export interface UserMemory {
  scratchpad: string;
  useWithAI: boolean;
  approved: { id: string; text: string }[];
  suggestions: { id: string; text: string }[];
}
export interface DevicePreferences {
  reading: ReadingPreferences;
  history: HistoryEntry[];
  notes: Record<string, BookmarkNote>;
  positions: Record<string, ReadingPosition>;
  memory: UserMemory;
}
export const DEFAULT_READING: ReadingPreferences = {
  appearance: "system",
  fontSize: 18,
  lineSpacing: 1.6,
  display: "both",
  voiceRate: 1,
};
export const EMPTY_PREFERENCES: DevicePreferences = {
  reading: DEFAULT_READING,
  history: [],
  notes: {},
  positions: {},
  memory: { scratchpad: "", useWithAI: false, approved: [], suggestions: [] },
};
const clip = (v: unknown, n: number) =>
  typeof v === "string" ? v.slice(0, n) : "";
const bound = (v: unknown, low: number, high: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.max(low, Math.min(high, v))
    : fallback;
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
export function normalizePreferences(raw: unknown): DevicePreferences {
  const v = object(raw),
    r = object(v.reading);
  const history: HistoryEntry[] = [];
  for (const rawEntry of (Array.isArray(v.history) ? v.history : []).slice(
    0,
    50,
  )) {
    const e = object(rawEntry);
    if (
      !clip(e.id, 100) ||
      !clip(e.query, 2000) ||
      !Number.isFinite(Date.parse(clip(e.at, 40)))
    )
      continue;
    history.push({
      id: clip(e.id, 100),
      at: clip(e.at, 40),
      query: clip(e.query, 2000),
      scope: clip(e.scope, 100),
      text: clip(e.text, 12000),
      evidence: ["local", "web", "conversation"].includes(String(e.evidence))
        ? (e.evidence as HistoryEntry["evidence"])
        : "unverified",
      references: (Array.isArray(e.references) ? e.references : [])
        .filter((x): x is string => typeof x === "string")
        .slice(0, 10)
        .map((x) => x.slice(0, 500)),
    });
  }
  const notes: DevicePreferences["notes"] = {},
    positions: DevicePreferences["positions"] = {};
  for (const [id, rawNote] of Object.entries(object(v.notes)).slice(0, 500)) {
    if (id === "__proto__" || id === "constructor" || id === "prototype")
      continue;
    const n = object(rawNote);
    notes[id.slice(0, 200)] = {
      folder: clip(n.folder, 40).trim(),
      note: clip(n.note, 2000),
    };
  }
  for (const [work, rawPosition] of Object.entries(object(v.positions)).slice(
    0,
    200,
  )) {
    if (work === "__proto__" || work === "constructor" || work === "prototype")
      continue;
    const p = object(rawPosition);
    if (clip(p.id, 200))
      positions[work.slice(0, 100)] = {
        id: clip(p.id, 200),
        reference: clip(p.reference, 500),
        at: clip(p.at, 40),
      };
  }
  const memory = object(v.memory);
  const memoryItems = (items: unknown) =>
    (Array.isArray(items) ? items : []).slice(0, 20).flatMap((raw) => {
      const item = object(raw),
        text = clip(item.text, 300).trim();
      return clip(item.id, 100) && text && !containsCredential(text)
        ? [{ id: clip(item.id, 100), text }]
        : [];
    });
  return {
    memory: {
      scratchpad: clip(memory.scratchpad, 6000),
      useWithAI: memory.useWithAI === true,
      approved: memoryItems(memory.approved),
      suggestions: memoryItems(memory.suggestions),
    },
    reading: {
      appearance: ["system", "light", "dark"].includes(String(r.appearance))
        ? (r.appearance as Appearance)
        : "system",
      fontSize: bound(r.fontSize, 14, 30, 18),
      lineSpacing: bound(r.lineSpacing, 1.3, 2, 1.6),
      display: ["both", "original", "translation"].includes(String(r.display))
        ? (r.display as ReadingDisplay)
        : "both",
      voiceRate: bound(r.voiceRate, 0.75, 1.5, 1),
    },
    history,
    notes,
    positions,
  };
}
export function addHistory(
  state: DevicePreferences,
  entry: HistoryEntry,
): DevicePreferences {
  return normalizePreferences({
    ...state,
    history: [entry, ...state.history.filter((e) => e.id !== entry.id)].slice(
      0,
      50,
    ),
  });
}

export function normalizeSourceLanguage(value?: string): string {
  const language = (value || "").toLowerCase();
  return (
    ({ english: "en", hindi: "hi", sanskrit: "sa" } as Record<string, string>)[
      language
    ] || language.split("-")[0]
  );
}

export function containsCredential(text: string): boolean {
  return /(?:\bsk-[a-zA-Z0-9_-]{12,}|AIza[a-zA-Z0-9_-]{20,}|\bbearer\s+[a-zA-Z0-9._-]{12,}|(?:api[ _-]?key|password|secret|token)\s*(?:[:=]|is\b)\s*\S+)/i.test(
    text,
  );
}
export function memorySuggestion(query: string): string | undefined {
  const value = query.trim();
  if (
    !/^(?:remember(?: that)?\s+|please remember(?: that)?\s+|i prefer\s+|i like\s+|i(?: am|'m) studying\s+|i study\s+|call me\s+|my name is\s+)/i.test(
      value,
    )
  )
    return;
  const text = value
    .replace(/^(?:please )?remember(?: that)?\s+/i, "")
    .slice(0, 300)
    .trim();
  return text && !containsCredential(text) ? text : undefined;
}
export function proposeMemory(
  state: DevicePreferences,
  text: string,
): DevicePreferences {
  if (!text.trim() || containsCredential(text)) return state;
  if (
    [...state.memory.approved, ...state.memory.suggestions].some(
      (item) => item.text.toLowerCase() === text.trim().toLowerCase(),
    )
  )
    return state;
  return normalizePreferences({
    ...state,
    memory: {
      ...state.memory,
      suggestions: [
        {
          id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          text: text.trim(),
        },
        ...state.memory.suggestions,
      ].slice(0, 20),
    },
  });
}
export function approvedMemoryContext(state: DevicePreferences): string[] {
  return state.memory.useWithAI
    ? state.memory.approved
        .map((item) => item.text)
        .filter((text) => !containsCredential(text))
        .slice(0, 20)
    : [];
}
