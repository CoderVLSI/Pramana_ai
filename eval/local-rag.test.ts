import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { LocalScriptureIndex } from "../packages/corpus-schema/local-index";
import {
  scriptureDigest,
  type GitaPressBundle,
} from "../packages/corpus-schema/gita-press";
import { DeviceClient } from "../packages/provider-client/device-client";

// Artificial review records for tests only; never shipped as scripture packs.
function bundle(work = "vishnu-purana", audio = false): GitaPressBundle {
  return {
    manifest: {
      work_id: work,
      publisher: "Gita Press",
      publisher_location: "Gorakhpur",
      edition_id: "TEST-ONLY",
      catalogue_code: "TEST",
      print_year: 2026,
      release: "TEST-ONLY",
      completeness: "selected",
      complete_coverage_confirmed: false,
      license_id: "TEST-NOT-A-LICENSE",
      permission_proof: "TEST-NOT-PERMISSION",
      rights_approved: true,
      permissions: ["index", "quote", "audio"],
      source_url: "https://example.org/test-only",
      hierarchy_levels: ["amsha"],
      reviewers: ["Test A", "Test B"],
      reviewed_at: "2026-10-10",
      expected_passage_count: 2,
    },
    passages: [1, 2].map((section) => ({
      hierarchy: [{ name: "amsha", value: String(section) }],
      chapter: 2,
      verse: "3",
      original: `TEST ONLY धर्म सत्य ${section}`,
      source_locator: {
        volume: "TEST",
        printed_page: 20 + section,
        pdf_page: 25 + section,
        asset_sha256: "a".repeat(64),
      },
      translation: {
        text: `TEST ONLY truth duty ${section}`,
        language: "en",
        author: "Test only",
        license_id: "TEST",
        permission_proof: "TEST",
        permissions: ["index", "quote", ...(audio ? ["audio" as const] : [])],
      },
    })),
  };
}
test("portable UTF-8 hashes match Node for Sanskrit, emoji and lone surrogates without TextEncoder", () => {
  const saved = globalThis.TextEncoder;
  try {
    (globalThis as any).TextEncoder = undefined;
    for (const text of ["", "धर्म सत्य", "𑀥🕉️", "\ud800", "ASCII"])
      assert.equal(
        scriptureDigest(text),
        createHash("sha256").update(text).digest("hex"),
      );
  } finally {
    globalThis.TextEncoder = saved;
  }
});
test("local packs preserve scoped verse, volume and exact quotation provenance", () => {
  const index = new LocalScriptureIndex([bundle(), bundle("shiva-purana")]);
  assert.equal(index.status().approved_passages, 4);
  const answer = index.answer("1.2.3", { work_ids: ["vishnu-purana"] });
  assert.equal(answer.citations.length, 1);
  assert.equal(answer.claims[0].text, "TEST ONLY truth duty 1");
  assert.equal(answer.citations[0].source_locator?.printed_page, 21);
  assert.equal(answer.citations[0].hierarchy?.[0].value, "1");
  assert.equal(answer.safe_to_speak, false); // Original audio rights don't authorize translation audio.
  assert.ok(answer.caveats.some((s) => s.includes("selected")));
  assert.equal(
    index.answer("धर्म", { work_ids: ["vishnu-purana"] }).citations.length,
    2,
  );
  assert.equal(
    index.answer("truth", { work_ids: ["mahabharata"] }).support_state,
    "NOT_VERIFIED",
  );
  assert.equal(
    index.answer("truth", { edition_ids: ["other"] }).citations.length,
    0,
  );
  answer.citations[0].original = "tampered";
  assert.notEqual(
    index.answer("1.2.3", { work_ids: ["vishnu-purana"] }).citations[0]
      .original,
    "tampered",
  );
});
test("unreviewed and duplicate packs cannot enter local retrieval; restart reconstructs the same index", () => {
  const pack = bundle();
  assert.deepEqual(
    new LocalScriptureIndex([JSON.parse(JSON.stringify(pack))]).answer("1.2.3"),
    new LocalScriptureIndex([pack]).answer("1.2.3"),
  );
  assert.throws(() => new LocalScriptureIndex([pack, pack]), /Duplicate/);
  pack.manifest.rights_approved = false;
  assert.throws(() => new LocalScriptureIndex([pack]), /approval/);
  assert.equal(
    new LocalScriptureIndex().answer("anything").citations.length,
    0,
  );
});
test("local reference lookup preserves exact verse ranges rather than inventing a single verse", () => {
  const pack = bundle();
  pack.passages[0].verse = "3-4";
  const answer = new LocalScriptureIndex([pack]).answer("1.2.3-4");
  assert.equal(answer.citations.length, 1);
  assert.equal(answer.citations[0].exact_verse, "3-4");
  assert.equal(answer.citations[0].verse, 0);
});
test("device study uses installed evidence without an API key or network, and respects source audio permissions", async () => {
  const index = new LocalScriptureIndex([bundle("vishnu-purana", true)]);
  let requests = 0,
    credentialReads = 0;
  const client = new DeviceClient(
    {
      get: async () => {
        credentialReads++;
        return null;
      },
      set: async () => {},
      remove: async () => {},
    },
    (async () => {
      requests++;
      throw Error("Network must not be called for local hits");
    }) as typeof fetch,
    async (query, work_ids) => index.answer(query, { work_ids }),
  );
  const result = await client.study({
    query: "1.2.3",
    work_ids: ["vishnu-purana"],
  });
  assert.equal(result.answer.support_state, "DIRECT");
  assert.equal(result.web.source_status, "local_verified");
  assert.equal(credentialReads, 0);
  assert.equal(requests, 0);
  const voice = await client.voiceTurn(
    { query: "1.2.3", work_ids: ["vishnu-purana"] },
    false,
  );
  assert.equal(voice.kind, "verified_scripture");
  assert.equal(voice.text, "TEST ONLY truth duty 1");
});
