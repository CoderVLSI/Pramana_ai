import test from "node:test";
import assert from "node:assert/strict";
import { UPANISHAD_TARGETS, upanishadRegister } from "../packages/corpus-schema/upanishads";
import { answerStrict } from "../services/api/src/engine";
test("Muktika collection keeps 108 distinct pending sources and cannot answer using Gita fixtures", () => {
  assert.equal(UPANISHAD_TARGETS.length, 108);
  assert.equal(new Set(UPANISHAD_TARGETS.map(([id]) => id)).size, 108);
  assert.ok(upanishadRegister.every(work => work.indexed_passages === 0));
  const answer = answerStrict("Gita 2.47", {work_ids: UPANISHAD_TARGETS.map(([id]) => id)});
  assert.equal(answer.support_state, "NOT_VERIFIED");
  assert.equal(answer.citations.length, 0);
});
