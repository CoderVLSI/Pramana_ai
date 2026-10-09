import { test } from "node:test";
import assert from "node:assert/strict";
import { answerStrict, search, verify } from "../services/api/src/engine";
import { passages } from "../services/api/src/corpus";
test("exact citation resolves and preserves original", () => {
  const a = answerStrict("Bhagavad Gita 2.47");
  assert.equal(a.citations[0].id, "fixture_bg_2_47");
  assert.equal(a.citations[0].original, passages[0].original);
  assert.ok(verify(a, a.citations));
  assert.equal(a.safe_to_speak, false);
});
test("absent references and unsupported identities abstain", () => {
  for (const q of [
    "Gita 99.999",
    "Was Jara Vali reborn?",
    "Is Draupadi Shachi or Shri?",
    "Is Ashwatthama the next Vyasa?",
    "What is quantum computing?",
  ]) {
    const a = answerStrict(q);
    assert.equal(a.support_state, "NOT_VERIFIED");
    assert.equal(a.citations.length, 0);
    assert.equal(a.safe_to_speak, false);
  }
});
test("work and edition filters prevent cross-edition attribution", () => {
  assert.equal(search("Gita 2.47", { edition_ids: ["gita-press"] }).length, 0);
  assert.equal(search("action", { work_ids: ["mahabharata"] }).length, 0);
});
test("citation gate rejects invented IDs, tampering, and changed spans", () => {
  for (const mutate of [
    (a: any) => (a.claims[0].evidence_ids = ["invented"]),
    (a: any) => (a.claims[0].text = "invented quotation"),
    (a: any) => (a.claims[0].quote_span = [1, 20]),
    (a: any) => (a.citations[0].edition_id = "gita-press"),
    (a: any) => (a.corpus_release = "other"),
    (a: any) => (a.safe_to_speak = true),
  ]) {
    const a = answerStrict("Gita 2.47");
    mutate(a);
    assert.equal(verify(a, passages), false);
  }
});
