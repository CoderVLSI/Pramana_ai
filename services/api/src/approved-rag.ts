import { createHash } from "node:crypto";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { validateGitaPressBundle } from "../../../packages/corpus-schema/gita-press";
import type { Passage } from "../../../packages/citation-schema/index";
let records = new Map<string, Passage>();
let postings = new Map<string, Map<string, number>>();
let lengths = new Map<string, number>();
let rejected: { file: string; reason: string }[] = [];
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const tokens = (s: string) =>
  s
    .normalize("NFC")
    .toLocaleLowerCase()
    .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
export function approvedCorpusStatus() {
  return {
    approved_passages: records.size,
    approved_works: [...new Set([...records.values()].map((p) => p.work_id))],
    rejected: structuredClone(rejected),
  };
}
export function loadApprovedCorpus(
  directory = process.env.PRAMANA_APPROVED_CORPUS_DIR,
) {
  const next = new Map<string, Passage>();
  rejected = [];
  if (directory) {
    const root = realpathSync(resolve(directory));
    if (/(?:^|[\\/])(?:private|drafts?|ocr)(?:[\\/]|$)/i.test(root))
      throw Error("Private OCR drafts cannot be an approved corpus directory.");
    for (const file of readdirSync(root)
      .filter((x) => x.endsWith(".json"))
      .sort()) {
      try {
        const path = realpathSync(resolve(root, file));
        if (!path.startsWith(root + "/"))
          throw Error("Pack escapes approved directory.");
        const pack = validateGitaPressBundle(
          JSON.parse(readFileSync(path, "utf8")),
          true,
        );
        const staged: Passage[] = pack.passages.map((p) => {
          const quotation = p.translation?.text ?? p.original;
          return {
            id: p.id,
            work_id: p.work_id,
            edition_id: p.edition_id,
            reference: `${p.work_id}, ${p.hierarchy.map((l) => `${l.name} ${l.value}`).join(", ")}${p.hierarchy.length ? ", " : ""}chapter ${p.chapter}, verse ${p.verse} (volume ${p.source_locator.volume}, printed page ${p.source_locator.printed_page}; PDF page ${p.source_locator.pdf_page})`,
            chapter: p.chapter,
            verse: /^\d+$/.test(p.verse) ? Number(p.verse) : 0,
            exact_verse: p.verse,
            hierarchy: p.hierarchy,
            source_locator: p.source_locator,
            original: p.original,
            translation: quotation,
            translator: p.translation?.author ?? "Original source text",
            keywords: [],
            review_status: "approved",
            license_id: p.license_id,
            released_in: p.released_in,
            content_sha256: p.content_sha256,
            translation_sha256: digest(quotation),
            completeness: p.completeness,
            quote_source: p.translation ? "translation" : "original",
            audio_allowed: p.translation
              ? p.translation.permissions.includes("audio")
              : p.permissions.includes("audio"),
          };
        });
        if (staged.some((p) => next.has(p.id)))
          throw Error("Duplicate approved passage across packs.");
        for (const p of staged) next.set(p.id, structuredClone(p));
      } catch (e) {
        rejected.push({
          file,
          reason: e instanceof Error ? e.message : "Invalid pack",
        });
      }
    }
  }
  records = next;
  postings = new Map();
  lengths = new Map();
  for (const p of records.values()) {
    const ts = tokens(p.original + " " + p.translation);
    lengths.set(p.id, ts.length);
    for (const term of ts) {
      if (!postings.has(term)) postings.set(term, new Map());
      const posting = postings.get(term)!;
      posting.set(p.id, (posting.get(p.id) ?? 0) + 1);
    }
  }
  return approvedCorpusStatus();
}
export const reloadApprovedCorpus = loadApprovedCorpus;
export function approvedPassages(offset = 0, limit = 200) {
  return structuredClone(
    [...records.values()].slice(
      Math.max(0, offset),
      Math.max(0, offset) + Math.min(200, Math.max(0, limit)),
    ),
  );
}
export function approvedWorkSummaries() {
  const byWork = new Map<
    string,
    {
      passage_count: number;
      editions: { id: string; released_in: string; completeness: string }[];
    }
  >();
  for (const p of records.values()) {
    if (!byWork.has(p.work_id))
      byWork.set(p.work_id, { passage_count: 0, editions: [] });
    const w = byWork.get(p.work_id)!;
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
  return structuredClone(Object.fromEntries(byWork));
}
export function approvedRecord(id: string) {
  const p = records.get(id);
  return p ? structuredClone(p) : undefined;
}
export function approvedSearch(
  query: string,
  selection: { work_ids?: string[]; edition_ids?: string[] } = {},
) {
  if (!query.trim() || query.length > 2000) return [];
  const allowed = (p: Passage) =>
    (!selection.work_ids?.length || selection.work_ids.includes(p.work_id)) &&
    (!selection.edition_ids?.length ||
      selection.edition_ids.includes(p.edition_id));
  // Numeric locators match every hierarchy component: 1.2.3 means section 1, chapter 2, verse 3.
  const ref = query.match(/(?<!\d)(\d+(?:[.:]\d+)+)(?!\d)/);
  if (ref) {
    const parts = ref[1].split(/[.:]/);
    const verse = parts.pop()!,
      chapter = Number(parts.pop());
    return structuredClone(
      [...records.values()]
        .filter(
          (p) =>
            allowed(p) &&
            p.chapter === chapter &&
            p.exact_verse === verse &&
            (parts.length === 0 ||
              (p.hierarchy?.length === parts.length &&
                p.hierarchy.every((l, i) => l.value === parts[i]))),
        )
        .slice(0, 3),
    );
  }
  const ts = [...new Set(tokens(query))].slice(0, 64),
    n = records.size;
  const average =
    [...lengths.values()].reduce((a, b) => a + b, 0) / Math.max(n, 1);
  const candidates = new Set<string>();
  for (const t of ts)
    for (const id of postings.get(t)?.keys() ?? []) candidates.add(id);
  return structuredClone(
    [...candidates]
      .map((id) => records.get(id)!)
      .filter(allowed)
      .map((p) => {
        let score = 0;
        for (const t of ts) {
          const posting = postings.get(t),
            tf = posting?.get(p.id) ?? 0;
          if (tf)
            score +=
              (Math.log(1 + (n - posting!.size + 0.5) / (posting!.size + 0.5)) *
                (tf * 2.2)) /
              (tf +
                1.2 *
                  (0.25 +
                    (0.75 * (lengths.get(p.id) ?? 0)) / Math.max(average, 1)));
        }
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id))
      .slice(0, 3)
      .map((x) => x.p),
  );
}
