import test from "node:test";
import assert from "node:assert/strict";
import { cloudSnapshot, CloudSyncClient } from "../packages/cloud-sync";
test("cloud backup excludes private scratchpad, history, suggestions and credentials", () => {
  const snapshot = cloudSnapshot(
    { name: "Arun", apiKey: "secret", avatar: "Shiva" },
    {
      history: [{ query: "private history" }],
      memory: {
        scratchpad: "private scratchpad",
        useWithAI: true,
        approved: [{ id: "a", text: "I prefer Hindi" }],
        suggestions: [{ id: "b", text: "unapproved suggestion" }],
      },
    },
  );
  assert.equal(snapshot.profile.name, "Arun");
  assert.deepEqual(snapshot.approved_memories, []);
  assert.equal(JSON.stringify(snapshot).includes("private"), false);
  assert.equal(JSON.stringify(snapshot).includes("apiKey"), false);
});
test("approved memories require separate explicit backup opt-in", () => {
  const snapshot = cloudSnapshot(
    {},
    { memory: { approved: [{ id: "a", text: "I prefer Hindi" }] } },
    true,
  );
  assert.deepEqual(snapshot.approved_memories, [
    { id: "a", text: "I prefer Hindi" },
  ]);
});
test("cloud client rejects insecure endpoints and unsigned sessions", () => {
  assert.throws(
    () => new CloudSyncClient("http://example.supabase.co", "public", "token"),
  );
  assert.throws(
    () => new CloudSyncClient("https://evil.example", "public", "token"),
  );
  assert.throws(
    () => new CloudSyncClient("https://project.supabase.co", "public", ""),
  );
});
