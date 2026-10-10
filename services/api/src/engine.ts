import { normalizeSourceLanguage } from "../../../packages/device-preferences";
import { createHash, randomUUID } from "node:crypto";
import { passages } from "./corpus";
import {
  approvedCorpusStatus,
  approvedRecord,
  approvedSearch,
} from "./approved-rag";
import {
  RELEASE,
  type Answer,
  type Passage,
} from "../../../packages/citation-schema/index";
export interface Selection {
  work_ids?: string[];
  edition_ids?: string[];
  translation_language?: string;
}
export function search(query: string, selection: Selection = {}): Passage[] {
  if (query.length > 2000) return [];
  const approved = approvedSearch(query, selection);
  if (approved.length) return approved;
  const pool = passages.filter(
    (p) =>
      (!selection.work_ids?.length || selection.work_ids.includes(p.work_id)) &&
      (!selection.edition_ids?.length ||
        selection.edition_ids.includes(p.edition_id)) &&
      (!selection.translation_language ||
        normalizeSourceLanguage(p.translation_language) ===
          normalizeSourceLanguage(selection.translation_language)),
  );
  const ref = query.match(/(?:gita|गीता|bg)?\s*(\d+)\s*[.:]\s*(\d+)/i);
  if (ref)
    return pool.filter((p) => p.chapter === +ref[1] && p.verse === +ref[2]);
  // Unsupported identity questions must not become answers from incidental keyword matches.
  if (
    /draupadi|shachi|shri|jara|vali|ashwatthama|rukmini|sita|reborn|reincarnat/i.test(
      query,
    )
  )
    return [];
  const terms = query.toLowerCase().match(/[\p{L}]+/gu) || [];
  return pool
    .map((p) => ({
      p,
      score: terms.filter((t) => p.keywords.includes(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.p);
}
export function verify(answer: Answer, packet: Passage[]): boolean {
  if (!answer.claims.length)
    return (
      answer.support_state === "NOT_VERIFIED" &&
      answer.citations.length === 0 &&
      !answer.safe_to_speak
    );
  const ids = new Set(packet.map((p) => p.id));
  const release = [...new Set(packet.map((p) => p.released_in))]
    .sort()
    .join("+");
  if (
    answer.corpus_release !== release ||
    answer.citations.length !== answer.claims.length
  )
    return false;
  for (const c of answer.claims) {
    if (c.type !== "DIRECT" || c.evidence_ids.length !== 1) return false;
    const id = c.evidence_ids[0],
      p = packet.find((p) => p.id === id),
      stored = approvedRecord(id) ?? passages.find((p) => p.id === id),
      citation = answer.citations.find((p) => p.id === id);
    if (
      !ids.has(id) ||
      !p ||
      !stored ||
      !citation ||
      JSON.stringify(citation) !== JSON.stringify(stored) ||
      JSON.stringify(p) !== JSON.stringify(stored) ||
      createHash("sha256").update(p.original).digest("hex") !== p.content_sha256
    )
      return false;
    if (
      c.quote_span[0] !== 0 ||
      c.quote_span[1] !== p.translation.length ||
      c.text !== p.translation
    )
      return false;
  }
  return (
    !answer.safe_to_speak ||
    packet.every(
      (p) => p.review_status === "approved" && p.audio_allowed === true,
    )
  );
}
export function answerStrict(query: string, selection: Selection = {}): Answer {
  const hits = search(query, selection);
  const empty: Answer = {
    id: randomUUID(),
    query,
    answer: "Not verified in the selected corpus.",
    support_state: "NOT_VERIFIED",
    claims: [],
    citations: [],
    caveats: [
      approvedCorpusStatus().approved_works.some(
        (id) => !selection.work_ids?.length || selection.work_ids.includes(id),
      )
        ? "No matching reviewed passage was retrieved. Absence from these results does not establish absence in scripture."
        : selection.work_ids?.some((id) => id !== "bhagavad-gita")
          ? "No approved passages are indexed for the selected works. Gita Press editions and usage rights are pending. Absence from this index does not establish absence in scripture."
          : "The pilot contains five development passages from the Bhagavad Gita. Absence here does not establish absence in scripture.",
    ],
    corpus_release: RELEASE,
    safe_to_speak: false,
  };
  if (!hits.length) return empty;
  const approved = hits.every((p) => p.review_status === "approved");
  const answer: Answer = {
    ...empty,
    answer:
      "The following passages match your question. Read their wording and context below.",
    corpus_release: [...new Set(hits.map((p) => p.released_in))]
      .sort()
      .join("+"),
    support_state: "DIRECT",
    claims: hits.map((p) => ({
      text: p.translation,
      evidence_ids: [p.id],
      type: "DIRECT",
      quote_span: [0, p.translation.length],
    })),
    citations: structuredClone(hits),
    caveats: approved
      ? [
          "Extractive retrieval returns exact reviewed passages, not an inferred doctrinal conclusion.",
          ...hits
            .filter((p) => p.completeness !== "complete")
            .map(
              (p) =>
                `Edition ${p.edition_id} is ${p.completeness}; this is not complete-work coverage.`,
            ),
        ]
      : [
          "Development fixtures: edition provenance and scholarly review are pending.",
          "English text is a development rendering, not a named publisher’s translation.",
          "Keyword retrieval returns passage excerpts; it does not infer an answer to a doctrinal question.",
        ],
    safe_to_speak: approved && hits.every((p) => p.audio_allowed === true),
  };
  return verify(answer, hits) ? answer : empty;
}
