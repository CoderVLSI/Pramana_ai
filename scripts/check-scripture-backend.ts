import { ScriptureBackend } from "../packages/scripture-backend/client";
import {
  CLOUD_PROJECT_URL,
  CLOUD_PUBLISHABLE_KEY,
} from "../apps/mobile/cloud-config";
async function main() {
  const backend = new ScriptureBackend(
    CLOUD_PROJECT_URL,
    CLOUD_PUBLISHABLE_KEY,
  );
  const catalog = await backend.catalog();
  console.log(
    JSON.stringify({ status: "backend_reachable", catalog }, null, 2),
  );
  if (process.argv[2]) {
    const answer = await backend.search(
      process.argv[2],
      process.argv[3] ? { work_ids: [process.argv[3]] } : {},
    );
    console.log(
      JSON.stringify(
        {
          support_state: answer.support_state,
          citations: answer.citations.map((p) => ({
            id: p.id,
            reference: p.reference,
          })),
          safe_to_speak: answer.safe_to_speak,
        },
        null,
        2,
      ),
    );
  }
}
void main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Scripture backend check failed.",
  );
  process.exitCode = 1;
});
