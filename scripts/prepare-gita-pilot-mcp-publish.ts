/** Keyless administrative publishing adapter. Output is source DATA SQL, not credentials.
 * Execute only after the isolated TEST gate passes. Generated files stay outside Git.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { prepareRelease } from "../services/ingest/publish-scripture";
async function main() {
  const directory = process.argv[2];
  if (
    !directory ||
    !relative(process.cwd(), resolve(directory)).startsWith("..")
  )
    throw Error("Choose an output directory outside the repository.");
  const prepared = prepareRelease(
    JSON.parse(
      await readFile(
        "services/ingest/releases/gita-open-1.bundle.json",
        "utf8",
      ),
    ),
  );
  await mkdir(directory, { recursive: true });
  const literal = (value: unknown) =>
    "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
  const id = prepared.release.id;
  await writeFile(
    resolve(directory, "release.sql"),
    `insert into public.scripture_releases(id,work_id,edition_id,manifest,published) select id,work_id,edition_id,manifest,published from jsonb_to_record(${literal(prepared.release)}) as r(id text,work_id text,edition_id text,manifest jsonb,published boolean); select id,published from public.scripture_releases where id='${id}';\n`,
  );
  for (let offset = 0; offset < prepared.rows.length; offset += 50) {
    const rows = prepared.rows.slice(offset, offset + 50);
    await writeFile(
      resolve(
        directory,
        `batch-${String(offset / 50 + 1).padStart(2, "0")}.sql`,
      ),
      `insert into public.scripture_passages(id,release_id,work_id,edition_id,chapter,exact_verse,locator,translation_language,passage) select id,release_id,work_id,edition_id,chapter,exact_verse,locator,translation_language,passage from jsonb_to_recordset(${literal(rows)}) as r(id text,release_id text,work_id text,edition_id text,chapter integer,exact_verse text,locator text,translation_language text,passage jsonb); select count(*) as staged_passages from public.scripture_passages where release_id='${id}';\n`,
    );
  }
  await writeFile(
    resolve(directory, "publish.sql"),
    `select public.publish_scripture_release('${id}'); select id,published from public.scripture_releases where id='${id}';\n`,
  );
  console.log(
    JSON.stringify({
      release_id: id,
      passages: prepared.rows.length,
      batches: 14,
      credentials_used: false,
    }),
  );
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Preparation failed");
  process.exitCode = 1;
});
