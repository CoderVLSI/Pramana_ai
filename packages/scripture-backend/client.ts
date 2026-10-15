import { scriptureDigest } from "../corpus-schema/gita-press";
import type { Answer, Passage } from "../citation-schema";
import { normalizeSourceLanguage } from "../device-preferences";

export interface ScriptureSelection {
  work_ids?: string[];
  edition_ids?: string[];
  translation_language?: string;
}
export interface ScriptureCatalog {
  schema_version: 1;
  approved_passages: number;
  releases: {
    id: string;
    work_id: string;
    edition_id: string;
    released_in: string;
    completeness: string;
    source_url: string;
    passage_count: number;
  }[];
}
const aliases: Record<string, string> = {
  dharma: "धर्म",
  karma: "कर्म",
  bhakti: "भक्ति",
  moksha: "मोक्ष",
  rama: "राम",
  krishna: "कृष्ण",
  shiva: "शिव",
  vishnu: "विष्णु",
};
export function cloudSearchQuery(query: string) {
  const words = query.normalize("NFC").match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  // OR terms are explicit lexical synonyms, not an undocumented translation model.
  return [
    ...new Set(
      words
        .slice(0, 16)
        .flatMap((word) => [
          word,
          ...(aliases[word.toLowerCase()] ? [aliases[word.toLowerCase()]] : []),
        ]),
    ),
  ]
    .map((word) => `"${word}"`)
    .join(" OR ");
}
export function validateRemotePassages(
  value: unknown,
  selection: ScriptureSelection = {},
  maximum = 10,
): Passage[] {
  if (!Array.isArray(value) || value.length > maximum)
    throw Error("Invalid scripture response.");
  const ids = new Set<string>();
  for (const p of value) {
    if (
      !p ||
      typeof p.id !== "string" ||
      !/^(?:gp|pd)_[a-f0-9]{28}$/.test(p.id) ||
      ids.has(p.id) ||
      p.review_status !== "approved" ||
      typeof p.original !== "string" ||
      !p.original ||
      p.original.length > 30000 ||
      typeof p.translation !== "string" ||
      !p.translation ||
      p.translation.length > 30000 ||
      scriptureDigest(p.original) !== p.content_sha256 ||
      scriptureDigest(p.translation) !== p.translation_sha256 ||
      !p.source_locator ||
      !Number.isInteger(p.source_locator.pdf_page) ||
      p.source_locator.pdf_page < 1 ||
      !(
        (p.id.startsWith("pd_") &&
          p.source_locator.locator_kind === "scan" &&
          p.source_locator.printed_page === null) ||
        (Number.isInteger(p.source_locator.printed_page) &&
          p.source_locator.printed_page > 0)
      ) ||
      !/^[a-f0-9]{64}$/.test(p.source_locator.asset_sha256) ||
      !["complete", "abridged", "selected"].includes(p.completeness) ||
      typeof p.audio_allowed !== "boolean" ||
      !p.reference ||
      !p.released_in ||
      !p.license_id ||
      (selection.work_ids?.length && !selection.work_ids.includes(p.work_id)) ||
      (selection.edition_ids?.length &&
        !selection.edition_ids.includes(p.edition_id)) ||
      (selection.translation_language &&
        normalizeSourceLanguage(p.translation_language) !==
          normalizeSourceLanguage(selection.translation_language))
    )
      throw Error(
        "Scripture response failed source, scope or integrity checks.",
      );
    ids.add(p.id);
  }
  return value;
}
export function remoteAnswer(query: string, passages: Passage[]): Answer {
  return {
    id:
      "cloud_" +
      scriptureDigest(query + passages.map((p) => p.id).join()).slice(0, 24),
    query,
    answer: passages.some((p) => p.human_verse_review === false)
      ? "Matching Sanskrit excerpts from an AI transcription accepted for release by the project owner."
      : passages.length
        ? "Matching source excerpts from the reviewed scripture backend."
        : "No reviewed passage matched this search.",
    support_state: passages.length ? "DIRECT" : "NOT_VERIFIED",
    claims: passages.map((p) => ({
      text: p.translation,
      evidence_ids: [p.id],
      type: "DIRECT",
      quote_span: [0, p.translation.length],
    })),
    citations: passages,
    safe_to_speak:
      passages.length > 0 && passages.every((p) => p.audio_allowed),
    corpus_release:
      [...new Set(passages.map((p) => p.released_in))].sort().join("+") ||
      "cloud-reviewed-corpus-empty",
    caveats: [
      ...new Set(
        passages
          .map((p) => p.review_notice)
          .filter((notice): notice is string => !!notice),
      ),
      "Exact source excerpts; lexical matches do not establish an inferred doctrinal conclusion.",
      ...passages
        .filter((p) => p.completeness !== "complete")
        .map(
          (p) =>
            `${p.work_id}: ${p.completeness} edition; absence here does not establish absence in the complete work.`,
        ),
    ],
  };
}
export class ScriptureBackend {
  constructor(
    private url: string,
    private publicKey: string,
    private request: typeof fetch = globalThis.fetch,
  ) {
    const address = new URL(url);
    if (
      address.protocol !== "https:" ||
      address.username ||
      address.password ||
      address.search ||
      address.hash ||
      address.pathname !== "/"
    )
      throw Error("Use the public HTTPS Supabase project URL.");
    if (!publicKey || publicKey.startsWith("sb_secret_"))
      throw Error("Use a publishable Supabase key, never a secret key.");
    this.url = address.origin;
  }
  private async rpc(name: string, body: object) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await this.request(`${this.url}/rest/v1/rpc/${name}`, {
        method: "POST",
        signal: controller.signal,
        headers: { apikey: this.publicKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        throw Error(
          "Scripture backend is unavailable or has not been configured.",
        );
      const text = await response.text();
      if (text.length > 400000)
        throw Error("Scripture response exceeded its size limit.");
      return JSON.parse(text);
    } finally {
      clearTimeout(timer);
    }
  }
  async search(query: string, selection: ScriptureSelection = {}) {
    if (!query.trim() || query.length > 2000)
      throw Error("Enter a scripture question up to 2000 characters.");
    const reference = query
      .match(/(?<!\d)(\d+(?:[.:]\d+)+)(?!\d)/)?.[1]
      .replaceAll(":", ".");
    const result = await this.rpc("search_scripture", {
      search_query: cloudSearchQuery(query),
      selected_works: selection.work_ids?.length ? selection.work_ids : null,
      selected_editions: selection.edition_ids?.length
        ? selection.edition_ids
        : null,
      selected_language: selection.translation_language
        ? normalizeSourceLanguage(selection.translation_language)
        : null,
      exact_locator: reference || null,
      result_limit: 3,
    });
    return remoteAnswer(query, validateRemotePassages(result, selection));
  }
  async catalog(): Promise<ScriptureCatalog> {
    const value = await this.rpc("scripture_catalog", {});
    if (
      value?.schema_version !== 1 ||
      !Number.isSafeInteger(value.approved_passages) ||
      value.approved_passages < 0 ||
      !Array.isArray(value.releases) ||
      value.releases.length > 1000 ||
      value.releases.some(
        (r: any) =>
          !r.id ||
          !r.work_id ||
          !r.edition_id ||
          !r.released_in ||
          !["complete", "abridged", "selected"].includes(r.completeness) ||
          !Number.isSafeInteger(r.passage_count) ||
          r.passage_count < 1,
      ) ||
      value.releases.reduce((n: number, r: any) => n + r.passage_count, 0) !==
        value.approved_passages
    )
      throw Error("Scripture catalog failed coverage checks.");
    return value;
  }
  async passages() {
    return validateRemotePassages(
      await this.rpc("scripture_page", { page_offset: 0, page_limit: 50 }),
      {},
      50,
    );
  }
  async record(id: string) {
    if (!/^(?:gp|pd)_[a-f0-9]{28}$/.test(id))
      throw Error("Invalid scripture passage identifier.");
    const value = await this.rpc("scripture_record", { passage_id: id });
    if (!value)
      throw Error("This passage is not available in the reviewed corpus.");
    validateRemotePassages([value]);
    const context = validateRemotePassages(value.context, {
      work_ids: [value.work_id],
      edition_ids: [value.edition_id],
    });
    if (
      context.some(
        (p) =>
          p.released_in !== value.released_in ||
          p.chapter !== value.chapter ||
          JSON.stringify(p.hierarchy) !== JSON.stringify(value.hierarchy),
      )
    )
      throw Error("Scripture context crossed source boundaries.");
    return { ...value, context };
  }
}
