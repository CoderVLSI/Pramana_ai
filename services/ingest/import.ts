import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
// Deliberately refuses unreviewed or rights-uncleared production content.
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw Error(
    "Usage: npx tsx services/ingest/import.ts input.json output.json",
  );
const bundle = JSON.parse(await readFile(input, "utf8"));
const m = bundle.manifest;
if (
  !m?.edition_id ||
  !m?.license_id ||
  !m?.release ||
  m.rights_approved !== true ||
  !Array.isArray(m.reviewers) ||
  m.reviewers.length < 2 ||
  new Set(m.reviewers).size < 2 ||
  !m.permission_proof ||
  !m.publisher ||
  !m.source_url
)
  throw Error(
    "Manifest requires an edition, license, release, publisher, source URL, permission proof, rights approval and two independent reviewers.",
  );
if (!Array.isArray(bundle.passages) || !bundle.passages.length)
  throw Error("No passages");
const ids = new Set<string>();
const passages = bundle.passages.map((p: any) => {
  if (
    !p.work_id ||
    !Number.isInteger(p.chapter) ||
    p.chapter < 1 ||
    !Number.isInteger(p.verse) ||
    p.verse < 1 ||
    typeof p.original !== "string" ||
    !p.original.trim()
  )
    throw Error("Invalid passage");
  if (p.translation && !p.translation_license_id)
    throw Error("Translations require a separate license");
  const content_sha256 = createHash("sha256").update(p.original).digest("hex");
  const id =
    "pv_" +
    createHash("sha256")
      .update(
        `${m.edition_id}:${m.release}:${p.work_id}:${p.chapter}:${p.verse}`,
      )
      .digest("hex")
      .slice(0, 24);
  if (ids.has(id)) throw Error("Duplicate passage reference");
  ids.add(id);
  return {
    ...p,
    id,
    edition_id: m.edition_id,
    license_id: m.license_id,
    released_in: m.release,
    content_sha256,
    review_status: "approved",
  };
});
await writeFile(output, JSON.stringify({ manifest: m, passages }, null, 2), {
  flag: "wx",
});
console.log(
  `Validated ${passages.length} passages. Output created; not published or indexed.`,
);
