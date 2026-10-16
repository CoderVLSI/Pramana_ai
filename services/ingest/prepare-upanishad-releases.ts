/** Turns the reviewed-for-structure Upanishad transcription into per-work verse lists and provenance skeletons
 * for build-public-domain-bundle.ts. It never changes text; it only maps the book's own sections onto the
 * bundle fields:  outer sections -> hierarchy, innermost section -> chapter (named by chapter_label),
 * unit number -> verse. Peace invocations and unnumbered paragraphs are left out of the bundles.
 * The rights fields of every provenance skeleton are DELIBERATELY not approved: a person must fill them in. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import type { Provenance, VerseRow } from "./build-public-domain-bundle";

export interface UpanishadEntry {
  work: string;
  hierarchy: [string, string][];
  verse: string;
  printed_numbers?: string[];
  text: string;
  page_index: number;
  confidence?: string;
  note?: string;
}
export interface PreparedWork {
  work: string;
  verses: VerseRow[];
  hierarchy_levels: string[];
  chapter_label?: string;
  expected_verses_per_chapter: Record<string, number>;
  source_locators: NonNullable<Provenance["source_locators"]>;
  /** Sections whose printed numbers were not 1..n and were renumbered by sequence. */
  renumbered: string[];
  excluded: number;
}
export const UPANISHAD_ITEM = "twentyeightupan00upangoog";
/** Printed page = scan image index - 14 in this item (confirmed by every reader). */
export const PRINTED_PAGE_OFFSET = 14;

export function prepareUpanishadWork(
  entries: UpanishadEntry[],
  work: string,
): PreparedWork {
  const mine = entries.filter((e) => e.work === work);
  const numbered = mine.filter((e) => /^\d+$/.test(String(e.verse ?? "")));
  if (!numbered.length) throw Error(`No numbered units for ${work}.`);
  const schemes = new Set(
    numbered.map((e) => JSON.stringify(e.hierarchy.map(([n]) => n))),
  );
  const mixed = schemes.size > 1;
  // Works whose sections do not all follow one scheme (e.g. numbered mantras plus a second run) get one
  // uniform level, "section", whose value spells out the book's own path; chapter = running section index.
  const levels = mixed ? ["section"] : numbered[0].hierarchy.map(([n]) => n);
  const outerNames = mixed ? ["section"] : levels.slice(0, -1);
  const chapterLabel = mixed
    ? "part"
    : levels.length
      ? levels[levels.length - 1]
      : undefined;
  const pathOf = (e: UpanishadEntry) =>
    e.hierarchy.length
      ? e.hierarchy.map(([n, v]) => `${n} ${v}`).join(", ")
      : "main";
  const groups = new Map<string, UpanishadEntry[]>();
  for (const e of numbered) {
    const key = mixed ? pathOf(e) : e.hierarchy.map(([, v]) => v).join(".");
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const verses: VerseRow[] = [];
  const counts: Record<string, number> = {};
  const locators: PreparedWork["source_locators"] = {};
  const renumbered: string[] = [];
  let sectionIndex = 0;
  for (const [path, list] of groups) {
    sectionIndex += 1;
    const nums = list.map((e) => Number(e.verse));
    const contiguous = nums.every((n, i) => n === i + 1);
    if (!contiguous) renumbered.push(path || "(whole work)");
    const values = path && !mixed ? path.split(".") : [];
    const chapter = mixed
      ? sectionIndex
      : values.length
        ? Number(values[values.length - 1])
        : 1;
    if (!Number.isInteger(chapter) || chapter < 1)
      throw Error(`${work}: bad section number in ${path}.`);
    const outer = mixed
      ? [{ name: "section", value: path }]
      : outerNames.map((name, i) => ({ name, value: values[i] }));
    const key = [...outer.map((l) => l.value), chapter].join(".");
    counts[key] = list.length;
    list.forEach((e, i) => {
      const verse = String(contiguous ? Number(e.verse) : i + 1);
      verses.push({
        hierarchy: outer,
        chapter,
        verse,
        original: e.text,
      });
      const printed = e.page_index - PRINTED_PAGE_OFFSET;
      locators[`${key}.${verse}`] = {
        scan_page_index: e.page_index,
        printed_page: printed >= 1 ? printed : null,
        source_url: `https://archive.org/details/${UPANISHAD_ITEM}/page/n${e.page_index}/mode/1up`,
      };
    });
  }
  return {
    work,
    verses,
    hierarchy_levels: outerNames,
    chapter_label: chapterLabel,
    expected_verses_per_chapter: counts,
    source_locators: locators,
    renumbered,
    excluded: mine.length - numbered.length,
  };
}

/** Provenance skeleton. Rights approval and reviewers are left as NOT approved placeholders on purpose. */
export function provenanceSkeleton(
  prepared: PreparedWork,
  sourceSha256: string,
): Provenance {
  const slug = prepared.work.replace(/-upanishad$/, "");
  return {
    manifest: {
      work_id: prepared.work,
      edition_id: "nirnaya-sagar-1906-ashtavimshati-upanishads",
      release: `${slug}-open-1`,
      completeness: "complete",
      publisher: "Nirnaya Sagar Press, Bombay (1906), via archive.org",
      publisher_location: "n/a",
      license_id: "public-domain",
      public_domain_basis:
        "FILL_IN: own transcription of a printed edition published in 1906 (US public domain); record the editor's death year check before approving.",
      permission_proof: "FILL_IN: who accepted the rights basis, and when",
      permissions: ["index", "quote"],
      rights_approved: false,
      source_url: `https://archive.org/details/${UPANISHAD_ITEM}`,
      sources: [
        {
          role: "original",
          title: "Isadi-ashtavimshatyupanishadah (The Twenty-eight Upanishads)",
          author: "Vasudeva Laxmana Shastri Pansikar (ed.)",
          publication_year: 1906,
          url: `https://archive.org/details/${UPANISHAD_ITEM}`,
          sha256: sourceSha256,
          retrieved_at: "2026-10-15",
        },
      ],
      hierarchy_levels: prepared.hierarchy_levels,
      ...(prepared.chapter_label
        ? { chapter_label: prepared.chapter_label }
        : {}),
      reviewers: ["FILL_IN: reviewer 1", "FILL_IN: reviewer 2"],
      reviewed_at: "FILL_IN",
      complete_coverage_confirmed: false,
      review_method:
        "AI transcription from page images with an AI merge check; no human verse-by-verse review",
      human_verse_review: false,
      review_notice:
        "AI-transcribed Sanskrit text of a 1906 edition; not yet human-reviewed. Numbering is this edition's own.",
    },
    expected_verses_per_chapter: prepared.expected_verses_per_chapter,
    source_locators: prepared.source_locators,
  } as Provenance;
}

async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const [input, outDir, sha] = [arg("--in"), arg("--out-dir"), arg("--sha256")];
  if (!input || !outDir || !sha)
    throw Error(
      "Usage: prepare-upanishad-releases.ts --in transcription.json --out-dir dir --sha256 <sha of the archive.org _djvu.xml>",
    );
  const entries = JSON.parse(await readFile(input, "utf8")) as UpanishadEntry[];
  await mkdir(outDir, { recursive: true });
  for (const work of [...new Set(entries.map((e) => e.work))]) {
    const prepared = prepareUpanishadWork(entries, work);
    await writeFile(
      `${outDir}/${work}.verses.jsonl`,
      prepared.verses.map((v) => JSON.stringify(v)).join("\n") + "\n",
    );
    await writeFile(
      `${outDir}/${work}.provenance.json`,
      JSON.stringify(provenanceSkeleton(prepared, sha), null, 1),
    );
    console.log(
      `${work}: ${prepared.verses.length} units, ${Object.keys(prepared.expected_verses_per_chapter).length} sections` +
        (prepared.renumbered.length
          ? `, renumbered ${prepared.renumbered.length} sections by sequence`
          : "") +
        `, ${prepared.excluded} unnumbered entries left out`,
    );
  }
}
if (process.argv[1]?.endsWith("prepare-upanishad-releases.ts"))
  void main().catch((e) => {
    console.error(e instanceof Error ? e.message : "Preparation failed.");
    process.exitCode = 1;
  });
