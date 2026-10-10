import { scriptureDigest, validateGitaPressBundle } from "./gita-press";
import type { Answer, Passage } from "../citation-schema";

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const tokens = (value: string) =>
  value
    .normalize("NFC")
    .toLowerCase()
    .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
export const MAX_PACK_BYTES = 5 * 1024 * 1024;

/** Portable, extractive retrieval. No provider keys, network calls or fixture passages. */
export class LocalScriptureIndex {
  private rows = new Map<string, Passage>();
  private postings = new Map<string, Map<string, number>>();
  private lengths = new Map<string, number>();
  private average = 1;
  constructor(bundles: unknown[] = []) {
    for (const raw of bundles) {
      const pack = validateGitaPressBundle(raw, true);
      for (const p of pack.passages) {
        if (this.rows.has(p.id))
          throw Error("Duplicate installed passage locator.");
        const quotation = p.translation?.text ?? p.original;
        this.rows.set(p.id, {
          id: p.id,
          work_id: p.work_id,
          edition_id: p.edition_id,
          reference: `${p.work_id}, ${p.hierarchy.map((l) => `${l.name} ${l.value}`).join(", ")}${p.hierarchy.length ? ", " : ""}chapter ${p.chapter}, verse ${p.verse} (volume ${p.source_locator.volume}, printed page ${p.source_locator.printed_page}; PDF page ${p.source_locator.pdf_page})`,
          chapter: p.chapter,
          verse: /^\d+$/.test(p.verse) ? Number(p.verse) : 0,
          exact_verse: p.verse,
          hierarchy: copy(p.hierarchy),
          source_locator: copy(p.source_locator),
          original: p.original,
          translation: quotation,
          translator: p.translation?.author ?? "Original source text",
          keywords: [],
          review_status: "approved",
          license_id: p.license_id,
          released_in: p.released_in,
          content_sha256: p.content_sha256,
          translation_sha256: scriptureDigest(quotation),
          completeness: p.completeness,
          quote_source: p.translation ? "translation" : "original",
          audio_allowed: p.translation
            ? p.translation.permissions.includes("audio")
            : p.permissions.includes("audio"),
        });
      }
    }
    if (this.rows.size > 25000)
      throw Error(
        "This pilot supports up to 25,000 installed passages. Larger collections need the SQLite storage upgrade.",
      );
    for (const p of this.rows.values()) {
      const terms = tokens(p.original + " " + p.translation);
      this.lengths.set(p.id, terms.length);
      for (const term of terms) {
        if (!this.postings.has(term)) this.postings.set(term, new Map());
        const posting = this.postings.get(term)!;
        posting.set(p.id, (posting.get(p.id) ?? 0) + 1);
      }
    }
    this.average =
      [...this.lengths.values()].reduce((a, b) => a + b, 0) /
      Math.max(1, this.rows.size);
  }
  status() {
    const works: Record<
      string,
      {
        passage_count: number;
        editions: { id: string; released_in: string; completeness: string }[];
      }
    > = {};
    for (const p of this.rows.values()) {
      const w = (works[p.work_id] ??= { passage_count: 0, editions: [] });
      w.passage_count++;
      if (
        !w.editions.some(
          (e) => e.id === p.edition_id && e.released_in === p.released_in,
        )
      )
        w.editions.push({
          id: p.edition_id,
          released_in: p.released_in,
          completeness: p.completeness!,
        });
    }
    return copy({
      approved_passages: this.rows.size,
      installed_collections: Object.keys(works).length,
      works,
    });
  }
  passages() {
    return copy([...this.rows.values()].slice(0, 200));
  }
  record(id: string) {
    const p = this.rows.get(id);
    if (!p) throw Error("This passage is not installed on your phone.");
    return copy({
      ...p,
      context: [...this.rows.values()].filter(
        (q) =>
          q.work_id === p.work_id &&
          q.edition_id === p.edition_id &&
          q.released_in === p.released_in &&
          q.chapter === p.chapter &&
          JSON.stringify(q.hierarchy) === JSON.stringify(p.hierarchy) &&
          (q.id === p.id ||
            (q.verse > 0 && p.verse > 0 && Math.abs(q.verse - p.verse) <= 1)),
      ),
    });
  }
  answer(
    query: string,
    selection: { work_ids?: string[]; edition_ids?: string[] } = {},
  ): Answer {
    const empty: Answer = {
      id: "local-" + scriptureDigest(query).slice(0, 20),
      query,
      answer: "Not verified in the installed scripture collection.",
      support_state: "NOT_VERIFIED",
      claims: [],
      citations: [],
      safe_to_speak: false,
      corpus_release: "device-reviewed-corpus",
      caveats: [
        this.rows.size
          ? "No matching reviewed passage was found in the selected installed sources. A search miss does not establish absence from scripture."
          : "No reviewed scripture pack is installed on this phone.",
      ],
    };
    if (!query.trim() || query.length > 2000) return empty;
    const allowed = (p: Passage) =>
      (!selection.work_ids?.length || selection.work_ids.includes(p.work_id)) &&
      (!selection.edition_ids?.length ||
        selection.edition_ids.includes(p.edition_id));
    const ref = query.match(/(?<!\d)(\d+(?:[.:]\d+)+(?:-\d+)?)(?!\d)/);
    let hits: Passage[];
    if (ref) {
      const parts = ref[1].split(/[.:]/),
        verse = parts.pop()!,
        chapter = Number(parts.pop());
      hits = [...this.rows.values()]
        .filter(
          (p) =>
            allowed(p) &&
            p.chapter === chapter &&
            p.exact_verse === verse &&
            (!parts.length ||
              (p.hierarchy?.length === parts.length &&
                p.hierarchy.every((l, i) => l.value === parts[i]))),
        )
        .slice(0, 3);
    } else {
      const terms = [...new Set(tokens(query))].slice(0, 64),
        ids = new Set<string>();
      for (const term of terms)
        for (const id of this.postings.get(term)?.keys() ?? []) ids.add(id);
      hits = [...ids]
        .map((id) => this.rows.get(id)!)
        .filter(allowed)
        .map((p) => {
          let score = 0;
          for (const term of terms) {
            const posting = this.postings.get(term),
              tf = posting?.get(p.id) ?? 0;
            if (tf)
              score +=
                (Math.log(
                  1 +
                    (this.rows.size - posting!.size + 0.5) /
                      (posting!.size + 0.5),
                ) *
                  tf *
                  2.2) /
                (tf +
                  1.2 *
                    (0.25 +
                      (0.75 * this.lengths.get(p.id)!) /
                        Math.max(1, this.average)));
          }
          return { p, score };
        })
        .sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id))
        .slice(0, 3)
        .map((x) => x.p);
    }
    if (!hits.length) return empty;
    return {
      ...empty,
      answer:
        "These exact passages match your search. Read their wording and context below.",
      support_state: "DIRECT",
      citations: copy(hits),
      claims: hits.map((p) => ({
        text: p.translation,
        evidence_ids: [p.id],
        type: "DIRECT",
        quote_span: [0, p.translation.length],
      })),
      corpus_release: [...new Set(hits.map((p) => p.released_in))]
        .sort()
        .join("+"),
      safe_to_speak: hits.every((p) => p.audio_allowed),
      caveats: [
        "Exact source excerpts; matching words do not establish an inferred doctrinal answer.",
        ...hits
          .filter((p) => p.completeness !== "complete")
          .map(
            (p) =>
              `Edition ${p.edition_id} is ${p.completeness}; complete-work coverage is not established.`,
          ),
      ],
    };
  }
}
