import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  ScriptureBackend,
  validateRemotePassages,
} from "../packages/scripture-backend/client";
import { prepareRelease } from "../services/ingest/publish-scripture";
import {
  CLOUD_PROJECT_URL,
  CLOUD_PUBLISHABLE_KEY,
} from "../apps/mobile/cloud-config";
async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : process.argv[i + 1];
  };
  const url = arg("--url") ?? CLOUD_PROJECT_URL;
  const key = process.env.GITA_VERIFY_PUBLIC_KEY ?? CLOUD_PUBLISHABLE_KEY;
  const raw = JSON.parse(
    await readFile("services/ingest/releases/gita-open-1.bundle.json", "utf8"),
  );
  const expected = prepareRelease(raw);
  const backend = new ScriptureBackend(url, key);
  async function rpc(name: string, body: object) {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, 200, `${name}: HTTP ${response.status}`);
    return response.json();
  }
  const catalog = await backend.catalog();
  assert.equal(
    catalog.releases.find((r) => r.id === expected.release.id)?.passage_count,
    700,
  );
  const selection = {
    work_ids: ["bhagavad-gita"],
    edition_ids: ["apte-anandashram-34-1909-shankara-700"],
    translation_language: "sa",
  };
  const word = await backend.search("कर्मण्येवाधिकारस्ते", selection);
  assert.ok(
    word.citations.some((p) => p.chapter === 2 && p.exact_verse === "47"),
  );
  const numbered = await backend.search("2.47", selection);
  assert.equal(numbered.citations.length, 1);
  const verse = numbered.citations[0];
  const expectedVerse = expected.rows.find(
    (r) => r.chapter === 2 && r.exact_verse === "47",
  )!;
  assert.equal(verse.original, expectedVerse.passage.original);
  const record = await backend.record(verse.id);
  assert.equal(record.source_locator.pdf_page, 93);
  assert.equal(record.source_locator.printed_page, null);
  assert.equal(record.human_verse_review, false);
  assert.equal(record.audio_allowed, false);
  const rows: any[] = [];
  for (let offset = 0; offset < 5000; offset += 50) {
    const page = validateRemotePassages(
      await rpc("scripture_page", { page_offset: offset, page_limit: 50 }),
      {},
      50,
    );
    rows.push(...page);
    if (page.length < 50) break;
  }
  const released = rows.filter(
    (p) =>
      p.work_id === selection.work_ids[0] &&
      p.edition_id === selection.edition_ids[0] &&
      p.released_in === "gita-open-1",
  );
  assert.equal(released.length, 700);
  const byId = new Map(released.map((p) => [p.id, p]));
  assert.equal(byId.size, 700);
  for (const p of expected.rows) {
    const stored = byId.get(p.id);
    assert.ok(stored);
    assert.equal(stored.original, p.passage.original);
    assert.equal(stored.content_sha256, p.passage.content_sha256);
    assert.equal(stored.translation, p.passage.original);
    assert.deepEqual(stored.source_locator, p.passage.source_locator);
    assert.equal(stored.review_method, "ai_only_owner_accepted");
    assert.equal(stored.license_id, "public-domain");
    assert.equal(stored.human_verse_review, false);
    assert.equal(stored.audio_allowed, false);
  }
  const damaged = structuredClone(verse);
  damaged.original += "tampered";
  assert.throws(() => validateRemotePassages([damaged]));
  const report = {
    status: "all_checks_passed",
    endpoint: url,
    release_id: expected.release.id,
    catalog_total: catalog.approved_passages,
    pilot_passages: released.length,
    word_search: {
      query: "कर्मण्येवाधिकारस्ते",
      hits: word.citations.length,
      includes_2_47: true,
    },
    reference_search: {
      query: "2.47",
      hits: numbered.citations.length,
      passage_id: verse.id,
    },
    scripture_page: { verified_records: released.length, page_size: 50 },
    scripture_record: {
      id: record.id,
      scan_page: 93,
      printed_page: null,
      context_count: record.context.length,
    },
    client_hash_checks: {
      originals: 700,
      quotations: 700,
      tamper_rejected: true,
    },
    source_locators_verified: 700,
    human_verse_review: false,
    safe_to_speak: numbered.safe_to_speak,
    translation: "Sanskrit quotation only; no translation source",
  };
  if (arg("--out"))
    await writeFile(arg("--out")!, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Pilot verification failed",
  );
  process.exitCode = 1;
});
