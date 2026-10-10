import { FACT_CHECK_TOOL } from "../../../packages/provider-client/live-agent";
import { compareClaim } from "../../../packages/provider-client/fact-check";
import { searchWeb } from "../../../packages/provider-client/web-search";
import { approvedCorpusStatus } from "./approved-rag";
import { answerStrict, verify } from "./engine";
import type { Profile } from "./settings-vault";
export const LIVE_TOOL_DEFINITIONS = [
  FACT_CHECK_TOOL,
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
    private autoWebFallback = false,
    private userMemories: string[] = [],
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
      if (name === "fact_check_claim") {
        if (
          args.reference !== undefined &&
          (typeof args.reference !== "string" || args.reference.length > 200)
        )
          throw Error("Invalid reference");
        const answer = answerStrict(
          [args.reference, args.query].filter(Boolean).join(" ").slice(0, 2000),
          { work_ids: selection(args.work_ids) },
        );
        const evidence = answer.citations.filter(
          (p) => p.review_status === "approved",
        );
        const comparison = compareClaim(args.query, evidence);
        const web =
          comparison.verdict !== "local_text_match" &&
          args.enable_web !== false &&
          this.autoWebFallback
            ? await searchWeb(
                this.profile,
                args.query,
                this.request,
                this.userMemories,
              )
            : undefined;
        return {
          ...comparison,
          source_status: "fact_check_evidence",
          evidence,
          safe_to_speak: false,
          web,
          caveats: answer.caveats,
        };
      }
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
          return this.autoWebFallback
            ? {
                ...(await this.dispatch("web_search", { query: args.query })),
                local_source_status: "not_verified",
                fallback_from: "local_scripture",
              }
            : {
                source_status: "not_verified",
                evidence: [],
                note: "No reviewed matching scripture evidence was retrieved. Development fixtures are excluded.",
              };
        return {
          source_status: "reviewed_excerpt",
          safe_to_speak: answer.safe_to_speak,
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
      return {
        ...(await searchWeb(
          this.profile,
          args.query,
          this.request,
          this.userMemories,
        )),
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
