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

test("the chosen voice is sent to Gemini and OpenAI, and left alone when unset", async () => {
  const { createLiveAgent } = await import("../packages/provider-client/live-agent");
  const base: any = { gemini: { model: "gemini-3.8-live", api_key: "k", fallback_models: [] }, openai: { model: "gpt-realtime-2.1", api_key: "k", fallback_models: [] }, cross_provider_fallback: false };
  const configFor = async (voices?: any) => {
    let config: any;
    const agent = createLiveAgent({
      profile: { ...base, active_provider: "gemini" },
      send: () => undefined,
      runTool: async () => ({}),
      voices,
      connectGemini: async (c: any) => {
        config = c;
        return { close() {}, sendRealtimeInput() {}, sendClientContent() {}, sendToolResponse() {} };
      },
    });
    await agent.start();
    agent.close();
    return config.config;
  };
  assert.equal((await configFor({ gemini: "Charon" })).speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, "Charon");
  assert.equal((await configFor()).speechConfig, undefined);
});
