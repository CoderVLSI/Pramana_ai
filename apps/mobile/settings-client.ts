import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
const TOKEN_KEY = "pramana.settings.session.v1";
export type Provider = "openai" | "gemini";
export interface PublicProfile {
  active_provider: Provider;
  cross_provider_fallback: boolean;
  openai: { model: string; configured: boolean; fallback_models: string[] };
  gemini: { model: string; configured: boolean; fallback_models: string[] };
}
export interface Model {
  id: string;
  label: string;
  recommended: boolean;
  source: string;
  expires_on?: string;
}
export interface Catalog {
  models: Record<Provider, Model[]>;
  researched_on: string;
  voice_ready: boolean;
  reason: string;
}
let tokenPromise: Promise<string> | undefined;
async function raw(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
  timeoutMs = 12000,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(API + path, {
      signal: controller.signal,
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Settings request failed.");
    return data;
  } finally {
    clearTimeout(timer);
  }
}
async function readToken() {
  return Platform.OS === "web"
    ? localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
    : SecureStore.getItemAsync(TOKEN_KEY);
}
async function storeToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
async function removeToken() {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } else await SecureStore.deleteItemAsync(TOKEN_KEY);
}
async function settingsToken() {
  if (!tokenPromise)
    tokenPromise = (async () => {
      let token = await readToken();
      if (!token) {
        token = (await raw("/v1/settings/session", "POST")).token;
        await storeToken(token!);
      }
      if (Platform.OS === "web") await storeToken(token!);
      return token!;
    })().catch((e) => {
      tokenPromise = undefined;
      throw e;
    });
  return tokenPromise;
}
export const loadCatalog = (): Promise<Catalog> => raw("/v1/voice/models");
export const loadSettings = async (): Promise<PublicProfile> =>
  raw("/v1/settings", "GET", undefined, await settingsToken());
export const saveSettings = async (body: {
  provider: Provider;
  model: string;
  api_key?: string;
  remove_key?: boolean;
  fallback_models: string[];
  cross_provider_fallback: boolean;
}): Promise<PublicProfile> =>
  raw("/v1/settings", "PUT", body, await settingsToken());
export const testSettings = async (
  provider: Provider,
): Promise<{ message: string }> =>
  raw("/v1/settings/test", "POST", { provider }, await settingsToken());
export async function disconnectSettings() {
  await raw("/v1/settings/session", "DELETE", undefined, await settingsToken());
  await removeToken();
  tokenPromise = undefined;
}
export async function resetSettingsSession() {
  await removeToken();
  tokenPromise = undefined;
}

export interface AppConversation {
  kind: "app_conversation";
  message: string;
  provider?: Provider;
  model?: string;
  connection_status: "connected" | "not_configured" | "failed";
  note?: string;
}
export const requestAppConversation = async (
  query: string,
  preferredName?: string,
): Promise<AppConversation> =>
  raw(
    "/v1/chat",
    "POST",
    { query, ...(preferredName ? { preferred_name: preferredName } : {}) },
    await settingsToken(),
  );

export interface VoiceTurn {
  kind: "app_conversation" | "verified_scripture" | "source_status";
  text: string;
  answer?: import("../../packages/citation-schema").Answer;
  provider: Provider;
  audio: null | {
    audio_base64: string;
    mime_type: "audio/wav";
    transcript: string;
    provider: Provider;
    model: string;
    fallback_used: boolean;
  };
  note?: string;
}
export const requestVoiceTurn = async (body: {
  query: string;
  preferred_name?: string;
  work_ids: string[];
}): Promise<VoiceTurn> =>
  raw("/v1/voice/turn", "POST", body, await settingsToken(), 75000);

/** Credentials stay out of URLs and are sent only in the authenticated socket's first frame. */
export async function liveSessionCredentials(): Promise<{
  url: string;
  token: string;
}> {
  const endpoint = new URL(API);
  endpoint.pathname = "/v1/live";
  endpoint.search = "";
  endpoint.hash = "";
  endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
  return { url: endpoint.toString(), token: await settingsToken() };
}
