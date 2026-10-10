export function providerFailure(status?: number): string {
  if (status === 401 || status === 403)
    return "Provider authentication or access denied. Check the selected provider API key and project permissions in Settings.";
  if (status === 429)
    return "Provider quota or rate limit reached. Check billing/quota for your API project, or retry later.";
  if (status === 400 || status === 404)
    return "The selected model or requested tools are unavailable for this API project. Choose another supported model in Settings.";
  if (status && status >= 500)
    return "The provider is temporarily unavailable. Retry or choose a configured fallback model.";
  return "The provider connection failed or timed out. Check your network and provider settings, then retry.";
}
export class ProviderRequestError extends Error {
  constructor(public status?: number) {
    super(providerFailure(status));
  }
}
