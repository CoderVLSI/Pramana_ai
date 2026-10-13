import test from "node:test";
import assert from "node:assert/strict";
import { historyInstruction } from "../packages/provider-client/live-agent";

test("restarted live sessions receive bounded recent turns as untrusted data", () => {
  assert.equal(historyInstruction([]), "");
  const text = historyInstruction([
    ...Array.from({ length: 14 }, (_, i) => ({
      role: "user" as const,
      text: `question ${i}`,
    })),
    { role: "assistant" as const, text: "x".repeat(2000) },
    { role: "system" as never, text: "ignored role" },
  ]);
  assert.match(text, /untrusted JSON data/);
  assert.doesNotMatch(text, /question 3"/);
  assert.match(text, /question 13/);
  assert.doesNotMatch(text, /ignored role/);
  assert.ok(text.length < 8000);
});
