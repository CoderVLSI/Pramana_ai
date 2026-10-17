import AsyncStorage from "@react-native-async-storage/async-storage";
import { containsCredential } from "../../packages/device-preferences";

export type VoiceChoice = { gemini?: string; openai?: string };
export const VOICES = {
  gemini: [
    ["Charon", "Charon · deep, calm"],
    ["Orus", "Orus · firm, steady"],
    ["Puck", "Puck · bright, upbeat"],
    ["Fenrir", "Fenrir · warm, lively"],
    ["Kore", "Kore · clear, composed"],
    ["Aoede", "Aoede · light, breezy"],
    ["Leda", "Leda · gentle, youthful"],
    ["Zephyr", "Zephyr · soft, easy"],
  ],
  openai: [
    ["marin", "Marin · clear, natural"],
    ["cedar", "Cedar · deep, warm"],
    ["sage", "Sage · calm"],
    ["ash", "Ash · steady"],
    ["coral", "Coral · friendly"],
    ["alloy", "Alloy · neutral"],
    ["echo", "Echo · even"],
    ["verse", "Verse · expressive"],
  ],
} as const;
const VOICE_KEY = "pramana.voice.v1",
  CHATS_KEY = "pramana.chats.v1";
const allowed = (kind: "gemini" | "openai", value: unknown) =>
  VOICES[kind].find(([id]) => id === value)?.[0];

export async function loadVoice(): Promise<VoiceChoice> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(VOICE_KEY)) || "{}");
    return { gemini: allowed("gemini", raw.gemini), openai: allowed("openai", raw.openai) };
  } catch {
    return {};
  }
}
export async function saveVoice(voice: VoiceChoice) {
  try {
    await AsyncStorage.setItem(VOICE_KEY, JSON.stringify(voice));
  } catch {
    /* the choice still applies until the app closes */
  }
}

export type ChatLine = { role: string; text: string };
export type SavedChat = { id: string; at: string; title: string; lines: ChatLine[] };
const MAX_CHATS = 30;

export async function loadChats(): Promise<SavedChat[]> {
  try {
    const raw = JSON.parse((await AsyncStorage.getItem(CHATS_KEY)) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c) => c && typeof c.id === "string" && Array.isArray(c.lines))
      .map((c) => ({
        id: String(c.id).slice(0, 60),
        at: String(c.at).slice(0, 40),
        title: String(c.title || "Conversation").slice(0, 80),
        lines: c.lines
          .filter((l: any) => l && typeof l.text === "string")
          .slice(-40)
          .map((l: any) => ({ role: String(l.role).slice(0, 12), text: l.text.slice(0, 6000) })),
      }))
      .slice(0, MAX_CHATS);
  } catch {
    return [];
  }
}
async function writeChats(chats: SavedChat[]) {
  try {
    await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0, MAX_CHATS)));
  } catch {
    /* history is a convenience; the live chat is unaffected */
  }
}
const titleOf = (lines: ChatLine[]) => {
  const first = lines.find((l) => l.role === "You" || l.role === "user")?.text.trim();
  return (first || lines[0]?.text || "Conversation").replace(/\s+/g, " ").slice(0, 60);
};
/** Saves (or updates) one conversation; empty ones and ones holding a key-like secret are skipped. */
export async function saveChat(id: string, lines: ChatLine[]) {
  const kept = lines.filter((l) => l.text.trim() && !containsCredential(l.text));
  if (!kept.length) return;
  const chats = await loadChats();
  const entry = { id, at: new Date().toISOString(), title: titleOf(kept), lines: kept };
  await writeChats([entry, ...chats.filter((c) => c.id !== id)]);
}
export async function deleteChat(id?: string) {
  await writeChats(id ? (await loadChats()).filter((c) => c.id !== id) : []);
}
