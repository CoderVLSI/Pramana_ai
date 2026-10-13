import { ProviderRequestError, providerReason } from "./provider-error";
import type { WebResult } from "./web-search";

/** Tavily returns LLM-ready snippets with source URLs. Credentials stay in the request header. */
export async function searchTavily(
  key: string,
  query: string,
  request: typeof fetch,
  signal?: AbortSignal,
): Promise<WebResult> {
  const response = await request("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: true,
    }),
  });
  const text = (await response.text().catch(() => "")).slice(0, 1024 * 1024);
  if (!response.ok)
    throw new ProviderRequestError(
      response.status,
      providerReason(text.slice(0, 8000)),
    );
  const data = JSON.parse(text);
  const evidence: { url: string; title: string }[] = [];
  const snippets: string[] = [];
  for (const result of Array.isArray(data.results) ? data.results : []) {
    try {
      const url = new URL(result.url);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.href.length > 2000 ||
        evidence.length >= 8 ||
        evidence.some((e) => e.url === url.href)
      )
        continue;
      const title = String(result.title || "Web source").slice(0, 200);
      evidence.push({ url: url.href, title });
      if (typeof result.content === "string")
        snippets.push(`${title}: ${result.content.slice(0, 600)}`);
    } catch {
      /* invalid result link */
    }
  }
  if (!evidence.length) throw Error("No cited sources returned");
  const summary = typeof data.answer === "string" ? data.answer : "";
  return {
    source_status: "external_web_unverified",
    text: [summary, ...snippets].filter(Boolean).join("\n").slice(0, 5000),
    evidence,
    search_queries: [query.slice(0, 250)],
    note: "External web results are not approved scripture citations.",
  };
}
