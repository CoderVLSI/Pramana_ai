import test from "node:test";
import assert from "node:assert/strict";
import { validateScriptureBundle } from "../packages/corpus-schema/public-domain";
import {
  buildPublicDomainBundle,
  type Provenance,
  type VerseRow,
} from "../services/ingest/build-public-domain-bundle";
import { prepareRelease } from "../services/ingest/publish-scripture";
import { validateRemotePassages } from "../packages/scripture-backend/client";

// SYNTHETIC TEST DATA ONLY: placeholder strings, not scripture and not from any source.
const SHA = "a".repeat(64);
const provenance = (): Provenance => ({
  manifest: {
    work_id: "bhagavad-gita",
    edition_id: "synthetic-test-edition",
    release: "synthetic-1",
    completeness: "selected",
    publisher: "Synthetic test collection",
    publisher_location: "n/a",
    license_id: "public-domain",
    public_domain_basis:
      "Synthetic fixture: pretend the author died over 100 years ago.",
    permission_proof: "synthetic-test-only",
    permissions: ["index", "quote"],
    rights_approved: true,
    source_url: "https://example.org/synthetic",
    sources: [
      {
        role: "original",
        title: "Synthetic original",
        author: "Nobody",
        publication_year: 1800,
        url: "https://example.org/o",
        sha256: SHA,
        retrieved_at: "2026-10-14",
      },
      {
        role: "translation",
        title: "Synthetic translation",
        author: "Nobody",
        publication_year: 1880,
        url: "https://example.org/t",
        sha256: "b".repeat(64),
        retrieved_at: "2026-10-14",
      },
    ],
    hierarchy_levels: [],
    reviewers: ["Test reviewer A", "Test reviewer B"],
    reviewed_at: "2026-10-14",
    complete_coverage_confirmed: false,
  },
  expected_verses_per_chapter: { "1": 2, "2": 1 },
  translation: {
    language: "en",
    author: "Nobody",
    license_id: "public-domain",
    permission_proof: "synthetic-test-only",
  },
});
const verses = (): VerseRow[] => [
  {
    chapter: 1,
    verse: "1",
    original: "synthetic placeholder one",
    translation: "placeholder translation one",
  },
  {
    chapter: 1,
    verse: "2",
    original: "synthetic placeholder two",
    translation: "placeholder translation two",
  },
  {
    chapter: 2,
    verse: "1",
    original: "synthetic placeholder three",
    translation: "placeholder translation three",
  },
];

test("public-domain bundle builds, validates and produces client-acceptable passages", () => {
  const bundle = buildPublicDomainBundle(verses(), provenance());
  assert.equal(bundle.manifest.rights_class, "public_domain");
  assert.equal(bundle.manifest.expected_passage_count, 3);
  const prepared = prepareRelease(bundle);
  assert.equal(prepared.rows.length, 3);
  assert.match(prepared.rows[0].id, /^pd_[a-f0-9]{28}$/);
  assert.equal(prepared.rows[0].locator, "1.1");
  assert.match(
    prepared.rows[0].passage.reference,
    /^bhagavad-gita, chapter 1, verse 1 /,
  );
  assert.equal(
    validateRemotePassages(prepared.rows.map((r) => r.passage)).length,
    3,
  );
});

test("builder refuses gaps, duplicates and wrong counts", () => {
  assert.throws(
    () => buildPublicDomainBundle(verses().slice(1), provenance()),
    /has 1 verses; the edition declares 2/,
  );
  const gap = verses();
  gap[1].verse = "3";
  assert.throws(
    () => buildPublicDomainBundle(gap, provenance()),
    /Missing verse 1\.2/,
  );
  assert.throws(
    () => buildPublicDomainBundle([...verses(), verses()[0]], provenance()),
    /Duplicate verse 1\.1/,
  );
  const p = provenance();
  p.expected_verses_per_chapter = { "1": 2 };
  assert.throws(
    () => buildPublicDomainBundle(verses(), p),
    /Chapter 2 is not in the declared counts/,
  );
  const mixed = verses();
  delete mixed[0].translation;
  assert.throws(
    () => buildPublicDomainBundle(mixed, provenance()),
    /some do not/,
  );
});

test("open-source rights cannot be skipped or faked", () => {
  const rejects = (edit: (p: Provenance) => void, message: RegExp) => {
    const p = provenance();
    edit(p);
    assert.throws(() => buildPublicDomainBundle(verses(), p), message);
  };
  rejects(
    (p) => ((p.manifest as any).license_id = "all-rights-reserved"),
    /public-domain, CC0 or CC-BY/,
  );
  rejects((p) => (p.manifest.public_domain_basis = "short"), /free to use/);
  rejects(
    (p) => (p.manifest.reviewers = ["Only one"]),
    /Two distinct named reviewers/,
  );
  rejects((p) => (p.manifest.rights_approved = false), /reviewer must confirm/);
  rejects((p) => (p.manifest.sources[0].sha256 = "nothex"), /SHA-256/);
  rejects(
    (p) =>
      (p.manifest.sources = p.manifest.sources.filter(
        (s) => s.role !== "original",
      )),
    /original source file/,
  );
  rejects(
    (p) => ((p.manifest as any).work_id = "made-up-work"),
    /Unknown scripture work ID/,
  );
  rejects((p) => (p.manifest.license_id = "CC-BY-4.0"), /attribution/);
});

test("router still sends Gita Press bundles to the original strict validator", () => {
  assert.throws(
    () =>
      validateScriptureBundle({
        manifest: { publisher: "Someone else" },
        passages: [],
      }),
    /Gita Press, Gorakhpur/,
  );
});
