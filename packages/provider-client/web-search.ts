import { memoryInstruction } from "./memory";
import type { ProviderProfile } from "./profile";
function concat(chunks: Uint8Array[]) {
  const result = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
async function boundedJSON(response: Response) {
  if (!response.ok) throw Error("Provider unavailable");
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > 1024 * 1024) throw Error("Response exceeds limit");
    return JSON.parse(text);
  }
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > 1024 * 1024) {
      await reader.cancel();
      throw Error("Response exceeds limit");
    }
    chunks.push(chunk.value);
  }
  return JSON.parse(new TextDecoder().decode(concat(chunks)));
}

export interface WebResult {
  source_status: string;
  text?: string;
  evidence?: { url: string; title: string }[];
  search_entry_point?: string;
  search_queries?: string[];
  error?: string;
  note?: string;
}
export async function searchWeb(
  profile: ProviderProfile,
  query: string,
  request: typeof fetch = globalThis.fetch,
  userMemories: string[] = [],
): Promise<WebResult> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    if (!query.trim() || query.length > 2000)
      throw Error("Invalid search query");
    if (profile.active_provider === "gemini") {
      const key = profile.gemini.api_key;
      if (!key)
        return {
          source_status: "web_unavailable",
          error: "Add your Gemini API key in Settings to enable web search.",
        };
      const signal = controller.signal;
      const headers = {
        "x-goog-api-key": key,
        "Content-Type": "application/json",
      };
      const listing = await boundedJSON(
        await request(
          "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
          { headers, signal },
        ),
      );
      const model = (listing.models ?? [])
        .filter(
          (m: any) =>
            typeof m.name === "string" &&
            /^models\/gemini-[a-z0-9.-]+$/.test(m.name) &&
            m.supportedGenerationMethods?.includes("generateContent") &&
            /flash/.test(m.name) &&
            !/live|audio|image|tts|embedding/.test(m.name),
        )
        .sort((a: any, b: any) =>
          b.name.localeCompare(a.name, undefined, { numeric: true }),
        )[0]?.name;
      if (!model)
        return {
          source_status: "web_unavailable",
          error: "No accessible Gemini web-search text model was found.",
        };
      const result = await boundedJSON(
        await request(
          `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent`,
          {
            method: "POST",
            headers,
            signal,
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: query }] }],
              tools: [{ google_search: {} }],
              generationConfig: { maxOutputTokens: 1200 },
              systemInstruction: {
                parts: [
                  {
                    text:
                      "Search the web to answer. Distinguish scripture editions and interpretations. Do not invent verses or claim external results are verified Gita Press passages." +
                      memoryInstruction(userMemories),
                  },
                ],
              },
            }),
          },
        ),
      );
      const candidate = result.candidates?.[0],
        grounding = candidate?.groundingMetadata;
      const evidence: { url: string; title: string }[] = [];
      for (const chunk of grounding?.groundingChunks ?? []) {
        try {
          const url = new URL(chunk.web?.uri);
          if (
            url.protocol === "https:" &&
            !url.username &&
            !url.password &&
            url.href.length <= 2000 &&
            evidence.length < 8 &&
            !evidence.some((e) => e.url === url.href)
          )
            evidence.push({
              url: url.href,
              title: String(chunk.web?.title || "Web source").slice(0, 200),
            });
        } catch {
          /* invalid grounding link */
        }
      }
      if (!grounding?.webSearchQueries?.length || !evidence.length)
        throw Error("No executed grounded search evidence");
      const text = (candidate.content?.parts ?? [])
        .filter((p: any) => typeof p.text === "string")
        .map((p: any) => p.text)
        .join("\n")
        .slice(0, 5000);
      if (!text) throw Error("No web result text");
      return {
        source_status: "external_web_unverified",
        text,
        evidence,
        search_entry_point:
          typeof grounding.searchEntryPoint?.renderedContent === "string" &&
          grounding.searchEntryPoint.renderedContent.length <= 30000
            ? grounding.searchEntryPoint.renderedContent
            : undefined,
        search_queries: grounding.webSearchQueries
          .slice(0, 5)
          .map((q: unknown) => String(q).slice(0, 250)),
        note: "External web results are not approved scripture citations.",
      };
    }
    const key = profile.openai.api_key;
    if (!key)
      return {
        source_status: "web_unavailable",
        error:
          "OpenAI web search needs an OpenAI key in Settings. Gemini uses its provider's separate search grounding.",
      };
    const signal = controller.signal;
    const models = await boundedJSON(
      await request("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        signal,
      }),
    );
    const model = (models.data ?? [])
      .map((m: { id?: unknown }) => m.id)
      .filter(
        (id: unknown): id is string =>
          typeof id === "string" &&
          /^gpt-(?:5|4\.1)(?:-|$)/.test(id) &&
          !/realtime|audio|transcri|search|instruct|codex/.test(id),
      )
      .sort(
        (a: string, b: string) => a.length - b.length || b.localeCompare(a),
      )[0];
    if (!model)
      return {
        source_status: "web_unavailable",
        error: "No accessible web-search text model was found.",
      };
    const result = await boundedJSON(
      await request("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          model,
          input: query,
          instructions:
            "External web results are not reviewed scripture proof. Preserve exact source attribution and quotations." +
            memoryInstruction(userMemories),
          store: false,
          tools: [{ type: "web_search" }],
          tool_choice: { type: "web_search" },
          max_output_tokens: 1200,
        }),
      }),
    );
    if (
      !Array.isArray(result.output) ||
      !result.output.some(
        (x: any) => x.type === "web_search_call" && x.status === "completed",
      )
    )
      throw Error("Search was not executed");
    const evidence: { url: string; title: string }[] = [];
    const texts: string[] = [];
    for (const item of result.output)
      for (const content of item.content ?? []) {
        if (content.type !== "output_text") continue;
        if (typeof content.text === "string")
          texts.push(content.text.slice(0, 5000));
        for (const annotation of content.annotations ?? [])
          if (
            annotation.type === "url_citation" &&
            typeof annotation.url === "string"
          ) {
            const url = new URL(annotation.url);
            if (
              url.protocol !== "https:" ||
              url.username ||
              url.password ||
              url.href.length > 2000
            )
              continue;
            if (
              evidence.length < 8 &&
              !evidence.some((e) => e.url === url.href)
            )
              evidence.push({
                url: url.href,
                title:
                  typeof annotation.title === "string"
                    ? annotation.title.slice(0, 200)
                    : "Web source",
              });
          }
      }
    if (!evidence.length) throw Error("No cited sources returned");
    return {
      source_status: "external_web_unverified",
      text: texts.join("\n").slice(0, 5000),
      evidence,
      note: "External web results are not approved scripture citations.",
    };
  } finally {
    clearTimeout(timer);
  }
}
