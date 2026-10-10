export type Provider = "openai" | "gemini";
export interface VoiceModel {
  id: string;
  label: string;
  recommended: boolean;
  source: string;
  expires_on?: string;
}
export const providerModels: Record<Provider, VoiceModel[]> = {
  openai: [
    {
      id: "gpt-realtime-2.1",
      label: "GPT Realtime 2.1",
      recommended: true,
      source: "https://developers.openai.com/api/docs/models/gpt-realtime-2.1",
    },
    {
      id: "gpt-realtime-2.1-mini",
      label: "GPT Realtime 2.1 Mini",
      recommended: false,
      source:
        "https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini",
    },
    {
      id: "gpt-realtime-2",
      label: "GPT Realtime 2",
      recommended: false,
      source: "https://developers.openai.com/api/docs/models/gpt-realtime-2",
    },
  ],
  gemini: [
    {
      id: "gemini-3.8-live",
      label: "Gemini 3.8 Live",
      recommended: true,
      source: "https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk",
    },
    {
      id: "gemini-3.8-live-extended-thinking",
      label: "Gemini 3.8 Live · extended thinking",
      recommended: false,
      source: "https://ai.google.dev/gemini-api/docs/deprecations",
    },
    {
      id: "gemini-3.1-flash-live-preview",
      label: "Gemini 3.1 Flash Live · legacy preview",
      recommended: false,
      expires_on: "2026-11-17",
      source: "https://ai.google.dev/gemini-api/docs/deprecations",
    },
  ],
};
export const modelResearchDate = "2026-10-09";
export function validModel(
  provider: Provider,
  model: string,
  now = Date.now(),
) {
  const m = providerModels[provider].find((m) => m.id === model);
  return (
    !!m && (!m.expires_on || now < Date.parse(m.expires_on + "T00:00:00Z"))
  );
}
export function defaultModel(provider: Provider) {
  return providerModels[provider][0].id;
}
export function defaultFallbacks(provider: Provider) {
  return providerModels[provider]
    .slice(1)
    .map((m) => m.id)
    .filter((m) => validModel(provider, m));
}
