/** Prepare source-data SQL outside Git for authenticated Supabase MCP publication.
 * Uses the identical prepareRelease path as the service-role HTTP publisher.
 * Execute the generated statements only after the isolated TEST gate passes.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { prepareRelease } from "../services/ingest/publish-scripture";

async function main() {
  const directory = process.argv[2];
  if (
    !directory ||
    !relative(process.cwd(), resolve(directory)).startsWith("..")
  )
    throw Error("Choose an output directory outside the repository.");
  const works = [
    "isha",
    "kena",
    "katha",
    "prashna",
    "mundaka",
    "mandukya",
    "taittiriya",
    "aitareya",
    "chandogya",
    "brihadaranyaka",
    "shvetashvatara",
  ];
  const all = await Promise.all(
    works.map(async (work) =>
      prepareRelease(
        JSON.parse(
          await readFile(
            `services/ingest/releases/${work}-open-1.bundle.json`,
            "utf8",
          ),
        ),
      ),
    ),
  );
  await mkdir(directory, { recursive: true });
  const literal = (value: unknown) =>
    "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
  const ids = all.map((p) => "'" + p.release.id + "'").join(",");
  await writeFile(
    resolve(directory, "00-releases.sql"),
    `begin; insert into public.scripture_releases(id,work_id,edition_id,manifest,published) select id,work_id,edition_id,manifest,published from jsonb_to_recordset(${literal(all.map((p) => p.release))}) as r(id text,work_id text,edition_id text,manifest jsonb,published boolean); commit; select id,published from public.scripture_releases where id in (${ids});\n`,
  );
  let batches = 0;
  for (const p of all)
    for (let offset = 0; offset < p.rows.length; offset += 50) {
      batches++;
      await writeFile(
        resolve(
          directory,
          `${String(batches).padStart(2, "0")}-${p.release.manifest.release}.sql`,
        ),
        `insert into public.scripture_passages(id,release_id,work_id,edition_id,chapter,exact_verse,locator,translation_language,passage) select id,release_id,work_id,edition_id,chapter,exact_verse,locator,translation_language,passage from jsonb_to_recordset(${literal(p.rows.slice(offset, offset + 50))}) as r(id text,release_id text,work_id text,edition_id text,chapter integer,exact_verse text,locator text,translation_language text,passage jsonb); select count(*) as staged_passages from public.scripture_passages where release_id='${p.release.id}';\n`,
      );
    }
  await writeFile(
    resolve(directory, "99-publish.sql"),
    `begin; ${all.map((p) => `select public.publish_scripture_release('${p.release.id}');`).join(" ")} commit; select id,work_id,published,(select count(*) from public.scripture_passages p where p.release_id=r.id) as passages from public.scripture_releases r where id in (${ids}) order by work_id;\n`,
  );
  await writeFile(
    resolve(directory, "index.json"),
    JSON.stringify(
      {
        batches,
        passages: all.reduce((n, p) => n + p.rows.length, 0),
        releases: all.map((p) => ({
          work_id: p.release.work_id,
          release_id: p.release.id,
          passages: p.rows.length,
        })),
        files: (await readdir(directory))
          .filter((f) => f.endsWith(".sql"))
          .sort(),
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      releases: all.length,
      batches,
      passages: all.reduce((n, p) => n + p.rows.length, 0),
      credentials_used: false,
    }),
  );
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Preparation failed");
  process.exitCode = 1;
});
