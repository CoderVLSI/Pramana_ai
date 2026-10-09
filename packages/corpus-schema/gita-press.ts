import { createHash } from "node:crypto";
import { MAHAPURANA_TARGETS } from "./register";
export type Operation = "index" | "quote" | "remote_embedding" | "audio";
export interface LocatorLevel {
  name: string;
  value: string;
}
export interface SourcePassage {
  hierarchy: LocatorLevel[];
  chapter: number;
  verse: string;
  original: string;
  source_locator: {
    volume: string;
    printed_page: number;
    pdf_page: number;
    asset_sha256: string;
  };
  translation?: {
    text: string;
    language: string;
    author: string;
    license_id: string;
    permission_proof: string;
    permissions: Operation[];
  };
}
export interface GitaPressBundle {
  manifest: {
    work_id: string;
    publisher: "Gita Press";
    publisher_location: "Gorakhpur";
    edition_id: string;
    catalogue_code: string;
    print_year: number;
    release: string;
    completeness: "complete" | "abridged" | "selected";
    license_id: string;
    permission_proof: string;
    permissions: Operation[];
    rights_approved: boolean;
    source_url: string;
    hierarchy_levels: string[];
    reviewers: string[];
    reviewed_at: string;
    expected_passage_count: number;
    complete_coverage_confirmed: boolean;
  };
  passages: SourcePassage[];
}
export function validateGitaPressBundle(value: unknown, allowAbridged = false) {
  const bundle = value as GitaPressBundle,
    m = bundle?.manifest;
  function require(condition: unknown, message: string): asserts condition {
    if (!condition) throw Error(message);
  }
  require(m &&
    m.publisher === "Gita Press" &&
    m.publisher_location ===
      "Gorakhpur", "Gita Press, Gorakhpur edition metadata is required.");
  require(MAHAPURANA_TARGETS.some(
    ([id]) => id === m.work_id,
  ), "Unknown Mahapurana work ID.");
  require(m.edition_id &&
    m.catalogue_code &&
    Number.isInteger(m.print_year) &&
    m.print_year > 1800 &&
    m.print_year <= 2100 &&
    m.release, "A precise edition, catalogue code, print year, and release are required.");
  require(m.rights_approved === true &&
    m.license_id &&
    m.permission_proof, "Documented rights approval is required.");
  require(Array.isArray(m.permissions) &&
    m.permissions.includes("index") &&
    m.permissions.includes(
      "quote",
    ), "Index and quotation permissions are required.");
  require(typeof m.source_url === "string" &&
    /^https:\/\//.test(m.source_url), "A source provenance URL is required.");
  require(Array.isArray(m.reviewers) &&
    m.reviewers.length >= 2 &&
    m.reviewers.every((r) => typeof r === "string" && r.trim()) &&
    new Set(m.reviewers).size === m.reviewers.length &&
    !!m.reviewed_at &&
    Number.isFinite(
      Date.parse(m.reviewed_at),
    ), "Two distinct named reviewers and a review timestamp are required.");
  require(["complete", "abridged", "selected"].includes(
    m.completeness,
  ), "Declare whether the edition is complete, abridged, or selected.");
  require(allowAbridged ||
    m.completeness ===
      "complete", "An abridged or selected edition cannot satisfy the complete-Purana target.");
  require(Array.isArray(m.hierarchy_levels) &&
    m.hierarchy_levels.every((x) => typeof x === "string" && x.trim()) &&
    new Set(m.hierarchy_levels).size ===
      m.hierarchy_levels.length, "Edition hierarchy levels are required.");
  require(Array.isArray(bundle.passages) &&
    bundle.passages.length > 0, "No passages supplied.");
  require(Number.isInteger(m.expected_passage_count) &&
    m.expected_passage_count ===
      bundle.passages
        .length, "Passage count does not match the reviewed coverage manifest.");
  require(m.completeness !== "complete" ||
    m.complete_coverage_confirmed ===
      true, "Full-edition coverage requires explicit reviewer confirmation.");
  const ids = new Set<string>();
  const passages = bundle.passages.map((p) => {
    require(Array.isArray(p.hierarchy) &&
      p.hierarchy.length === m.hierarchy_levels.length &&
      p.hierarchy.every(
        (l, i) =>
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
      Number.isInteger(p.source_locator.printed_page) &&
      p.source_locator.printed_page > 0 &&
      Number.isInteger(p.source_locator.pdf_page) &&
      p.source_locator.pdf_page > 0 &&
      /^[a-f0-9]{64}$/i.test(
        p.source_locator.asset_sha256,
      ), "Volume, print/PDF page, and source-asset checksum are required.");
    if (p.translation)
      require(p.translation.text &&
        p.translation.language &&
        p.translation.author &&
        p.translation.license_id &&
        p.translation.permission_proof &&
        p.translation.permissions?.includes("index") &&
        p.translation.permissions.includes(
          "quote",
        ), "Translations need their own provenance, index and quotation permissions.");
    const locator = JSON.stringify([
      m.work_id,
      m.edition_id,
      m.release,
      p.hierarchy,
      p.chapter,
      p.verse,
    ]);
    const id =
      "gp_" + createHash("sha256").update(locator).digest("hex").slice(0, 28);
    require(!ids.has(id), "Duplicate canonical passage locator.");
    ids.add(id);
    return {
      ...p,
      id,
      work_id: m.work_id,
      edition_id: m.edition_id,
      publisher: m.publisher,
      publisher_location: m.publisher_location,
      print_year: m.print_year,
      catalogue_code: m.catalogue_code,
      released_in: m.release,
      license_id: m.license_id,
      permissions: m.permissions,
      completeness: m.completeness,
      review_status: "approved" as const,
      content_sha256: createHash("sha256").update(p.original).digest("hex"),
      translation_sha256: p.translation
        ? createHash("sha256").update(p.translation.text).digest("hex")
        : null,
    };
  });
  return { manifest: m, passages };
}
