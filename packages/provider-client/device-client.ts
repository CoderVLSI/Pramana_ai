import type { Answer } from "../citation-schema";
import { generateWelcome } from "./chat";
import {
  defaultModel,
  modelResearchDate,
  providerModels,
  validModel,
  type Provider,
} from "./models";
import { emptyProfile, publicProfile, type ProviderProfile } from "./profile";
import { searchWeb } from "./web-search";

export interface SecretStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}
export interface SettingsUpdate {
  provider: Provider;
  model: string;
  api_key?: string;
  remove_key?: boolean;
  fallback_models: string[];
  cross_provider_fallback: boolean;
}
export function missingLocalAnswer(query: string): Answer {
  return {
    id: "device-source-status",
    query,
    answer: "Not verified in the local scripture collection.",
    support_state: "NOT_VERIFIED",
    claims: [],
    citations: [],
    safe_to_speak: false,
    corpus_release: "device-reviewed-corpus-empty",
    caveats: [
      "No approved scripture collection is installed on this phone. External web results are shown separately; a search miss does not establish absence from scripture.",
    ],
  };
}
/** No key cache: subsequent requests re-read secure storage, including after deletion. */
export class DeviceClient {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: SecretStorage,
    private request: typeof fetch = globalThis.fetch,
  ) {}
  async credentials(): Promise<ProviderProfile> {
    await this.queue;
    const raw = await this.storage.get();
    if (!raw) return emptyProfile();
    try {
      const p = JSON.parse(raw) as ProviderProfile;
      if (
        !["gemini", "openai"].includes(p.active_provider) ||
        typeof p.cross_provider_fallback !== "boolean"
      )
        throw Error();
      for (const provider of ["gemini", "openai"] as const) {
        const s = p[provider];
        if (
          !s ||
          typeof s.model !== "string" ||
          !Array.isArray(s.fallback_models) ||
          s.fallback_models.some((m) => typeof m !== "string") ||
          (s.api_key !== undefined && typeof s.api_key !== "string")
        )
          throw Error();
      }
      return p;
    } catch {
      throw Error(
        "Device connection settings could not be read. Delete connections in Settings and add your key again.",
      );
    }
  }
  async loadSettings() {
    return publicProfile(await this.credentials());
  }
  loadCatalog() {
    return Promise.resolve({
      models: providerModels,
      researched_on: modelResearchDate,
      voice_ready: true,
      reason:
        "Connects directly from this phone. Local scripture collections still require review and installation.",
    });
  }
  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  saveSettings(body: SettingsUpdate) {
    return this.mutate(async () => {
      if (
        !["openai", "gemini"].includes(body.provider) ||
        !validModel(body.provider, body.model) ||
        !Array.isArray(body.fallback_models) ||
        body.fallback_models.length > 5 ||
        body.fallback_models.some((m) => !validModel(body.provider, m)) ||
        typeof body.cross_provider_fallback !== "boolean"
      )
        throw Error("Choose valid provider models in Settings.");
      if (
        body.api_key !== undefined &&
        (!body.api_key.trim() ||
          body.api_key.length > 1024 ||
          /[\s\u0000-\u001f]/.test(body.api_key))
      )
        throw Error("Enter a valid provider key without spaces.");
      const raw = await this.storage.get(),
        p: ProviderProfile = raw ? JSON.parse(raw) : emptyProfile();
      p.active_provider = body.provider;
      p.cross_provider_fallback = body.cross_provider_fallback;
      p[body.provider] = {
        ...p[body.provider],
        model: body.model,
        fallback_models: [...new Set(body.fallback_models)].filter(
          (m) => m !== body.model,
        ),
        ...(body.api_key ? { api_key: body.api_key.trim() } : {}),
      };
      if (body.remove_key) delete p[body.provider].api_key;
      await this.storage.set(JSON.stringify(p));
      return publicProfile(p);
    });
  }
  disconnectSettings() {
    return this.mutate(() => this.storage.remove());
  }
  async testSettings(provider: Provider) {
    const p = await this.credentials(),
      key = p[provider].api_key;
    if (!key) throw Error("Save your API key first.");
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await this.request(
        provider === "gemini"
          ? "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000"
          : "https://api.openai.com/v1/models",
        {
          headers:
            provider === "gemini"
              ? { "x-goog-api-key": key }
              : { Authorization: `Bearer ${key}` },
          signal: controller.signal,
        },
      );
      if (!response.ok)
        throw Error(
          response.status === 401 || response.status === 403
            ? "The provider rejected this key. Check your key and project access."
            : response.status === 429
              ? "Provider quota or rate limit reached. Check billing or try later."
              : "The provider connection check failed.",
        );
      const listing = await response.json();
      const models: string[] =
        provider === "gemini"
          ? (listing.models ?? []).map((m: any) =>
              String(m.name).replace(/^models\//, ""),
            )
          : (listing.data ?? []).map((m: any) => m.id);
      return {
        message: models.includes(p[provider].model)
          ? "Connected directly from this phone. Selected model is listed; start Live to check voice access."
          : "Key accepted by the provider. The selected live model was not listed; text access and live voice access can differ.",
      };
    } catch (e) {
      if (controller.signal.aborted)
        throw Error("Provider connection timed out. Try again.");
      // Never surface fetch/provider error objects containing request credentials.
      if (
        e instanceof Error &&
        /^(The provider|Provider quota|Save your)/.test(e.message)
      )
        throw e;
      throw Error(
        "Could not reach the provider. Check your internet connection.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async conversation(query: string, name?: string) {
    const p = await this.credentials(),
      provider = p.active_provider;
    const result = await generateWelcome({
      provider,
      key: p[provider].api_key || "",
      query,
      name,
      fetch: this.request,
    });
    return {
      kind: "app_conversation" as const,
      ...result,
      provider,
      connection_status: "connected" as const,
    };
  }
  async study(body: { query: string; work_ids: string[] }) {
    const answer = missingLocalAnswer(body.query),
      p = await this.credentials();
    try {
      return { answer, web: await searchWeb(p, body.query, this.request) };
    } catch {
      return {
        answer,
        web: {
          source_status: "web_unavailable",
          error:
            "Web search could not complete. Check your provider key, model access and quota in Settings.",
        },
      };
    }
  }
  async voiceTurn(
    body: { query: string; preferred_name?: string; work_ids: string[] },
    greeting: boolean,
  ) {
    const provider = (await this.credentials()).active_provider;
    if (greeting) {
      const reply = await this.conversation(body.query, body.preferred_name);
      return {
        kind: "app_conversation" as const,
        text: reply.message,
        provider,
        audio: null,
        note: "Reply uses this phone’s speech voice.",
      };
    }
    const result = await this.study(body);
    return {
      kind:
        result.web.source_status === "external_web_unverified"
          ? ("external_web" as const)
          : ("source_status" as const),
      answer: result.answer,
      web: result.web,
      text: result.web.text
        ? `External web response, not verified scripture. ${result.web.text}`
        : result.answer.answer,
      provider,
      audio: null,
      note: "Reply uses this phone’s speech voice. Web results are separate from verified scripture.",
    };
  }
}
