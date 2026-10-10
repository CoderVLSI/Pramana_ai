import {
  normalizePreferences,
  containsCredential,
} from "../device-preferences";
const AVATARS = ["Vishnu", "Shiva", "Durga", "Ganesha", "Surya", "Skanda"];
/** Explicit whitelist: never serialize device storage wholesale. */
export function cloudSnapshot(
  profile: Record<string, unknown>,
  preferences: unknown,
  includeMemories = false,
) {
  const prefs = normalizePreferences(preferences);
  const text = (value: unknown, max: number) =>
    typeof value === "string" && !containsCredential(value)
      ? value.trim().slice(0, max)
      : "";
  return {
    schema_version: 1,
    profile: {
      name: text(profile.name, 80),
      avatar: AVATARS.includes(String(profile.avatar))
        ? profile.avatar
        : "Vishnu",
      language: text(profile.language, 40),
      mode: text(profile.mode, 20),
      interests: text(profile.interests, 1000),
      ishtaDevata: text(profile.ishtaDevata, 100),
    },
    reading: prefs.reading,
    approved_memories: includeMemories
      ? prefs.memory.approved.filter((item) => !containsCredential(item.text))
      : [],
  };
}
export class CloudSyncClient {
  private base: string;
  constructor(
    url: string,
    private publishableKey: string,
    private accessToken: string,
  ) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".supabase.co") ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw Error("Use your HTTPS Supabase project URL.");
    if (!publishableKey || !accessToken)
      throw Error("Sign-in is required for cloud sync.");
    this.base = parsed.origin;
  }
  private async request(path: string, method: string, body?: unknown) {
    const response = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        apikey: this.publishableKey,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw Error(
        response.status === 401
          ? "Sign in again to sync."
          : "Cloud sync failed. Your local data is unchanged.",
      );
    return response.status === 204 ||
      response.headers.get("content-length") === "0"
      ? null
      : response.text().then((text) => (text ? JSON.parse(text) : null));
  }
  private id(userId: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userId,
      )
    )
      throw Error("Invalid account ID.");
    return userId;
  }
  upload(
    userId: string,
    profile: Record<string, unknown>,
    prefs: unknown,
    includeMemories = false,
  ) {
    return this.request("/rest/v1/user_settings?on_conflict=user_id", "POST", {
      user_id: this.id(userId),
      ...cloudSnapshot(profile, prefs, includeMemories),
    });
  }
  download(userId: string) {
    return this.request(
      `/rest/v1/user_settings?user_id=eq.${this.id(userId)}&select=profile,reading,approved_memories,updated_at,schema_version`,
      "GET",
    );
  }
  deleteBackup(userId: string) {
    return this.request(
      `/rest/v1/user_settings?user_id=eq.${this.id(userId)}`,
      "DELETE",
    );
  }
}
