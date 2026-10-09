import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import {
  defaultModel,
  defaultFallbacks,
  type Provider,
} from "./provider-models";
export interface Profile {
  active_provider: Provider;
  cross_provider_fallback: boolean;
  openai: { api_key?: string; model: string; fallback_models: string[] };
  gemini: { api_key?: string; model: string; fallback_models: string[] };
}
export class VaultError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export class SettingsVault {
  private key!: Buffer;
  private queue = Promise.resolve();
  constructor(
    private directory: string,
    private suppliedKey?: string,
  ) {}
  async init() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    if (this.suppliedKey) {
      if (!/^[a-f\d]{64}$/i.test(this.suppliedKey))
        throw new Error(
          "SETTINGS_MASTER_KEY must be 64 hexadecimal characters",
        );
      this.key = Buffer.from(this.suppliedKey, "hex");
      return;
    }
    if (process.env.NODE_ENV === "production")
      throw new Error("Production requires SETTINGS_MASTER_KEY");
    const path = join(this.directory, ".master-key");
    try {
      this.key = await readFile(path);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      this.key = randomBytes(32);
      await writeFile(path, this.key, { mode: 0o600, flag: "wx" });
    }
    if (this.key.length !== 32)
      throw new Error("Invalid settings encryption key");
  }
  private path(token: string) {
    if (!/^[a-f\d]{64}$/.test(token))
      throw new VaultError(401, "Reconnect your settings session.");
    return join(
      this.directory,
      createHash("sha256").update(token).digest("hex") + ".enc",
    );
  }
  async create() {
    if (
      (await readdir(this.directory)).filter((x) => x.endsWith(".enc"))
        .length >= 1000
    )
      throw new VaultError(503, "Settings capacity reached.");
    const token = randomBytes(32).toString("hex");
    await this.write(token, {
      active_provider: "openai",
      cross_provider_fallback: false,
      openai: {
        model: defaultModel("openai"),
        fallback_models: defaultFallbacks("openai"),
      },
      gemini: {
        model: defaultModel("gemini"),
        fallback_models: defaultFallbacks("gemini"),
      },
    });
    return token;
  }
  private async write(token: string, profile: Profile) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(profile), "utf8"),
      cipher.final(),
    ]);
    const payload = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    const file = this.path(token);
    const temp = file + "." + randomBytes(8).toString("hex") + ".tmp";
    await writeFile(temp, payload, { mode: 0o600, flag: "wx" });
    await rename(temp, file);
  }
  async read(token: string): Promise<Profile> {
    let data: Buffer;
    try {
      data = await readFile(this.path(token));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT")
        throw new VaultError(401, "Reconnect your settings session.");
      throw e;
    }
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.key,
        data.subarray(0, 12),
      );
      decipher.setAuthTag(data.subarray(12, 28));
      return JSON.parse(
        Buffer.concat([
          decipher.update(data.subarray(28)),
          decipher.final(),
        ]).toString("utf8"),
      );
    } catch {
      throw new VaultError(503, "Settings could not be decrypted.");
    }
  }
  async update(
    token: string,
    provider: Provider,
    change: {
      model: string;
      api_key?: string;
      remove_key?: boolean;
      fallback_models?: string[];
      cross_provider_fallback?: boolean;
    },
  ) {
    const task = this.queue.then(async () => {
      const profile = await this.read(token);
      profile.active_provider = provider;
      profile[provider].model = change.model;
      if (change.fallback_models)
        profile[provider].fallback_models = change.fallback_models;
      if (change.cross_provider_fallback !== undefined)
        profile.cross_provider_fallback = change.cross_provider_fallback;
      if (change.remove_key) delete profile[provider].api_key;
      else if (change.api_key) profile[provider].api_key = change.api_key;
      await this.write(token, profile);
      return this.publicProfile(profile);
    });
    this.queue = task.then(
      () => {},
      () => {},
    );
    return task;
  }
  publicProfile(profile: Profile) {
    return {
      active_provider: profile.active_provider,
      cross_provider_fallback: profile.cross_provider_fallback ?? false,
      openai: {
        model: profile.openai.model,
        configured: !!profile.openai.api_key,
        fallback_models:
          profile.openai.fallback_models ?? defaultFallbacks("openai"),
      },
      gemini: {
        model: profile.gemini.model,
        configured: !!profile.gemini.api_key,
        fallback_models:
          profile.gemini.fallback_models ?? defaultFallbacks("gemini"),
      },
    };
  }
  async remove(token: string) {
    const task = this.queue.then(() => unlink(this.path(token)));
    this.queue = task.then(
      () => {},
      () => {},
    );
    await task;
  }
}
