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

const counts: Record<string, number> = {
  isha: 18,
  kena: 34,
  katha: 118,
  prashna: 67,
  mundaka: 64,
  mandukya: 12,
  taittiriya: 47,
  aitareya: 33,
  chandogya: 631,
  brihadaranyaka: 435,
  shvetashvatara: 113,
};
async function main() {
  const arg = (name: string) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? undefined : process.argv[i + 1];
  };
  const url = arg("--url") ?? CLOUD_PROJECT_URL;
  const key = process.env.GITA_VERIFY_PUBLIC_KEY ?? CLOUD_PUBLISHABLE_KEY;
  const backend = new ScriptureBackend(url, key);
  const catalog = await backend.catalog();
  const pages: ReturnType<typeof validateRemotePassages> = [];
  for (let offset = 0; offset < 100000; offset += 50) {
    const response = await fetch(`${url}/rest/v1/rpc/scripture_page`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ page_offset: offset, page_limit: 50 }),
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, 200, "scripture_page HTTP status");
    const page = validateRemotePassages(await response.json(), {}, 50);
    pages.push(...page);
    if (page.length < 50) break;
  }
  assert.equal(pages.length, catalog.approved_passages);
  assert.equal(new Set(pages.map((p) => p.id)).size, pages.length);
  const transcription = JSON.parse(
    await readFile(
      "docs/upanishads-pilot/upanishads-1906-nirnaya-sagar-ai-transcription.json",
      "utf8",
    ),
  );
  const reports = [];
  for (const [short, count] of Object.entries(counts)) {
    const raw = JSON.parse(
      await readFile(
        `services/ingest/releases/${short}-open-1.bundle.json`,
        "utf8",
      ),
    );
    const expected = prepareRelease(raw),
      manifest = expected.release.manifest;
    assert.equal(expected.rows.length, count);
    const input = transcription.filter(
      (p: any) =>
        p.work === manifest.work_id && /^\d+$/.test(String(p.verse ?? "")),
    );
    assert.deepEqual(
      raw.passages.map((p: any) => p.original),
      input.map((p: any) => p.text),
      "Unchanged transcription text",
    );
    assert.equal(
      catalog.releases.find((r) => r.id === expected.release.id)?.passage_count,
      count,
    );
    const selection = {
      work_ids: [manifest.work_id],
      edition_ids: [manifest.edition_id],
      translation_language: "sa",
    };
    const released = pages.filter(
      (p) =>
        p.work_id === manifest.work_id &&
        p.edition_id === manifest.edition_id &&
        p.released_in === manifest.release,
    );
    assert.equal(released.length, count);
    const byId = new Map(released.map((p) => [p.id, p]));
    for (const row of expected.rows) {
      const stored = byId.get(row.id);
      assert.ok(stored);
      assert.deepEqual(
        stored,
        row.passage,
        "Published record equals prepared record",
      );
      assert.equal(stored.print_year, 1906);
      assert.equal(stored.human_verse_review, false);
      assert.equal(stored.review_method, manifest.review_method);
      assert.equal(stored.review_notice, manifest.review_notice);
      assert.equal(stored.audio_allowed, false);
      assert.equal(stored.translation, stored.original);
    }
    const reference = short === "katha" ? "1.2.20" : expected.rows[0].locator;
    const target = expected.rows.find((r) => r.locator === reference)!;
    assert.ok(target);
    const numbered = await backend.search(reference, selection);
    assert.equal(numbered.citations.length, 1);
    assert.equal(numbered.citations[0].id, target.id);
    const word = target.passage.original
      .match(/[\p{L}\p{M}\p{N}\uA8F3]+/gu)
      ?.find(
        (s: string) =>
          /[\u0900-\u097f]/u.test(s) && s.length >= 6 && s.length <= 80,
      );
    assert.ok(word, "Searchable Devanagari word");
    const searched = await backend.search(word, selection);
    assert.ok(
      searched.citations.length > 0,
      `${manifest.work_id}: no word search results for ${word}`,
    );
    assert.ok(searched.citations.every((p) => p.original.includes(word)));
    const record = await backend.record(target.id);
    assert.equal(record.original, target.passage.original);
    assert.equal(record.print_year, 1906);
    assert.deepEqual(record.source_locator, target.passage.source_locator);
    assert.ok(record.context.length > 0 && record.context.length <= 5);
    assert.ok(record.context.some((p) => p.id === record.id));
    for (const field of ["original", "translation"] as const) {
      const bad = structuredClone(numbered.citations[0]);
      bad[field] += "tampered";
      assert.throws(() => validateRemotePassages([bad]));
    }
    reports.push({
      work_id: manifest.work_id,
      release: manifest.release,
      release_id: expected.release.id,
      passages: count,
      status: "all_checks_passed",
      word_search: { query: word, hits: searched.citations.length },
      reference_search: { query: reference, hits: 1, passage_id: target.id },
      scripture_page: { verified_records: count },
      scripture_record: {
        context_count: record.context.length,
        scan_page: record.source_locator.pdf_page,
        printed_page: record.source_locator.printed_page,
      },
      hash_checks: {
        originals: count,
        quotations: count,
        tamper_rejected: true,
      },
      source_locators_verified: count,
      print_year: 1906,
      human_verse_review: false,
      audio_allowed: false,
    });
  }
  // Existing Gita originals remain intact alongside the new works (year metadata is additive).
  const gita = prepareRelease(
    JSON.parse(
      await readFile(
        "services/ingest/releases/gita-open-1.bundle.json",
        "utf8",
      ),
    ),
  );
  const old = pages.filter(
    (p) => p.work_id === "bhagavad-gita" && p.released_in === "gita-open-1",
  );
  assert.equal(old.length, 700);
  const oldById = new Map(old.map((p) => [p.id, p]));
  for (const row of gita.rows)
    assert.equal(oldById.get(row.id)?.original, row.passage.original);
  const report = {
    status: "all_checks_passed",
    endpoint: url,
    catalog_total: catalog.approved_passages,
    upanishad_passages: reports.reduce((n, r) => n + r.passages, 0),
    works: reports,
    gita_regression: { passages: 700, originals_unchanged: true },
    pagination: { all_records: pages.length, page_size: 50 },
    human_verse_review: false,
  };
  if (arg("--out"))
    await writeFile(arg("--out")!, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Verification failed");
  process.exitCode = 1;
});
