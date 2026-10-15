import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildPublicDomainBundle,
  type Provenance,
} from "../services/ingest/build-public-domain-bundle";
import {
  prepareUpanishadWork,
  provenanceSkeleton,
  type UpanishadEntry,
} from "../services/ingest/prepare-upanishad-releases";
import { prepareRelease } from "../services/ingest/publish-scripture";

const entries = JSON.parse(
  readFileSync(
    "docs/upanishads-pilot/upanishads-1906-nirnaya-sagar-ai-transcription.json",
    "utf8",
  ),
) as UpanishadEntry[];
const SHA = "f".repeat(64);
// Test-only attestations: the real skeletons leave rights and reviewers unapproved on purpose.
const approveForTest = (p: Provenance): Provenance => ({
  ...p,
  manifest: {
    ...p.manifest,
    public_domain_basis: "Test fixture: 1906 print, public domain in the US.",
    permission_proof: "test-only",
    rights_approved: true,
    reviewers: ["Test-only A", "Test-only B"],
    reviewed_at: "2026-10-15",
    complete_coverage_confirmed: true,
  },
});

test("the real skeletons refuse to build until a person approves the rights and reviewers", () => {
  const prepared = prepareUpanishadWork(entries, "isha-upanishad");
  assert.throws(
    () =>
      buildPublicDomainBundle(
        prepared.verses,
        provenanceSkeleton(prepared, SHA),
      ),
    /rights|reviewer/i,
  );
});

test("all ten principal Upanishads build, validate and get unique ids", () => {
  const works = [...new Set(entries.map((e) => e.work))];
  assert.equal(works.length, 10);
  for (const work of works) {
    const prepared = prepareUpanishadWork(entries, work);
    const bundle = buildPublicDomainBundle(
      prepared.verses,
      approveForTest(provenanceSkeleton(prepared, SHA)),
    );
    assert.equal(bundle.passages.length, prepared.verses.length, work);
    const { rows } = prepareRelease(bundle);
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length, work);
    // human-review flag and notice travel with every record
    assert.equal(
      rows.every((r) => r.passage.human_verse_review === false),
      true,
      work,
    );
  }
});

test("sections with outer levels keep distinct ids and read with their own names", () => {
  const prepared = prepareUpanishadWork(entries, "katha-upanishad");
  assert.deepEqual(prepared.hierarchy_levels, ["adhyaya"]);
  assert.equal(prepared.chapter_label, "valli");
  const bundle = buildPublicDomainBundle(
    prepared.verses,
    approveForTest(provenanceSkeleton(prepared, SHA)),
  );
  const { rows } = prepareRelease(bundle);
  const ref = rows.find((r) => r.locator === "1.2.20")!.passage.reference;
  assert.match(ref, /adhyaya 1, valli 2, verse 20/);
  // valli 2 exists in adhyaya 1 and in adhyaya 2 without colliding
  assert.ok(rows.some((r) => r.locator === "2.2.1"));
});

test("a wrong declared count or a missing verse is rejected", () => {
  const prepared = prepareUpanishadWork(entries, "kena-upanishad");
  const p = approveForTest(provenanceSkeleton(prepared, SHA));
  p.expected_verses_per_chapter["1"] += 1;
  assert.throws(
    () => buildPublicDomainBundle(prepared.verses, p),
    /declares|Missing/,
  );
  const p2 = approveForTest(provenanceSkeleton(prepared, SHA));
  assert.throws(
    () => buildPublicDomainBundle(prepared.verses.slice(1), p2),
    /declares|Missing/,
  );
});

test("peace invocations and unnumbered paragraphs stay out of the bundles", () => {
  const prepared = prepareUpanishadWork(entries, "isha-upanishad");
  assert.equal(prepared.verses.length, 18);
  assert.equal(prepared.excluded, 2);
});
