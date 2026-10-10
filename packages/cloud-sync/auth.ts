export type CloudSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
};
export interface SessionStore {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}
export class CloudAuth {
  private pending?: Promise<CloudSession | null>;
  constructor(
    private url: string,
    private key: string,
    private store: SessionStore,
    private fetcher: typeof fetch = fetch,
  ) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      !parsed.hostname.endsWith(".supabase.co") ||
      parsed.origin !== url
    )
      throw Error("Invalid Supabase project URL.");
  }
  private async request(path: string, body: unknown, token?: string) {
    const r = await this.fetcher(`${this.url}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: this.key,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok)
      throw Error(
        r.status === 429
          ? "Too many attempts. Please wait before trying again."
          : "Sign-in request failed. Check your details and email confirmation.",
      );
    return r.status === 204 ? null : r.json();
  }
  private async save(data: any) {
    if (!data?.access_token || !data?.refresh_token || !data?.user?.id)
      throw Error("No valid session returned.");
    const session: CloudSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at:
        data.expires_at || Math.floor(Date.now() / 1000) + data.expires_in,
      user: { id: data.user.id, email: data.user.email },
    };
    await this.store.set(JSON.stringify(session));
    return session;
  }
  async signIn(email: string, password: string) {
    return this.save(
      await this.request("token?grant_type=password", {
        email: email.trim(),
        password,
      }),
    );
  }
  async signUp(email: string, password: string) {
    if (password.length < 8)
      throw Error("Use a password of at least eight characters.");
    const data = await this.request("signup", {
      email: email.trim(),
      password,
    });
    return data?.access_token ? this.save(data) : null;
  }
  session(): Promise<CloudSession | null> {
    if (this.pending) return this.pending;
    this.pending = this.load().finally(() => {
      this.pending = undefined;
    });
    return this.pending;
  }
  private async load() {
    const raw = await this.store.get();
    if (!raw) return null;
    let s: CloudSession;
    try {
      s = JSON.parse(raw);
    } catch {
      await this.store.remove();
      return null;
    }
    if (
      !s?.refresh_token ||
      !s?.access_token ||
      !s?.user?.id ||
      !Number.isFinite(s.expires_at)
    ) {
      await this.store.remove();
      return null;
    }
    if (s.expires_at > Date.now() / 1000 + 60) return s;
    return this.save(
      await this.request("token?grant_type=refresh_token", {
        refresh_token: s.refresh_token,
      }),
    );
  }
  async signOut() {
    const raw = await this.store.get();
    await this.store.remove();
    if (raw) {
      try {
        await this.request(
          "logout?scope=local",
          {},
          JSON.parse(raw).access_token,
        );
      } catch {
        /* Local credentials remain removed even when offline. */
      }
    }
  }
}
