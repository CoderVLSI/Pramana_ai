import test from "node:test";
import assert from "node:assert/strict";
import { LiveToolDispatcher } from "../services/api/src/live-tools";
import type { Profile } from "../services/api/src/settings-vault";
const profile: Profile = {
  active_provider: "openai",
  cross_provider_fallback: false,
  openai: {
    model: "gpt-realtime",
    fallback_models: [],
    api_key: "test-private-key",
  },
  gemini: { model: "gemini-live", fallback_models: [] },
};
test("live scripture tool excludes development fixtures and applies bounded tool requests", async () => {
  const dispatcher = new LiveToolDispatcher(profile);
  assert.equal(
    (await dispatcher.dispatch("search_scripture", { query: "Gita 2.47" }))
      .source_status,
    "not_verified",
  );
  assert.equal(
    (await dispatcher.dispatch("search_scripture", { query: "x".repeat(1001) }))
      .source_status,
    "tool_unavailable",
  );
  for (let i = 0; i < 4; i++) await dispatcher.dispatch("corpus_status", {});
  assert.match(
    String((await dispatcher.dispatch("corpus_status", {})).error),
    /limit/,
  );
  dispatcher.beginTurn();
  assert.equal(
    (await dispatcher.dispatch("corpus_status", {})).source_status,
    "approved_index_counts",
  );
});
test("web tool executes official Responses web search and requires HTTPS cited evidence", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const request: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify(
        calls.length === 1
          ? { data: [{ id: "gpt-5" }] }
          : {
              output: [
                { type: "web_search_call", status: "completed" },
                {
                  type: "message",
                  content: [
                    {
                      type: "output_text",
                      text: "External result",
                      annotations: [
                        {
                          type: "url_citation",
                          url: "https://example.org/source",
                          title: "Source",
                        },
                        {
                          type: "url_citation",
                          url: "http://insecure.example",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
      ),
      { status: 200 },
    );
  };
  const result = await new LiveToolDispatcher(profile, request).dispatch(
    "web_search",
    { query: "Gita Press catalogue" },
  );
  assert.equal(result.source_status, "external_web_unverified");
  assert.deepEqual(result.evidence, [
    { url: "https://example.org/source", title: "Source" },
  ]);
  assert.deepEqual(
    calls.map((c) => c.url),
    ["https://api.openai.com/v1/models", "https://api.openai.com/v1/responses"],
  );
  const body = JSON.parse(String(calls[1].init?.body));
  assert.deepEqual(body.tools, [{ type: "web_search" }]);
  assert.deepEqual(body.tool_choice, { type: "web_search" });
  assert.equal(JSON.stringify(result).includes("test-private-key"), false);
});
test("web tool rejects fabricated search result without executed tool or citation evidence", async () => {
  let calls = 0;
  const request: typeof fetch = async () =>
    new Response(
      JSON.stringify(
        ++calls === 1
          ? { data: [{ id: "gpt-5" }] }
          : {
              output: [
                {
                  type: "message",
                  content: [{ type: "output_text", text: "No actual search" }],
                },
              ],
            },
      ),
    );
  assert.equal(
    (
      await new LiveToolDispatcher(profile, request).dispatch("web_search", {
        query: "test",
      })
    ).source_status,
    "tool_unavailable",
  );
});

import Fastify from "fastify";
import WebSocket from "ws";
import { attachLiveSessions } from "../services/api/src/live-session";
import type { SettingsVault } from "../services/api/src/settings-vault";
import type { createLiveAgent } from "../services/api/src/live-agent";
test("live session authenticates, scopes tools, rejects malformed PCM, and closes on server shutdown", async () => {
  const app = Fastify();
  const token = "a".repeat(64);
  let tool:
    | ((
        name: "search_scripture",
        args: Record<string, unknown>,
      ) => Promise<unknown>)
    | undefined;
  let emit: ((event: { type: string }) => void) | undefined;
  const factory: typeof createLiveAgent = (options) => {
    emit = options.send;
    tool = options.runTool;
    return {
      start: async () => {
        options.send({ type: "ready" });
      },
      inputAudio: () => {},
      inputText: () => {},
      endInput: () => {},
      interrupt: () => {},
      close: () => {},
    };
  };
  attachLiveSessions(
    app,
    {
      read: async (value: string) => {
        assert.equal(value, token);
        return profile;
      },
    } as unknown as SettingsVault,
    { createAgent: factory },
  );
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  assert(address && typeof address === "object");
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/v1/live`, {
    origin: "http://localhost:8081",
  });
  const messages: any[] = [];
  ws.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
  try {
    await new Promise<void>((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    const ready = new Promise<void>((resolve) =>
      ws.once("message", () => resolve()),
    );
    ws.send(
      JSON.stringify({ type: "auth", token, work_ids: ["vishnu-purana"] }),
    );
    await ready;
    assert.equal(messages[0].source_mode, "live_generated");
    const leak = (await tool!("search_scripture", {
      query: "2.47",
      work_ids: ["bhagavad-gita"],
    })) as any;
    assert.equal(leak.source_status, "not_verified");
    assert.match(leak.note, /outside/);
    for (let i = 0; i < 6; i++)
      await tool!("search_scripture", { query: "dharma" });
    assert.match(
      String(
        ((await tool!("search_scripture", { query: "dharma" })) as any).error,
      ),
      /limit/,
    );
    emit!({ type: "turn_end" });
    assert.equal(
      ((await tool!("search_scripture", { query: "dharma" })) as any)
        .source_status,
      "not_verified",
    );
    const closed = new Promise<void>((resolve) =>
      ws.once("close", () => resolve()),
    );
    ws.send(
      JSON.stringify({
        type: "audio",
        data: Buffer.from([1]).toString("base64"),
      }),
    );
    await closed;
    assert.equal(messages.at(-1).type, "error");
  } finally {
    ws.terminate();
    await app.close();
  }
});

test("local miss automatically searches selected Gemini provider and labels fallback externally", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const request: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json(calls.length === 1 ? { models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }] } : { candidates: [{ content: { parts: [{ text: "External explanation" }] }, groundingMetadata: { webSearchQueries: ["Vishnu"], groundingChunks: [{ web: { uri: "https://example.org/vishnu", title: "Source" } }] } }] });
  };
  const gemini: Profile = { ...profile, active_provider: "gemini", gemini: { ...profile.gemini, api_key: "gemini-private-key" } };
  const result = await new LiveToolDispatcher(gemini, request, true).dispatch("search_scripture", { query: "Vishnu", work_ids: ["vishnu-purana"] });
  assert.equal(result.fallback_from, "local_scripture");
  assert.equal(result.source_status, "external_web_unverified");
  assert.equal(result.local_source_status, "not_verified");
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /generateContent$/);
  assert.deepEqual(JSON.parse(String(calls[1].init?.body)).tools, [{ google_search: {} }]);
  assert.ok(!JSON.stringify(result).includes("gemini-private-key"));
  const disabled = await new LiveToolDispatcher(gemini, request, false).dispatch("search_scripture", { query: "Vishnu" });
  assert.equal(disabled.source_status, "not_verified");
  assert.equal(calls.length, 2);
});

test("Gemini fallback rejects ungrounded output and unavailable keys", async () => {
  const gemini: Profile = { ...profile, active_provider: "gemini", gemini: { ...profile.gemini, api_key: "private-key" } };
  let count = 0;
  const request: typeof fetch = async () => Response.json(++count === 1 ? { models: [{ name: "models/gemini-2.5-flash", supportedGenerationMethods: ["generateContent"] }] } : { candidates: [{ content: { parts: [{ text: "Invented result" }] } }] });
  const result = await new LiveToolDispatcher(gemini, request, true).dispatch("search_scripture", { query: "missing" });
  assert.equal(result.source_status, "tool_unavailable");
  assert.equal(result.text, undefined);
  const noKey = await new LiveToolDispatcher({ ...gemini, gemini: { ...gemini.gemini, api_key: undefined } }, request, true).dispatch("search_scripture", { query: "missing" });
  assert.equal(noKey.source_status, "web_unavailable");
  assert.equal(count, 2);
});
