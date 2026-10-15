/** Builds a release bundle from a verse list and its provenance record.
 * It never supplies text: every verse must come from a source file named and hashed in the provenance. */
import { readFile, writeFile } from "node:fs/promises";
import {
  validatePublicDomainBundle,
  type PublicDomainBundle,
} from "../../packages/corpus-schema/public-domain";

export interface VerseRow {
  /** Outer sections, outermost first, e.g. [{name:"adhyaya",value:"1"}]. Must match manifest.hierarchy_levels. */
  hierarchy?: { name: string; value: string }[];
  /** The innermost numbered section (a chapter, valli, khanda...); see manifest.chapter_label. */
  chapter: number;
  /** "7" or a range such as "4-5". */
  verse: string;
  original: string;
  translation?: string;
}
export interface Provenance {
  manifest: Omit<
    PublicDomainBundle["manifest"],
    "expected_passage_count" | "rights_class"
  >;
  /** Section key -> number of verses in THIS edition's numbering. The key is the chapter number, or for
   * editions with outer levels the dotted path "outer1.outer2.chapter" (e.g. "1.2" = adhyaya 1, valli 2). */
  expected_verses_per_chapter: Record<string, number>;
  source_locators?: Record<
    string,
    { scan_page_index: number; printed_page: number | null; source_url: string }
  >;
  translation?: {
    language: string;
    author: string;
    license_id: string;
    permission_proof: string;
  };
}
const clean = (value: string) => value.normalize("NFC").trim();

export function buildPublicDomainBundle(
  verses: VerseRow[],
  provenance: Provenance,
): PublicDomainBundle {
  const m = provenance.manifest;
  const original = m.sources?.find((s) => s.role === "original");
  if (!original) throw Error("Provenance needs an original source file.");
  const withTranslation = verses.filter((v) => v.translation?.trim()).length;
  if (withTranslation && withTranslation !== verses.length)
    throw Error("Some verses have a translation and some do not.");
  if (withTranslation && !provenance.translation)
    throw Error("Translated verses need translation provenance.");
  // Numbering must be exactly 1..n in every section, matching the declared edition counts.
  const sectionKey = (row: VerseRow) =>
    [...(row.hierarchy ?? []).map((l) => l.value), row.chapter].join(".");
  const seen = new Map<string, Set<number>>();
  for (const row of verses) {
    const [a, b = a] = String(row.verse).split("-").map(Number);
    if (!Number.isInteger(row.chapter) || !Number.isInteger(a) || b < a)
      throw Error(`Bad verse number ${sectionKey(row)}.${row.verse}.`);
    const key = sectionKey(row);
    const set = seen.get(key) ?? new Set<number>();
    for (let n = a; n <= b; n++) {
      if (set.has(n)) throw Error(`Duplicate verse ${key}.${n}.`);
      set.add(n);
    }
    seen.set(key, set);
  }
  const declared = provenance.expected_verses_per_chapter;
  const naturalOrder = (x: string, y: string) => {
    const [p, q] = [x, y].map((k) => k.split(".").map(Number));
    for (let i = 0; i < Math.max(p.length, q.length); i++)
      if ((p[i] ?? -1) !== (q[i] ?? -1)) return (p[i] ?? -1) - (q[i] ?? -1);
    return 0;
  };
  const label = (key: string) => (key.includes(".") ? "Section" : "Chapter");
  const sections = [
    ...new Set([...seen.keys(), ...Object.keys(declared)]),
  ].sort(naturalOrder);
  for (const section of sections) {
    const have = seen.get(section)?.size ?? 0;
    const want = declared[section];
    if (want === undefined)
      throw Error(
        `${label(section)} ${section} is not in the declared counts.`,
      );
    if (have !== want)
      throw Error(
        `${label(section)} ${section} has ${have} verses; the edition declares ${want}.`,
      );
    for (let n = 1; n <= want; n++)
      if (!seen.get(section)!.has(n))
        throw Error(`Missing verse ${section}.${n}.`);
  }
  if (provenance.source_locators) {
    for (const row of verses) {
      const locator =
        provenance.source_locators[`${sectionKey(row)}.${row.verse}`];
      if (
        !locator ||
        !Number.isInteger(locator.scan_page_index) ||
        locator.scan_page_index < 0 ||
        !/^https:\/\//.test(locator.source_url) ||
        (locator.printed_page !== null &&
          (!Number.isInteger(locator.printed_page) || locator.printed_page < 1))
      )
        throw Error(
          `Missing or invalid source locator for ${sectionKey(row)}.${row.verse}.`,
        );
    }
  }
  const volume = provenance.source_locators
    ? `scan:${original.sha256.slice(0, 12)}`
    : `e-text:${original.sha256.slice(0, 12)}`;
  const passages = verses.map((row, index) => ({
    hierarchy: row.hierarchy ?? [],
    chapter: row.chapter,
    verse: String(row.verse),
    original: row.original,
    source_locator: {
      volume,
      printed_page:
        provenance.source_locators?.[`${sectionKey(row)}.${row.verse}`]
          ?.printed_page ?? (provenance.source_locators ? null : index + 1),
      pdf_page: provenance.source_locators
        ? provenance.source_locators[`${sectionKey(row)}.${row.verse}`]
            .scan_page_index + 1
        : index + 1,
      ...(provenance.source_locators
        ? {
            locator_kind: "scan" as const,
            source_url:
              provenance.source_locators[`${sectionKey(row)}.${row.verse}`]
                .source_url,
          }
        : { locator_kind: "etext" as const, running_position: index + 1 }),
      asset_sha256: original.sha256,
    },
    ...(row.translation && provenance.translation
      ? {
          translation: {
            text: clean(row.translation),
            language: provenance.translation.language,
            author: provenance.translation.author,
            license_id: provenance.translation.license_id,
            permission_proof: provenance.translation.permission_proof,
            permissions: ["index", "quote"] as ("index" | "quote")[],
          },
        }
      : {}),
  }));
  const bundle: PublicDomainBundle = {
    manifest: {
      ...m,
      rights_class: "public_domain",
      expected_passage_count: passages.length,
    },
    passages,
  };
  validatePublicDomainBundle(bundle, true);
  return bundle;
}

async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const [versesPath, provenancePath, out] = [
    arg("--verses"),
    arg("--provenance"),
    arg("--out"),
  ];
  if (!versesPath || !provenancePath || !out)
    throw Error(
      "Usage: build-public-domain-bundle.ts --verses verses.jsonl --provenance provenance.json --out bundle.json",
    );
  const verses = (await readFile(versesPath, "utf8"))
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as VerseRow);
  const provenance = JSON.parse(await readFile(provenancePath, "utf8"));
  const bundle = buildPublicDomainBundle(verses, provenance);
  await writeFile(out, JSON.stringify(bundle, null, 1));
  console.log(
    `Built ${bundle.passages.length} passages for ${bundle.manifest.work_id}. Review, then validate with publish-scripture.ts (no --publish).`,
  );
}
if (process.argv[1]?.endsWith("build-public-domain-bundle.ts"))
  void main().catch((e) => {
    console.error(e instanceof Error ? e.message : "Bundle build failed.");
    process.exitCode = 1;
  });
