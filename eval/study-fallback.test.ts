import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerSettingsRoutes } from "../services/api/src/settings-routes";

test("authenticated study and voice routes search Gemini after local miss without promoting web evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pramana-web-fallback-"));
  const oldDir = process.env.PRAMANA_DATA_DIR, oldMaster = process.env.SETTINGS_MASTER_KEY;
  process.env.PRAMANA_DATA_DIR = directory;
  process.env.SETTINGS_MASTER_KEY = "aa".repeat(32);
  const app = Fastify();
  let calls = 0;
  const request: typeof fetch = async () => Response.json(++calls % 2 ? { models: [{ name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] }] } : { candidates: [{ content: { parts: [{ text: "A separately attributed external explanation." }] }, groundingMetadata: { webSearchQueries: ["Vishnu"], groundingChunks: [{ web: { uri: "https://example.org/scripture", title: "External source" } }] } }] });
  try {
    await registerSettingsRoutes(app, { chatFetch: request, voiceSpeak: async (provider, _key, model, script) => ({ provider, model, transcript: script, audio_base64: "mock", mime_type: "audio/wav" }) });
    const session = await app.inject({ method: "POST", url: "/v1/settings/session" });
    const headers = { authorization: `Bearer ${session.json().token}` };
    const payload = { query: "Vishnu", work_ids: ["vishnu-purana"] };
    const noAuth = await app.inject({ method: "POST", url: "/v1/study", payload });
    assert.equal(noAuth.statusCode, 401);
    const empty = await app.inject({ method: "POST", url: "/v1/study", headers, payload });
    assert.equal(empty.json().web.source_status, "web_unavailable");
    assert.equal(calls, 0);
    await app.inject({ method: "PUT", url: "/v1/settings", headers, payload: { provider: "gemini", model: "gemini-3.8-live", api_key: "fake-key-for-route-12345", fallback_models: [] } });
    const text = await app.inject({ method: "POST", url: "/v1/study", headers, payload });
    assert.equal(text.statusCode, 200);
    assert.equal(text.json().answer.support_state, "NOT_VERIFIED");
    assert.equal(text.json().answer.citations.length, 0);
    assert.equal(text.json().web.source_status, "external_web_unverified");
    assert.equal(text.json().web.evidence[0].url, "https://example.org/scripture");
    assert.equal(text.headers["cache-control"], "no-store");
    const voice = await app.inject({ method: "POST", url: "/v1/voice/turn", headers, payload });
    assert.equal(voice.json().kind, "external_web");
    assert.match(voice.json().text, /^External web search result, not verified scripture/);
    assert.equal(voice.json().audio.transcript, voice.json().text);
    assert.equal(voice.json().answer.safe_to_speak, false);
    assert.equal(calls, 4);
  } finally {
    await app.close();
    if (oldDir === undefined) delete process.env.PRAMANA_DATA_DIR; else process.env.PRAMANA_DATA_DIR = oldDir;
    if (oldMaster === undefined) delete process.env.SETTINGS_MASTER_KEY; else process.env.SETTINGS_MASTER_KEY = oldMaster;
    await rm(directory, { recursive: true, force: true });
  }
});
