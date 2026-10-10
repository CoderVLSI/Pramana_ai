import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadApprovedCorpus,
  approvedCorpusStatus,
} from "../services/api/src/approved-rag";
import { answerStrict, search, verify } from "../services/api/src/engine";
const bundle = (audio = false, translationAudio = false) => ({
  manifest: {
    work_id: "vishnu-purana",
    publisher: "Gita Press",
    publisher_location: "Gorakhpur",
    edition_id: "test-reviewed",
    catalogue_code: "48",
    print_year: 2020,
    release: "reviewed-test-1",
    completeness: "complete",
    license_id: "test",
    permission_proof: "test-only proof",
    permissions: ["index", "quote", ...(audio ? ["audio"] : [])],
    rights_approved: true,
    source_url: "https://example.org/test-only",
    hierarchy_levels: ["amsha"],
    reviewers: ["Test reviewer A", "Test reviewer B"],
    reviewed_at: "2026-10-10",
    expected_passage_count: 2,
    complete_coverage_confirmed: true,
  },
  passages: [1, 2].map((amsha) => ({
    hierarchy: [{ name: "amsha", value: String(amsha) }],
    chapter: 2,
    verse: "3",
    original: `सत्य धर्म ${amsha}`,
    source_locator: {
      volume: "1",
      printed_page: 25 + amsha,
      pdf_page: 30 + amsha,
      asset_sha256: "a".repeat(64),
    },
    translation: {
      text: `Truth duty ${amsha}`,
      language: "en",
      author: "Test only",
      license_id: "test",
      permission_proof: "test",
      permissions: ["index", "quote", ...(translationAudio ? ["audio"] : [])],
    },
  })),
});
test("approved packs support scoped BM25 and hierarchy citations, reject tampering and unauthorized speech", () => {
  const dir = mkdtempSync(join(tmpdir(), "pramana-approved-"));
  try {
    writeFileSync(join(dir, "reviewed.json"), JSON.stringify(bundle(true)));
    assert.equal(loadApprovedCorpus(dir).approved_passages, 2);
    const selection = {
      work_ids: ["vishnu-purana"],
      edition_ids: ["test-reviewed"],
    };
    assert.equal(search("truth", selection).length, 2);
    assert.equal(search("truth", { work_ids: ["shiva-purana"] }).length, 0);
    assert.equal(search("truth", { edition_ids: ["other"] }).length, 0);
    const a = answerStrict("1.2.3", selection);
    assert.equal(a.claims.length, 1);
    assert.equal(a.claims[0].text, "Truth duty 1");
    assert.equal(a.citations[0].source_locator?.printed_page, 26);
    assert.equal(a.safe_to_speak, false); // Original audio approval cannot authorize a translation.
    assert.equal(verify(a, a.citations), true);
    const tampered = structuredClone(a);
    tampered.citations[0].translation = "Invented";
    assert.equal(verify(tampered, tampered.citations), false);
    const altered = structuredClone(a);
    altered.claims[0].text = "Invented";
    assert.equal(verify(altered, a.citations), false);
    const release = structuredClone(a);
    release.corpus_release = "other";
    assert.equal(verify(release, a.citations), false);
    writeFileSync(
      join(dir, "reviewed.json"),
      JSON.stringify(bundle(false, true)),
    );
    loadApprovedCorpus(dir);
    assert.equal(answerStrict("1.2.3", selection).safe_to_speak, true);
    const originalOnly = bundle(true) as any;
    originalOnly.passages.forEach((p: any) => {
      delete p.translation;
      p.verse = "3-4";
    });
    writeFileSync(join(dir, "reviewed.json"), JSON.stringify(originalOnly));
    loadApprovedCorpus(dir);
    const originalAnswer = answerStrict("धर्म", selection);
    assert.equal(originalAnswer.safe_to_speak, true);
    assert.equal(originalAnswer.citations[0].quote_source, "original");
    assert.equal(originalAnswer.citations[0].verse, 0);
    assert.equal(originalAnswer.citations[0].exact_verse, "3-4");
    assert.equal(
      originalAnswer.claims[0].text,
      originalAnswer.citations[0].original,
    );
    const unreviewed = bundle();
    unreviewed.manifest.reviewers = ["Only one"];
    writeFileSync(join(dir, "reviewed.json"), JSON.stringify(unreviewed));
    assert.equal(loadApprovedCorpus(dir).approved_passages, 0);
    const invalid = bundle();
    invalid.manifest.rights_approved = false;
    writeFileSync(join(dir, "reviewed.json"), JSON.stringify(invalid));
    assert.equal(loadApprovedCorpus(dir).approved_passages, 0);
    assert.equal(approvedCorpusStatus().rejected.length, 1);
    assert.equal(
      answerStrict("1.2.3", selection).support_state,
      "NOT_VERIFIED",
    );
  } finally {
    loadApprovedCorpus("");
    rmSync(dir, { recursive: true, force: true });
  }
});
