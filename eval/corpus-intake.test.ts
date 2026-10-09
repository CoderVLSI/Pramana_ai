import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateGitaPressBundle,
  type GitaPressBundle,
} from "../packages/corpus-schema/gita-press";
import { gitaPressRegister } from "../packages/corpus-schema/register";
import { answerStrict } from "../services/api/src/engine";
function fixture(): GitaPressBundle {
  return {
    manifest: {
      work_id: "bhagavata-purana",
      publisher: "Gita Press",
      publisher_location: "Gorakhpur",
      edition_id: "TEST-ONLY-NOT-A-REAL-EDITION",
      catalogue_code: "TEST",
      print_year: 2026,
      release: "TEST-ONLY",
      completeness: "complete",
      license_id: "TEST-NOT-A-LICENSE",
      permission_proof: "TEST-NOT-PERMISSION",
      permissions: ["index", "quote"],
      rights_approved: true,
      source_url: "https://example.com/test-only",
      hierarchy_levels: ["skandha"],
      reviewers: ["Test reviewer A", "Test reviewer B"],
      reviewed_at: "2026-10-09",
      expected_passage_count: 1,
      complete_coverage_confirmed: true,
    },
    passages: [
      {
        hierarchy: [{ name: "skandha", value: "TEST-1" }],
        chapter: 1,
        verse: "1-2",
        original: "TEST FIXTURE ONLY. NOT SCRIPTURE.",
        source_locator: {
          volume: "TEST-VOLUME",
          printed_page: 1,
          pdf_page: 2,
          asset_sha256: "ab".repeat(32),
        },
      },
    ],
  };
}
test("register has all 18 Gita Press targets without inventing editions or ready passages", () => {
  assert.equal(gitaPressRegister.length, 18);
  assert.equal(new Set(gitaPressRegister.map((w) => w.work_id)).size, 18);
  assert.ok(
    gitaPressRegister.every(
      (w) =>
        w.intended_publisher === "Gita Press" &&
        w.rights_status === "pending" &&
        w.edition_id === null &&
        w.indexed_passages === 0,
    ),
  );
});
test("unapproved rights, missing source pages, hierarchy errors, and incomplete coverage block ingest", () => {
  for (const mutate of [
    (b: GitaPressBundle) => (b.manifest.rights_approved = false),
    (b: GitaPressBundle) => (b.manifest.permissions = ["quote"]),
    (b: GitaPressBundle) => (b.manifest.complete_coverage_confirmed = false),
    (b: GitaPressBundle) => (b.manifest.expected_passage_count = 2),
    (b: GitaPressBundle) => (b.passages[0].source_locator.pdf_page = 0),
    (b: GitaPressBundle) => (b.passages[0].hierarchy = []),
  ]) {
    const b = fixture();
    mutate(b);
    assert.throws(() => validateGitaPressBundle(b));
  }
});
test("abridged content cannot satisfy full corpus; explicitly allowed content retains abridged label", () => {
  const b = fixture();
  b.manifest.completeness = "abridged";
  assert.throws(() => validateGitaPressBundle(b), /abridged/);
  assert.equal(
    validateGitaPressBundle(b, true).passages[0].completeness,
    "abridged",
  );
});
test("hierarchy-aware IDs distinguish repeated chapter/verse across sections and reject duplicates", () => {
  const b = fixture();
  b.passages.push({
    ...structuredClone(b.passages[0]),
    hierarchy: [{ name: "skandha", value: "TEST-2" }],
  });
  b.manifest.expected_passage_count = 2;
  const out = validateGitaPressBundle(b);
  assert.notEqual(out.passages[0].id, out.passages[1].id);
  assert.equal(out.passages[0].original, b.passages[0].original);
  b.passages[1] = structuredClone(b.passages[0]);
  assert.throws(() => validateGitaPressBundle(b), /Duplicate/);
});
test("modern translations require independent permission and named provenance", () => {
  const b = fixture();
  b.passages[0].translation = {
    text: "TEST TRANSLATION ONLY",
    language: "hi",
    author: "Test author",
    license_id: "TEST",
    permission_proof: "",
    permissions: ["index", "quote"],
  };
  assert.throws(() => validateGitaPressBundle(b), /Translations/);
});
test("selected 18-Purana corpus abstains and never reattributes Gita fixtures to Gita Press", () => {
  const a = answerStrict("Gita 2.47", {
    work_ids: gitaPressRegister.map((w) => w.work_id),
  });
  assert.equal(a.support_state, "NOT_VERIFIED");
  assert.equal(a.citations.length, 0);
  assert.equal(a.safe_to_speak, false);
  assert.ok(a.caveats[0].includes("Gita Press"));
});
