import {
  defaultModel,
  defaultFallbacks,
  validModel,
  type Provider,
} from "./models";
export interface ProviderProfile {
  active_provider: Provider;
  cross_provider_fallback: boolean;
  openai: { api_key?: string; model: string; fallback_models: string[] };
  gemini: { api_key?: string; model: string; fallback_models: string[] };
}
export function emptyProfile(): ProviderProfile {
  return {
    active_provider: "gemini",
    cross_provider_fallback: false,
    openai: {
      model: defaultModel("openai"),
      fallback_models: defaultFallbacks("openai"),
    },
    gemini: {
      model: defaultModel("gemini"),
      fallback_models: defaultFallbacks("gemini"),
    },
  };
}
export function publicProfile(p: ProviderProfile) {
  return {
    active_provider: p.active_provider,
    cross_provider_fallback: p.cross_provider_fallback,
    openai: {
      model: p.openai.model,
      fallback_models: [...p.openai.fallback_models],
      configured: !!p.openai.api_key,
    },
    gemini: {
      model: p.gemini.model,
      fallback_models: [...p.gemini.fallback_models],
      configured: !!p.gemini.api_key,
    },
  };
}
export function fallbackChain(profile: ProviderProfile) {
  const primary = profile.active_provider,
    other: Provider = primary === "openai" ? "gemini" : "openai";
  return (
    profile.cross_provider_fallback ? [primary, other] : [primary]
  ).flatMap((provider) => {
    const settings = profile[provider];
    return settings.api_key
      ? [...new Set([settings.model, ...settings.fallback_models])]
          .filter((model) => validModel(provider, model))
          .map((model) => ({ provider, model, key: settings.api_key! }))
      : [];
  });
}
