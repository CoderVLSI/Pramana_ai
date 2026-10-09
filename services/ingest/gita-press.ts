import { readFile, writeFile } from "node:fs/promises";
import { validateGitaPressBundle } from "../../packages/corpus-schema/gita-press";
const args = process.argv.slice(2),
  allowAbridged = args.includes("--allow-abridged"),
  files = args.filter((x) => x !== "--allow-abridged");
if (files.length !== 2)
  throw Error(
    "Usage: npm run ingest:gita-press -- input.json output.json [--allow-abridged]",
  );
const validated = validateGitaPressBundle(
  JSON.parse(await readFile(files[0], "utf8")),
  allowAbridged,
);
await writeFile(files[1], JSON.stringify(validated, null, 2), {
  flag: "wx",
  mode: 0o600,
});
console.log(
  `Prepared ${validated.passages.length} reviewed, rights-approved passages for ${validated.manifest.work_id}. Not automatically published or indexed.`,
);
