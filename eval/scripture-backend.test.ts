import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareRelease,
  publishRelease,
} from "../services/ingest/publish-scripture";
import {
  ScriptureBackend,
  cloudSearchQuery,
  validateRemotePassages,
} from "../packages/scripture-backend/client";
const fixture = () => ({
  manifest: {
    work_id: "vishnu-purana",
    publisher: "Gita Press",
    publisher_location: "Gorakhpur",
    edition_id: "test-only-edition",
    catalogue_code: "test-only",
    print_year: 2020,
    release: "test-only-1",
    completeness: "selected",
    license_id: "test-only",
    permission_proof: "test-only-not-a-source",
    permissions: ["index", "quote"],
    rights_approved: true,
    source_url: "https://example.org/test-only",
    hierarchy_levels: ["amsha"],
    reviewers: ["Test-only A", "Test-only B"],
    reviewed_at: "2026-10-13",
    expected_passage_count: 2,
    complete_coverage_confirmed: false,
  },
  passages: [1, 2].map((value) => ({
    hierarchy: [{ name: "amsha", value: String(value) }],
    chapter: 2,
    verse: "3",
    original: `धर्म सत्य ${value}`,
    source_locator: {
      volume: "1",
      printed_page: 12 + value,
      pdf_page: 15 + value,
      asset_sha256: "a".repeat(64),
    },
  })),
});
test("cloud search preserves scoped hierarchical citations, hashes and audio permission", async () => {
  const prepared = prepareRelease(fixture());
  let payload: any;
  const backend = new ScriptureBackend(
    "https://example.supabase.co",
    "sb_publishable_test",
    async (address, options) => {
      assert.ok(String(address).endsWith("/rpc/search_scripture"));
      assert.equal((options?.headers as any).Authorization, undefined);
      payload = JSON.parse(String(options?.body));
      return Response.json([prepared.rows[0].passage]);
    },
  );
  const answer = await backend.search("Vishnu 1.2.3 dharma", {
    work_ids: ["vishnu-purana"],
    translation_language: "Sanskrit",
  });
  assert.equal(payload.exact_locator, "1.2.3");
  assert.equal(payload.selected_language, "sa");
  assert.deepEqual(payload.selected_works, ["vishnu-purana"]);
  assert.equal(answer.support_state, "DIRECT");
  assert.equal(answer.safe_to_speak, false);
  assert.equal(answer.claims[0].text, answer.citations[0].original);
  assert.ok(answer.caveats.some((c) => c.includes("selected")));
  assert.ok(cloudSearchQuery("dharma").includes("धर्म"));
});
test("remote fixture, tampered text and out-of-scope source cannot become scripture evidence", () => {
  const row = prepareRelease(fixture()).rows[0].passage;
  for (const change of [
    { review_status: "fixture" },
    { original: "altered" },
    { translation: "altered" },
  ])
    assert.throws(() => validateRemotePassages([{ ...row, ...change }]));
  assert.throws(() =>
    validateRemotePassages([row], { work_ids: ["skanda-purana"] }),
  );
  assert.throws(() => validateRemotePassages([row, row]));
  assert.throws(
    () => new ScriptureBackend("http://example.org", "sb_publishable_test"),
  );
  assert.throws(
    () => new ScriptureBackend("https://example.org", "sb_secret_never-in-app"),
  );
});
test("a missing backend is distinguishable from an empty reviewed corpus", async () => {
  const unavailable = new ScriptureBackend(
    "https://example.org",
    "test",
    async () => Response.json({}, { status: 404 }),
  );
  await assert.rejects(() => unavailable.search("धर्म"), /not been configured/);
  const empty = new ScriptureBackend("https://example.org", "test", async () =>
    Response.json([]),
  );
  assert.equal((await empty.search("धर्म")).support_state, "NOT_VERIFIED");
});
test("ingestion validates first and never publishes after a failed passage batch", async () => {
  const paths: string[] = [];
  await assert.rejects(
    () =>
      publishRelease(
        fixture(),
        "https://example.org",
        "sb_secret_test-only",
        async (address, options) => {
          paths.push(String(address));
          return options?.method === "GET"
            ? Response.json([])
            : new Response("", {
                status: String(address).includes("scripture_passages")
                  ? 503
                  : 201,
              });
        },
      ),
    /remains unpublished/,
  );
  assert.equal(
    paths.some((p) => p.includes("publish_scripture_release")),
    false,
  );
  let requests = 0;
  const invalid = fixture();
  invalid.manifest.rights_approved = false;
  await assert.rejects(() =>
    publishRelease(invalid, "https://example.org", "test", async () => {
      requests++;
      return Response.json([]);
    }),
  );
  assert.equal(requests, 0);
});

test("an interrupted unpublished import resumes, while published releases cannot change", async () => {
  const prepared = prepareRelease(fixture());
  const writes: string[] = [];
  const request: typeof fetch = async (address, options) => {
    if (options?.method === "GET")
      return Response.json([
        {
          id: prepared.release.id,
          published: false,
          manifest: prepared.release.manifest,
        },
      ]);
    writes.push(String(address));
    return new Response("", { status: 201 });
  };
  await publishRelease(
    fixture(),
    "https://example.org",
    "sb_secret_test-only",
    request,
  );
  assert.ok(writes[0].includes("on_conflict=id"));
  assert.ok(writes[1].includes("publish_scripture_release"));
  await assert.rejects(
    () =>
      publishRelease(
        fixture(),
        "https://example.org",
        "sb_secret_test-only",
        async () =>
          Response.json([
            {
              id: prepared.release.id,
              published: true,
              manifest: prepared.release.manifest,
            },
          ]),
      ),
    /immutable/,
  );
});
