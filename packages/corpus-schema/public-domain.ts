import {
  scriptureDigest,
  validateGitaPressBundle,
  type LocatorLevel,
  type Operation,
  type SourcePassage,
} from "./gita-press";
import { EPIC_TARGETS, MAHAPURANA_TARGETS, VEDA_TARGETS } from "./register";
import { UPANISHAD_TARGETS } from "./upanishads";

/** Works accepted from open sources in addition to the registered Gita Press targets.
 * The Bhagavad Gita is part of the Mahabharata but is cited and searched on its own. */
export const OPEN_SOURCE_WORKS = [
  "bhagavad-gita",
  /** Narayana-atharvashira Upanishad: printed as its own text in the 1906 and 1925 Nirnaya Sagar editions. */
  "narayanatharvashira-upanishad",
] as const;
export const OPEN_LICENSES = ["public-domain", "CC0-1.0", "CC-BY-4.0"] as const;

export interface SourceFile {
  role: "original" | "translation";
  title: string;
  author: string;
  publication_year: number;
  url: string;
  /** SHA-256 of the exact file that was downloaded and reviewed. */
  sha256: string;
  retrieved_at: string;
}
export interface PublicDomainBundle {
  manifest: {
    rights_class: "public_domain";
    work_id: string;
    edition_id: string;
    release: string;
    completeness: "complete" | "abridged" | "selected";
    /** Name of the host or collection the text came from; not a claim of publication. */
    publisher: string;
    publisher_location: string;
    license_id: (typeof OPEN_LICENSES)[number];
    /** Why the text is free to index and quote, e.g. translator death year. */
    public_domain_basis: string;
    permission_proof: string;
    permissions: Operation[];
    rights_approved: boolean;
    source_url: string;
    sources: SourceFile[];
    hierarchy_levels: string[];
    /** What the numeric `chapter` field is called in this edition (default "chapter"), e.g. "valli" or "khanda". */
    chapter_label?: string;
    reviewers: string[];
    reviewed_at: string;
    expected_passage_count: number;
    complete_coverage_confirmed: boolean;
    attribution?: string;
    review_method?: string;
    human_verse_review?: boolean;
    review_notice?: string;
    /** Language of the passages' `original` text; defaults to Sanskrit ("sa"). An English-only
     * edition such as Wilson's 1840 translation declares "en" so the app shows it as English. */
    text_language?: "sa" | "en";
  };
  passages: SourcePassage[];
}
const isHttps = (v: unknown) => typeof v === "string" && /^https:\/\//.test(v);
const isSha = (v: unknown) =>
  typeof v === "string" && /^[a-f0-9]{64}$/i.test(v);

export function validatePublicDomainBundle(
  value: unknown,
  allowAbridged = false,
) {
  const bundle = value as PublicDomainBundle,
    m = bundle?.manifest;
  function require(condition: unknown, message: string): asserts condition {
    if (!condition) throw Error(message);
  }
  require(m &&
    m.rights_class === "public_domain", "Not a public-domain bundle.");
  require([
    ...MAHAPURANA_TARGETS,
    ...EPIC_TARGETS,
    ...VEDA_TARGETS,
    ...UPANISHAD_TARGETS,
  ].some(([id]) => id === m.work_id) ||
    (OPEN_SOURCE_WORKS as readonly string[]).includes(
      m.work_id,
    ), "Unknown scripture work ID.");
  require(m.edition_id &&
    m.release &&
    m.publisher &&
    m.publisher_location, "Edition, release and source collection are required.");
  require((OPEN_LICENSES as readonly string[]).includes(
    m.license_id,
  ), "Only public-domain, CC0 or CC-BY texts can be released from open sources.");
  require(typeof m.public_domain_basis === "string" &&
    m.public_domain_basis.trim().length >=
      20, "Explain why the text is free to use (for example author death year and first publication).");
  require(m.license_id !== "CC-BY-4.0" ||
    (typeof m.attribution === "string" &&
      m.attribution.trim()), "CC-BY texts need an attribution line.");
  require(m.rights_approved === true &&
    m.permission_proof, "A reviewer must confirm the rights basis.");
  require(Array.isArray(m.permissions) &&
    m.permissions.includes("index") &&
    m.permissions.includes(
      "quote",
    ), "Index and quotation permissions are required.");
  require(isHttps(m.source_url), "A source provenance URL is required.");
  require(Array.isArray(m.sources) &&
    m.sources.some((s) => s.role === "original") &&
    m.sources.every(
      (s) =>
        ["original", "translation"].includes(s.role) &&
        s.title &&
        s.author &&
        Number.isInteger(s.publication_year) &&
        s.publication_year > 0 &&
        isHttps(s.url) &&
        isSha(s.sha256) &&
        Number.isFinite(Date.parse(s.retrieved_at)),
    ), "Every source file needs a title, author, year, https URL, SHA-256 and retrieval date.");
  require(Array.isArray(m.reviewers) &&
    m.reviewers.length >= 2 &&
    m.reviewers.every((r) => typeof r === "string" && r.trim()) &&
    new Set(m.reviewers).size === m.reviewers.length &&
    Number.isFinite(
      Date.parse(m.reviewed_at),
    ), "Two distinct named reviewers and a review timestamp are required.");
  require(["complete", "abridged", "selected"].includes(
    m.completeness,
  ), "Declare whether the edition is complete, abridged, or selected.");
  require(allowAbridged ||
    m.completeness ===
      "complete", "An abridged or selected edition cannot satisfy a complete-work target.");
  require(Array.isArray(m.hierarchy_levels) &&
    m.hierarchy_levels.every((x) => typeof x === "string" && x.trim()) &&
    new Set(m.hierarchy_levels).size ===
      m.hierarchy_levels
        .length, "Edition hierarchy levels are required (an empty list is allowed).");
  require(m.chapter_label === undefined ||
    (typeof m.chapter_label === "string" &&
      /^[a-z][a-z -]{0,29}$/.test(
        m.chapter_label,
      )), 'chapter_label must be a short lowercase word such as "valli" or "khanda".');
  require(m.text_language === undefined ||
    m.text_language === "sa" ||
    m.text_language === "en", 'text_language must be "sa" or "en".');
  require(Array.isArray(bundle.passages) &&
    bundle.passages.length > 0, "No passages supplied.");
  require(Number.isInteger(m.expected_passage_count) &&
    m.expected_passage_count ===
      bundle.passages
        .length, "Passage count does not match the reviewed coverage manifest.");
  require(m.completeness !== "complete" ||
    m.complete_coverage_confirmed ===
      true, "Full-edition coverage requires explicit reviewer confirmation.");
  const translationSource = m.sources.find((s) => s.role === "translation");
  const ids = new Set<string>();
  const passages = bundle.passages.map((p) => {
    require(Array.isArray(p.hierarchy) &&
      p.hierarchy.length === m.hierarchy_levels.length &&
      p.hierarchy.every(
        (l: LocatorLevel, i: number) =>
          l.name === m.hierarchy_levels[i] &&
          typeof l.value === "string" &&
          !!l.value.trim(),
      ), "Passage hierarchy must match the edition-specific locator scheme.");
    require(Number.isInteger(p.chapter) &&
      p.chapter > 0 &&
      typeof p.verse === "string" &&
      /^[1-9]\d*(?:-[1-9]\d*)?$/.test(
        p.verse,
      ), "Positive chapter and exact verse or verse range are required.");
    if (p.verse.includes("-")) {
      const [a, b] = p.verse.split("-").map(Number);
      require(b >= a, "Verse range is reversed.");
    }
    require(typeof p.original === "string" &&
      p.original.trim(), "Original source text is required.");
    require(p.source_locator &&
      typeof p.source_locator.volume === "string" &&
      p.source_locator.volume.trim() &&
      ((p.source_locator.printed_page === null &&
        p.source_locator.locator_kind === "scan") ||
        (typeof p.source_locator.printed_page === "number" &&
          Number.isInteger(p.source_locator.printed_page) &&
          p.source_locator.printed_page > 0)) &&
      Number.isInteger(p.source_locator.pdf_page) &&
      p.source_locator.pdf_page > 0 &&
      isSha(
        p.source_locator.asset_sha256,
      ), "Source label, running position and source-file checksum are required.");
    if (p.translation) {
      require(translationSource, "A translation needs its own source entry.");
      require(p.translation.text &&
        p.translation.language &&
        p.translation.author &&
        p.translation.license_id &&
        p.translation.permission_proof &&
        p.translation.permissions?.includes("index") &&
        p.translation.permissions.includes(
          "quote",
        ), "Translations need their own provenance, index and quotation permissions.");
    }
    const locator = JSON.stringify([
      m.work_id,
      m.edition_id,
      m.release,
      p.hierarchy,
      p.chapter,
      p.verse,
    ]);
    const id = "pd_" + scriptureDigest(locator).slice(0, 28);
    require(!ids.has(id), "Duplicate canonical passage locator.");
    ids.add(id);
    return {
      ...p,
      id,
      work_id: m.work_id,
      edition_id: m.edition_id,
      publisher: m.publisher,
      publisher_location: m.publisher_location,
      print_year: m.sources[0].publication_year,
      catalogue_code: "open-source",
      released_in: m.release,
      license_id: m.license_id,
      permissions: m.permissions,
      completeness: m.completeness,
      review_status: "approved" as const,
      content_sha256: scriptureDigest(p.original),
      translation_sha256: p.translation
        ? scriptureDigest(p.translation.text)
        : null,
    };
  });
  return { manifest: m, passages };
}

/** Routes a bundle to the validator for its rights class. */
export function validateScriptureBundle(
  value: unknown,
  allowAbridged = false,
): { manifest: any; passages: any[] } {
  return (value as any)?.manifest?.rights_class === "public_domain"
    ? validatePublicDomainBundle(value, allowAbridged)
    : validateGitaPressBundle(value, allowAbridged);
}
