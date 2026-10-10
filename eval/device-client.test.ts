import { test } from "node:test";
import assert from "node:assert/strict";
import { DeviceClient } from "../packages/provider-client/device-client";
import { defaultModel } from "../packages/provider-client/models";
import { emptyProfile } from "../packages/provider-client/profile";
import {
  createDeviceLiveSocket,
  type NativeSocket,
} from "../packages/provider-client/native-live";

function fixture(
  request: typeof fetch = (async () => {
    throw Error("Unexpected network request");
  }) as typeof fetch,
) {
  let saved: string | null = null;
  const client = new DeviceClient(
    {
      get: async () => saved,
      set: async (value) => {
        saved = value;
      },
      remove: async () => {
        saved = null;
      },
    },
    request,
  );
  const update = (provider: "gemini" | "openai", key: string) =>
    client.saveSettings({
      provider,
      model: defaultModel(provider),
      api_key: key,
      fallback_models: [],
      cross_provider_fallback: false,
    });
  return { client, update, stored: () => saved };
}
test("device settings survive a new client, serialize concurrent edits, redact keys and delete without network", async () => {
  const { client, update, stored } = fixture();
  await Promise.all([
    update("gemini", "test-device-gemini"),
    update("openai", "test-device-openai"),
  ]);
  const result = await client.loadSettings();
  assert.equal(result.gemini.configured, true);
  assert.equal(result.openai.configured, true);
  assert.ok(!JSON.stringify(result).includes("test-device"));
  const restarted = new DeviceClient({
    get: async () => stored(),
    set: async () => {},
    remove: async () => {},
  });
  assert.equal((await restarted.loadSettings()).openai.configured, true);
  await client.disconnectSettings();
  assert.equal(stored(), null);
  assert.equal((await client.loadSettings()).gemini.configured, false);
});
test("device connection check sends Gemini credentials only to official header-auth endpoint", async () => {
  const { client, update } = fixture((async (url, init) => {
    assert.equal(
      String(url),
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
    );
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "test-key");
    return Response.json({
      models: [{ name: `models/${defaultModel("gemini")}` }],
    });
  }) as typeof fetch);
  await update("gemini", "test-key");
  assert.match(
    (await client.testSettings("gemini")).message,
    /Connected directly/,
  );
});
test("device key rejection never surfaces upstream error details or retries", async () => {
  let requests = 0;
  const { client, update } = fixture((async () => {
    requests++;
    return Response.json({ error: "secret-test-key" }, { status: 403 });
  }) as typeof fetch);
  await update("openai", "secret-test-key");
  await assert.rejects(
    client.testSettings("openai"),
    /provider rejected this key/,
  );
  assert.equal(requests, 1);
});
test("native fetch without response streams still accepts executed grounding; citations stay unapproved", async () => {
  const { client, update } = fixture((async (url, init) => {
    assert.ok(!String(url).includes("test-key"));
    assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "test-key");
    const data = String(url).includes(":generateContent")
      ? {
          candidates: [
            {
              content: { parts: [{ text: "External explanation" }] },
              groundingMetadata: {
                webSearchQueries: ["Isha"],
                groundingChunks: [
                  {
                    web: {
                      uri: "https://example.org/source",
                      title: "External source",
                    },
                  },
                ],
              },
            },
          ],
        }
      : {
          models: [
            {
              name: "models/gemini-2.5-flash",
              supportedGenerationMethods: ["generateContent"],
            },
          ],
        };
    return {
      ok: true,
      body: null,
      text: async () => JSON.stringify(data),
    } as Response;
  }) as typeof fetch);
  await update("gemini", "test-key");
  const result = await client.study({
    query: "Isha",
    work_ids: ["isha-upanishad"],
  });
  assert.equal(result.web.source_status, "external_web_unverified");
  assert.equal(result.answer.support_state, "NOT_VERIFIED");
  assert.equal(result.answer.citations.length, 0);
  assert.equal(result.answer.safe_to_speak, false);
});
test("device voice uses device speech and cannot promote hallucinated web sources", async () => {
  const { client, update } = fixture((async (url) =>
    Response.json(
      String(url).includes(":generateContent")
        ? {
            candidates: [
              { content: { parts: [{ text: "Unsupported quote" }] } },
            ],
          }
        : {
            models: [
              {
                name: "models/gemini-2.5-flash",
                supportedGenerationMethods: ["generateContent"],
              },
            ],
          },
    )) as typeof fetch);
  await update("gemini", "test-key");
  const reply = await client.voiceTurn(
    { query: "scripture", work_ids: [] },
    false,
  );
  assert.equal(reply.audio, null);
  assert.equal(reply.kind, "source_status");
  assert.ok(!reply.text.includes("Unsupported quote"));
});

class FakeSocket implements NativeSocket {
  readyState = 0;
  bufferedAmount = 0;
  onopen: NativeSocket["onopen"] = null;
  onmessage: NativeSocket["onmessage"] = null;
  onclose: NativeSocket["onclose"] = null;
  onerror: NativeSocket["onerror"] = null;
  sent: any[] = [];
  closed = false;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.();
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(value: unknown) {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
test("direct Gemini live setup, text, tools and audio work through native header transport", async () => {
  const profile = emptyProfile();
  profile.gemini.api_key = "test-live-key";
  let providerSocket!: FakeSocket;
  const events: any[] = [],
    calls: string[] = [];
  const client = createDeviceLiveSocket(
    profile,
    (url, headers) => {
      assert.equal(new URL(url).search, "");
      assert.equal(headers["x-goog-api-key"], "test-live-key");
      providerSocket = new FakeSocket();
      return providerSocket;
    },
    async (name) => {
      calls.push(name);
      return { source_status: "not_verified", evidence: [] };
    },
    { enableWebSearch: true },
  );
  client.onmessage = (event) => events.push(JSON.parse(String(event.data)));
  await tick();
  providerSocket.open();
  assert.equal(
    providerSocket.sent[0].setup.model,
    `models/${profile.gemini.model}`,
  );
  providerSocket.receive({ setupComplete: {} });
  await tick();
  assert.equal(client.readyState, 1);
  client.send(JSON.stringify({ type: "text", text: "What does Isha say?" }));
  assert.equal(
    providerSocket.sent[1].clientContent.turns[0].parts[0].text,
    "What does Isha say?",
  );
  providerSocket.receive({
    toolCall: {
      functionCalls: [
        { id: "call1", name: "search_scripture", args: { query: "Isha" } },
      ],
    },
  });
  await tick();
  assert.deepEqual(calls, ["search_scripture"]);
  assert.equal(
    providerSocket.sent.at(-1).toolResponse.functionResponses[0].id,
    "call1",
  );
  providerSocket.receive({
    serverContent: {
      modelTurn: {
        parts: [
          { inlineData: { data: "AAAA", mimeType: "audio/pcm;rate=24000" } },
        ],
      },
      turnComplete: true,
    },
  });
  await tick();
  assert.ok(events.some((e) => e.type === "audio"));
  assert.ok(events.some((e) => e.type === "turn_end"));
  client.close();
  assert.equal(providerSocket.closed, true);
});
test("direct OpenAI native live authenticates without URL keys and emits expected protocol", async () => {
  const profile = emptyProfile();
  profile.active_provider = "openai";
  profile.openai.api_key = "test-openai-key";
  let providerSocket!: FakeSocket;
  const events: any[] = [];
  const client = createDeviceLiveSocket(
    profile,
    (url, headers) => {
      assert.ok(
        String(url).startsWith("wss://api.openai.com/v1/realtime?model="),
      );
      assert.ok(!url.includes("test-openai-key"));
      assert.equal(headers.Authorization, "Bearer test-openai-key");
      providerSocket = new FakeSocket();
      return providerSocket;
    },
    async () => ({}),
    { enableWebSearch: false },
  );
  client.onmessage = (event) => events.push(JSON.parse(String(event.data)));
  await tick();
  providerSocket.open();
  assert.equal(providerSocket.sent[0].type, "session.update");
  providerSocket.receive({ type: "session.updated" });
  await tick();
  client.send(JSON.stringify({ type: "text", text: "Hello" }));
  assert.equal(providerSocket.sent.at(-1).type, "response.create");
  providerSocket.receive({
    type: "response.output_audio.delta",
    delta: "AAAA",
  });
  await tick();
  assert.ok(events.some((e) => e.type === "audio"));
  client.close();
  assert.equal(providerSocket.closed, true);
});
test("missing local credentials emit a visible live error after handlers attach", async () => {
  const client = createDeviceLiveSocket(
    emptyProfile(),
    () => {
      throw Error("Network must not run");
    },
    async () => ({}),
    { enableWebSearch: true },
  );
  const events: any[] = [];
  client.onmessage = (event) => events.push(JSON.parse(String(event.data)));
  await tick();
  assert.equal(events[0].type, "error");
  assert.equal(client.readyState, 3);
});
