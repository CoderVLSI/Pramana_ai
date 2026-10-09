import { type Provider, validModel } from "./provider-models";
import { type Profile, VaultError } from "./settings-vault";
import {
  speechMatches,
  speakOpenAI,
  speakGemini,
  type VerifiedAudio,
} from "./voice-providers";
import { ProviderFailure } from "./provider-error";
export { ProviderFailure } from "./provider-error";
export type Speak = (
  provider: Provider,
  key: string,
  model: string,
  script: string,
  timeoutMs: number,
) => Promise<VerifiedAudio>;
export function fallbackChain(profile: Profile) {
  const primary = profile.active_provider;
  const other: Provider = primary === "openai" ? "gemini" : "openai";
  const providers = profile.cross_provider_fallback
    ? [primary, other]
    : [primary];
  return providers.flatMap((provider) => {
    const settings = profile[provider];
    if (!settings.api_key) return [];
    return [...new Set([settings.model, ...(settings.fallback_models || [])])]
      .filter((model) => validModel(provider, model))
      .map((model) => ({ provider, model, key: settings.api_key! }));
  });
}
export async function speakWithFallback(
  profile: Profile,
  script: string,
  speak: Speak = async (provider, key, model, script, timeoutMs) =>
    provider === "openai"
      ? speakOpenAI(key, model, script, timeoutMs)
      : speakGemini(key, model, script, timeoutMs),
) {
  const chain = fallbackChain(profile);
  if (!chain.length)
    throw new VaultError(
      400,
      "Add an API key and select an available model in Settings.",
    );
  const started = Date.now();
  const attempted: { provider: Provider; model: string }[] = [];
  // Maximum 4 requests / 60 seconds. Audio is never delivered until a full script check passes.
  for (const target of chain.slice(0, 4)) {
    const remaining = 60000 - (Date.now() - started);
    if (remaining < 1000) break;
    attempted.push({ provider: target.provider, model: target.model });
    try {
      const result = await speak(
        target.provider,
        target.key,
        target.model,
        script,
        Math.min(20000, remaining),
      );
      if (!speechMatches(script, result.transcript))
        throw new VaultError(
          502,
          "Spoken wording failed verification. Audio was withheld.",
        );
      return {
        ...result,
        fallback_used: attempted.length > 1,
        attempted_models: attempted,
      };
    } catch (error) {
      if (!(error instanceof ProviderFailure) || !error.retryable) throw error;
    }
  }
  throw new VaultError(
    503,
    "The configured voice models are temporarily unavailable. Your text answer is still available.",
  );
}
