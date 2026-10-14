import { localScripture } from "./device-corpus";
import { CLOUD_PROJECT_URL, CLOUD_PUBLISHABLE_KEY } from "./cloud-config";
import {
  ScriptureBackend,
  type ScriptureSelection,
} from "../../packages/scripture-backend/client";

// Enable after the reviewed-corpus migration and first release are deployed.
// This switch does not affect provider keys, voice sockets or account login.
export const SCRIPTURE_BACKEND_ENABLED =
  process.env.EXPO_PUBLIC_SCRIPTURE_BACKEND_ENABLED === "true";
export const scriptureBackend = new ScriptureBackend(
  CLOUD_PROJECT_URL,
  CLOUD_PUBLISHABLE_KEY,
);
let unavailableUntil = 0;
export async function retrieveScripture(
  query: string,
  selection: ScriptureSelection & { evidence_mode?: string } = {},
) {
  const local = (await localScripture()).answer(query, selection);
  if (
    local.citations.length ||
    !SCRIPTURE_BACKEND_ENABLED ||
    selection.evidence_mode === "local"
  )
    return local;
  if (Date.now() < unavailableUntil)
    return {
      ...local,
      caveats: [
        ...local.caveats,
        "Scripture backend is temporarily unavailable; the cloud collection was not searched.",
      ],
    };
  try {
    const answer = await scriptureBackend.search(query, selection);
    return answer.citations.length
      ? answer
      : {
          ...local,
          caveats: [
            ...local.caveats,
            "No reviewed cloud passage matched either; this does not establish absence in scripture.",
          ],
        };
  } catch {
    unavailableUntil = Date.now() + 60000;
    return {
      ...local,
      caveats: [
        ...local.caveats,
        "Scripture backend could not be searched. Web fallback remains separate from verified scripture.",
      ],
    };
  }
}
