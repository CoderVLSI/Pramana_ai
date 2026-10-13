import type { WebResult } from "./web-search";

/** Keyless last resort: Wikipedia's public API returns article summaries with links. */
export async function searchWikipedia(
  query: string,
  request: typeof fetch,
  signal?: AbortSignal,
): Promise<WebResult> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=3" +
    `&gsrsearch=${encodeURIComponent(query.slice(0, 300))}` +
    "&prop=extracts%7Cinfo&inprop=url&exintro=1&explaintext=1&exlimit=max" +
    "&format=json&formatversion=2&origin=*";
  const response = await request(url, {
    headers: { "Api-User-Agent": "PramanaStudyApp/0.2" },
    signal,
  });
  if (!response.ok) throw Error("Wikipedia search unavailable");
  const text = (await response.text()).slice(0, 1024 * 1024);
  const pages: any[] = JSON.parse(text)?.query?.pages ?? [];
  const evidence: { url: string; title: string }[] = [];
  const parts: string[] = [];
  for (const page of pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) {
    try {
      const link = new URL(page.fullurl);
      if (
        link.protocol !== "https:" ||
        !link.hostname.endsWith("wikipedia.org")
      )
        continue;
      const title = String(page.title || "Wikipedia").slice(0, 200);
      evidence.push({ url: link.href, title: `${title} · Wikipedia` });
      if (typeof page.extract === "string" && page.extract.trim())
        parts.push(`${title}: ${page.extract.trim().slice(0, 900)}`);
    } catch {
      /* invalid page link */
    }
  }
  if (!evidence.length) throw Error("No cited sources returned");
  return {
    source_status: "external_web_unverified",
    text: parts.join("\n").slice(0, 5000),
    evidence,
    note: "Wikipedia summaries found without a search key. They are general references, not approved scripture citations.",
  };
}
