import { test } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerSettingsRoutes } from "../services/api/src/settings-routes";
import { ProviderFailure, type Speak } from "../services/api/src/voice-router";
import { passages } from "../services/api/src/corpus";
test("voice turns distinguish local, fixed status and approved scripts with exact-wording fallback", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pramana-voice-turn-"));
  const oldDir = process.env.PRAMANA_DATA_DIR;
  const oldMaster = process.env.SETTINGS_MASTER_KEY;
  process.env.PRAMANA_DATA_DIR = dir;
  process.env.SETTINGS_MASTER_KEY = "ab".repeat(32);
  const app = Fastify();
  const spoken: string[] = [];
  let mode: "normal" | "capacity" | "tamper" = "normal";
  let attempted = 0;
  const speak: Speak = async (provider, _key, model, script) => {
    spoken.push(script);
    attempted++;
    if (mode === "capacity" && attempted === 1)
      throw new ProviderFailure(429, "mock capacity", true);
    return {
      provider,
      model,
      transcript: mode === "tamper" ? "Invented answer" : script,
      audio_base64: "mock-audio",
      mime_type: "audio/wav",
    };
  };
  let chatCalls = 0;
  const mock: typeof fetch = async () => {
    chatCalls++;
    return new Response(
      JSON.stringify(
        chatCalls % 2 === 1
          ? {
              models: [
                {
                  name: "models/gemini-3.8-flash",
                  supportedGenerationMethods: ["generateContent"],
                },
              ],
            }
          : {
              candidates: [
                { content: { parts: [{ text: '{"response":"welcome"}' }] } },
              ],
            },
      ),
    );
  };
  const original = passages[0].review_status;
  const audioAllowed = passages[0].audio_allowed;
  try {
    await registerSettingsRoutes(app, { chatFetch: mock, voiceSpeak: speak });
    const session = await app.inject({
      method: "POST",
      url: "/v1/settings/session",
    });
    const headers = { authorization: `Bearer ${session.json().token}` };
    const turn = (query: string) =>
      app.inject({
        method: "POST",
        url: "/v1/voice/turn",
        headers,
        payload: { query },
      });
    let r = await turn("hi");
    assert.equal(r.json().audio, null);
    assert.match(r.json().note, /local greeting/);
    assert.equal(spoken.length, 0);
    await app.inject({
      method: "PUT",
      url: "/v1/settings",
      headers,
      payload: {
        provider: "gemini",
        model: "gemini-3.8-live",
        api_key: "fake-route-key-123456",
        fallback_models: ["gemini-3.8-live-extended-thinking"],
      },
    });
    r = await turn("hello");
    assert.equal(r.json().kind, "app_conversation");
    assert.equal(r.json().audio.transcript, r.json().text);
    assert.equal(chatCalls, 2);
    r = await turn("Gita 99.999");
    assert.equal(r.json().kind, "source_status");
    assert.match(spoken.at(-1)!, /^I could not verify an answer/);
    assert.equal(r.json().answer.safe_to_speak, false);
    assert.equal(chatCalls, 4); // Missing local evidence attempts grounded web fallback.
    assert.equal(r.json().web.source_status, "tool_unavailable");
    passages[0].review_status = "approved";
    passages[0].audio_allowed = true;
    mode = "capacity";
    attempted = 0;
    r = await turn("Gita 2.47");
    assert.equal(r.json().kind, "verified_scripture");
    assert.equal(r.json().audio.fallback_used, true);
    assert.equal(
      spoken.at(-1),
      passages[0].reference + ". " + passages[0].translation,
    );
    assert.equal(attempted, 2);
    mode = "tamper";
    r = await turn("Gita 2.47");
    assert.equal(r.json().audio, null);
    assert.match(r.json().note, /wording could not be verified/);
    assert.ok(!r.body.includes("Invented answer"));
  } finally {
    passages[0].review_status = original;
    passages[0].audio_allowed = audioAllowed;
    await app.close();
    await rm(dir, { recursive: true, force: true });
    if (oldDir === undefined) delete process.env.PRAMANA_DATA_DIR;
    else process.env.PRAMANA_DATA_DIR = oldDir;
    if (oldMaster === undefined) delete process.env.SETTINGS_MASTER_KEY;
    else process.env.SETTINGS_MASTER_KEY = oldMaster;
  }
});
