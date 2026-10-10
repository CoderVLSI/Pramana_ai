import { approvedCorpusStatus } from "./approved-rag";
import { answerStrict, verify } from "./engine";
import type { Profile } from "./settings-vault";
export const LIVE_TOOL_DEFINITIONS = [
  {
    name: "search_scripture",
    description:
      "Search reviewed scripture excerpts. Empty results mean no reviewed evidence was retrieved, not absence from scripture.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        work_ids: { type: "array", items: { type: "string" } },
        edition_ids: { type: "array", items: { type: "string" } },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "corpus_status",
    description: "Get actual approved scripture index counts.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "web_search",
    description:
      "Search the public web for externally cited information, not reviewed scripture proof.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
] as const;
async function boundedJSON(response: Response) {
  if (!response.ok) throw Error("Provider unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw Error("No response");
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
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function selection(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (
    !Array.isArray(value) ||
    value.length > 160 ||
    value.some((x) => typeof x !== "string" || x.length > 120)
  )
    throw Error("Invalid selection");
  return value;
}
export class LiveToolDispatcher {
  private turnCalls = 0;
  private recentCalls: number[] = [];
  constructor(
    private profile: Profile,
    private request: typeof fetch = globalThis.fetch,
  ) {}
  beginTurn() {
    this.turnCalls = 0;
  }
  async dispatch(
    name: string,
    argumentsValue: unknown,
  ): Promise<Record<string, unknown>> {
    const now = Date.now();
    this.recentCalls = this.recentCalls.filter((t) => t > now - 60000);
    if (++this.turnCalls > 6 || this.recentCalls.length >= 12)
      return {
        error:
          "Tool request limit reached. Continue without further tools or try again later.",
      };
    this.recentCalls.push(now);
    try {
      if (
        !argumentsValue ||
        typeof argumentsValue !== "object" ||
        Array.isArray(argumentsValue)
      )
        throw Error("Invalid arguments");
      const args = argumentsValue as Record<string, unknown>;
      if (name === "corpus_status")
        return {
          source_status: "approved_index_counts",
          ...approvedCorpusStatus(),
          rejected: undefined,
        };
      if (
        typeof args.query !== "string" ||
        !args.query.trim() ||
        args.query.length > 1000
      )
        throw Error("Invalid query");
      if (name === "search_scripture") {
        const answer = answerStrict(args.query, {
          work_ids: selection(args.work_ids),
          edition_ids: selection(args.edition_ids),
        });
        if (
          !verify(answer, answer.citations) ||
          !answer.citations.length ||
          answer.citations.some((p) => p.review_status !== "approved")
        )
          return {
            source_status: "not_verified",
            evidence: [],
            note: "No reviewed matching scripture evidence was retrieved. Development fixtures are excluded.",
          };
        return {
          source_status: "reviewed_excerpt",
          corpus_release: answer.corpus_release,
          evidence: answer.citations.map((p) => ({
            id: p.id,
            work_id: p.work_id,
            edition_id: p.edition_id,
            reference: p.reference,
            exact_verse: p.exact_verse,
            source_locator: p.source_locator,
            completeness: p.completeness,
            original: p.original.slice(0, 6000),
            excerpt: p.translation.slice(0, 6000),
            quote_source: p.quote_source,
          })),
          note: "These are reviewed excerpts; any generated explanation remains unverified.",
        };
      }
      if (name !== "web_search") throw Error("Unknown tool");
      const key = this.profile.openai.api_key;
      if (!key)
        return {
          source_status: "web_unavailable",
          error:
            "OpenAI web search needs an OpenAI key in Settings. Gemini uses its provider's separate search grounding.",
        };
      const signal = AbortSignal.timeout(15000);
      const models = await boundedJSON(
        await this.request("https://api.openai.com/v1/models", {
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
        await this.request("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          signal,
          body: JSON.stringify({
            model,
            input: args.query,
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
    } catch {
      return {
        source_status: "tool_unavailable",
        error:
          "The tool could not complete safely. Check provider access or try a narrower query.",
      };
    }
  }
}
