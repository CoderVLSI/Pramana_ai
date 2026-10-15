/** Validate first; stage bounded batches; publish only after a complete count check. */
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { scriptureDigest } from "../../packages/corpus-schema/gita-press";
import { validateScriptureBundle } from "../../packages/corpus-schema/public-domain";
import { normalizeSourceLanguage } from "../../packages/device-preferences";
export function prepareRelease(raw: unknown) {
  const { manifest, passages } = validateScriptureBundle(raw, true);
  const id =
    "release_" +
    scriptureDigest(
      JSON.stringify([manifest.work_id, manifest.edition_id, manifest.release]),
    ).slice(0, 32);
  const rows = passages.map((p: any) => {
    const quotation = p.translation?.text ?? p.original;
    const passage = {
      id: p.id,
      work_id: p.work_id,
      edition_id: p.edition_id,
      reference: [
        p.work_id,
        ...p.hierarchy.map((l: any) => `${l.name} ${l.value}`),
        `${manifest.chapter_label ?? "chapter"} ${p.chapter}`,
        `verse ${p.verse} (volume ${p.source_locator.volume}; ${p.source_locator.locator_kind === "etext" ? `e-text position ${p.source_locator.running_position ?? p.source_locator.printed_page}` : `scan page ${p.source_locator.pdf_page}; printed page ${p.source_locator.printed_page ?? "not mapped"}`})`,
      ].join(", "),
      chapter: p.chapter,
      verse: /^\d+$/.test(p.verse) ? Number(p.verse) : 0,
      exact_verse: p.verse,
      hierarchy: p.hierarchy,
      source_locator: p.source_locator,
      original: p.original,
      translation: quotation,
      translator: p.translation?.author ?? "Original source text",
      translation_language: p.translation
        ? normalizeSourceLanguage(p.translation.language)
        : "sa",
      keywords: [],
      review_status: "approved",
      ...(manifest.review_method
        ? {
            review_method: manifest.review_method,
            human_verse_review: manifest.human_verse_review,
            review_notice: manifest.review_notice,
          }
        : {}),
      license_id: p.license_id,
      released_in: p.released_in,
      content_sha256: p.content_sha256,
      translation_sha256: scriptureDigest(quotation),
      completeness: p.completeness,
      quote_source: p.translation ? "translation" : "original",
      audio_allowed: p.translation
        ? p.translation.permissions.includes("audio")
        : p.permissions.includes("audio"),
    };
    return {
      id: p.id,
      release_id: id,
      work_id: p.work_id,
      edition_id: p.edition_id,
      chapter: p.chapter,
      exact_verse: p.verse,
      locator: [
        ...p.hierarchy.map((l: any) => l.value),
        p.chapter,
        p.verse,
      ].join("."),
      translation_language: passage.translation_language,
      passage,
    };
  });
  return {
    release: {
      id,
      work_id: manifest.work_id,
      edition_id: manifest.edition_id,
      manifest,
      published: false,
    },
    rows,
  };
}
export async function publishRelease(
  raw: unknown,
  url: string,
  secret: string,
  request: typeof fetch = fetch,
) {
  const prepared = prepareRelease(raw);
  const address = new URL(url);
  if (
    address.protocol !== "https:" ||
    address.username ||
    address.password ||
    address.pathname !== "/" ||
    address.search ||
    address.hash
  )
    throw Error("Use the HTTPS Supabase project URL.");
  if (!secret || secret.startsWith("sb_publishable_"))
    throw Error(
      "Set a backend service-role key locally, never in the app or chat.",
    );
  async function call(path: string, method: string, body?: unknown) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await request(address.origin + "/rest/v1/" + path, {
        method,
        signal: controller.signal,
        headers: {
          apikey: secret,
          ...(secret.startsWith("sb_secret_")
            ? {}
            : { Authorization: `Bearer ${secret}` }),
          "Content-Type": "application/json",
          Prefer: path.startsWith("scripture_passages")
            ? "return=minimal,resolution=merge-duplicates"
            : "return=minimal",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok)
        throw Error(
          `Scripture ingestion failed (${response.status}); release remains unpublished.`,
        );
      return method === "GET" ? response.json() : undefined;
    } finally {
      clearTimeout(timer);
    }
  }
  const existing = await call(
    `scripture_releases?id=eq.${prepared.release.id}&select=id,published,manifest`,
    "GET",
  );
  if (existing.length) {
    if (
      existing[0].published ||
      !isDeepStrictEqual(existing[0].manifest, prepared.release.manifest)
    )
      throw Error(
        "Release already exists or its manifest changed. Published sources are immutable; use a new release identifier.",
      );
  } else await call("scripture_releases", "POST", prepared.release);
  for (let offset = 0; offset < prepared.rows.length; offset += 100)
    await call(
      "scripture_passages?on_conflict=id",
      "POST",
      prepared.rows.slice(offset, offset + 100),
    );
  await call("rpc/publish_scripture_release", "POST", {
    release_id: prepared.release.id,
  });
  return { release_id: prepared.release.id, passages: prepared.rows.length };
}
async function main() {
  const file = process.argv[2];
  if (!file)
    throw Error(
      "Usage: npx tsx services/ingest/publish-scripture.ts reviewed-bundle.json [--publish]",
    );
  const raw = JSON.parse(await readFile(file, "utf8"));
  if (process.argv.includes("--publish")) {
    console.log(
      await publishRelease(
        raw,
        process.env.SUPABASE_URL ?? "",
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      ),
    );
  } else {
    const result = prepareRelease(raw);
    console.log({
      status: "validated_not_uploaded",
      release_id: result.release.id,
      passages: result.rows.length,
    });
  }
}

if (process.argv[1]?.endsWith("publish-scripture.ts"))
  void main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Scripture ingestion failed.",
    );
    process.exitCode = 1;
  });
