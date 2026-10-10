import { test } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerSettingsRoutes } from "../services/api/src/settings-routes";
test("chat route separates exact greetings from scriptures and labels provider/local responses", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pramana-chat-route-"));
  const oldDir = process.env.PRAMANA_DATA_DIR;
  const oldMaster = process.env.SETTINGS_MASTER_KEY;
  process.env.PRAMANA_DATA_DIR = dir;
  process.env.SETTINGS_MASTER_KEY = "ab".repeat(32);
  const app = Fastify();
  let calls = 0;
  let authFailure = false;
  const mock: typeof fetch = async () => {
    calls++;
    if (authFailure)
      return new Response(JSON.stringify({ error: "secret-upstream" }), {
        status: 403,
      });
    return new Response(
      JSON.stringify(
        calls === 1
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
  try {
    await registerSettingsRoutes(app, { chatFetch: mock });
    const session = await app.inject({
      method: "POST",
      url: "/v1/settings/session",
    });
    const headers = { authorization: `Bearer ${session.json().token}` };
    let r = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers,
      payload: { query: "hi" },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(r.json().connection_status, "not_configured");
    assert.equal(calls, 0);
    assert.match(r.json().note, /local greeting/);
    r = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers,
      payload: { query: "hi, quote a verse" },
    });
    assert.equal(r.statusCode, 422);
    assert.equal(calls, 0);
    r = await app.inject({
      method: "PUT",
      url: "/v1/settings",
      headers,
      payload: {
        provider: "gemini",
        model: "gemini-3.8-live",
        api_key: "fake-route-key-123456",
      },
    });
    assert.equal(r.statusCode, 200);
    r = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers,
      payload: { query: "hi", preferred_name: "Tester" },
    });
    assert.equal(r.json().connection_status, "connected");
    assert.equal(r.json().provider, "gemini");
    assert.equal(r.json().model, "gemini-3.8-flash");
    assert.equal(r.headers["cache-control"], "no-store");
    assert.ok(!r.body.includes("fake-route-key"));
    authFailure = true;
    r = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers,
      payload: { query: "hello" },
    });
    assert.equal(r.json().connection_status, "failed");
    assert.equal(r.json().model, null);
    assert.ok(!r.body.includes("secret-upstream"));
    assert.match(r.json().note, /local greeting/);
    r = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers,
      payload: { query: "hi", preferred_name: "a".repeat(81) },
    });
    assert.equal(r.statusCode, 400);
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
    if (oldDir === undefined) delete process.env.PRAMANA_DATA_DIR;
    else process.env.PRAMANA_DATA_DIR = oldDir;
    if (oldMaster === undefined) delete process.env.SETTINGS_MASTER_KEY;
    else process.env.SETTINGS_MASTER_KEY = oldMaster;
  }
});
