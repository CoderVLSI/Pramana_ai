/** Official provider pages. Neither provider exposes a credit-balance API for ordinary
 * API keys, so the app links to their dashboards instead of showing a balance. */
export type LinkedProvider = "openai" | "gemini";
export const providerLinks: Record<
  LinkedProvider,
  { name: string; getKey: string; billing: string; usage: string }
> = {
  openai: {
    name: "OpenAI",
    getKey: "https://platform.openai.com/api-keys",
    billing:
      "https://platform.openai.com/settings/organization/billing/overview",
    usage: "https://platform.openai.com/usage",
  },
  gemini: {
    name: "Google Gemini",
    getKey: "https://aistudio.google.com/apikey",
    billing: "https://ai.google.dev/gemini-api/docs/billing",
    usage: "https://aistudio.google.com/usage",
  },
};
/** True for the quota, billing and key problems a person can fix on the provider's site. */
export function needsProviderAccount(message: string): boolean {
  return /quota|rate limit|billing|authentication|access denied|API key/i.test(
    message,
  );
}
/** Optional independent web-search provider. */
export const tavilyLinks = {
  getKey: "https://app.tavily.com",
  usage: "https://app.tavily.com",
};
