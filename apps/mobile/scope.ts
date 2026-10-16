import {
  GITA_PRESS_SCOPE,
  MAHAPURANA_TARGETS,
} from "../../packages/corpus-schema/register";
import {
  UPANISHAD_SCOPE,
  UPANISHAD_TARGETS,
} from "../../packages/corpus-schema/upanishads";

/** Everything Pramana has published so far (the Gita and the Upanishads); the default search area. */
export const ALL_SCOPE = "pramana-all";

export function workIdsForScope(scope: string): string[] {
  if (scope === ALL_SCOPE)
    return ["bhagavad-gita", ...UPANISHAD_TARGETS.map(([id]) => id)];
  if (scope === GITA_PRESS_SCOPE) return MAHAPURANA_TARGETS.map(([id]) => id);
  if (scope === UPANISHAD_SCOPE) return UPANISHAD_TARGETS.map(([id]) => id);
  return [scope];
}
