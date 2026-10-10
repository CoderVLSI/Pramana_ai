import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizePreferences,
  addHistory,
  EMPTY_PREFERENCES,
  normalizeSourceLanguage,
} from "../packages/device-preferences";

test("damaged local preferences recover defaults and bounded records without unexpected data", () => {
  const state = normalizePreferences({
    reading: {
      fontSize: 900,
      lineSpacing: NaN,
      voiceRate: -1,
      appearance: "bad",
      display: "bad",
    },
    history: [{ id: "bad", at: "bad-date", query: "x" }],
    notes: JSON.parse(
      '{"__proto__":{"note":"evil"},"valid":{"folder":"Study","note":"Reflection"}}',
    ),
    keys: { secret: "must not persist" },
  });
  assert.equal(state.reading.fontSize, 30);
  assert.equal(state.reading.lineSpacing, 1.6);
  assert.equal(state.reading.voiceRate, 0.75);
  assert.equal(state.reading.appearance, "system");
  assert.equal(state.history.length, 0);
  assert.equal(Object.hasOwn(state.notes, "__proto__"), false);
  assert.equal(state.notes.valid.note, "Reflection");
  assert.equal(JSON.stringify(state).includes("must not persist"), false);
});
test("history persists only bounded text snapshots and keeps evidence distinctions", () => {
  let state = EMPTY_PREFERENCES;
  for (let i = 0; i < 65; i++)
    state = addHistory(state, {
      id: String(i),
      query: "Question " + i,
      at: new Date(i).toISOString(),
      scope: "gita",
      text: "reply",
      evidence: i === 64 ? "web" : "local",
      references: [],
    });
  assert.equal(state.history.length, 50);
  assert.equal(state.history[0].id, "64");
  assert.equal(state.history[0].evidence, "web");
  assert.equal(state.history.at(-1)?.id, "15");
  assert.deepEqual(
    normalizePreferences(JSON.parse(JSON.stringify(state))),
    state,
  );
  assert.deepEqual(normalizePreferences({ ...state, history: [] }).history, []);
});
test("notes, folders and reading positions remain separate from source text", () => {
  const state = normalizePreferences({
    notes: { p: { folder: "  Inquiry  ", note: "A personal interpretation" } },
    positions: { work: { id: "p", reference: "1.2", at: "now" } },
  });
  assert.equal(state.notes.p.folder, "Inquiry");
  assert.equal(state.positions.work.id, "p");
  assert.equal(normalizeSourceLanguage("Hindi"), "hi");
  assert.equal(normalizeSourceLanguage("en-IN"), "en");
  assert.equal(normalizeSourceLanguage(undefined), "");
});

test("personal memory is opt-in, separate from scratchpad/history and requires review", async () => {
  const {
    memorySuggestion,
    proposeMemory,
    approvedMemoryContext,
    containsCredential,
  } = await import("../packages/device-preferences");
  const suggestion = memorySuggestion(
    "Remember that I prefer concise explanations in Hindi",
  );
  assert.equal(suggestion, "I prefer concise explanations in Hindi");
  let state = proposeMemory(EMPTY_PREFERENCES, suggestion!);
  assert.equal(state.memory.suggestions.length, 1);
  assert.deepEqual(approvedMemoryContext(state), []);
  state = normalizePreferences({
    ...state,
    memory: {
      ...state.memory,
      scratchpad: "PRIVATE NOTE NEVER UPLOADED",
      approved: state.memory.suggestions,
      useWithAI: true,
    },
  });
  assert.deepEqual(approvedMemoryContext(state), [
    "I prefer concise explanations in Hindi",
  ]);
  assert.equal(
    JSON.stringify(approvedMemoryContext(state)).includes("PRIVATE NOTE"),
    false,
  );
  assert.equal(
    memorySuggestion("My api key is sk-1234567890123456789012345"),
    undefined,
  );
  assert.equal(containsCredential("Remember my password is abc123"), true);
  assert.equal(
    proposeMemory(state, "api_key=secret123").memory.suggestions.length,
    state.memory.suggestions.length,
  );
  assert.deepEqual(
    approvedMemoryContext(
      normalizePreferences({
        ...state,
        memory: { ...state.memory, useWithAI: false },
      }),
    ),
    [],
  );
});
