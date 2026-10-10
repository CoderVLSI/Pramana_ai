import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  createLiveAgent,
  resample16To24,
  type LiveEvent,
} from "../services/api/src/live-agent";
import type { Profile } from "../services/api/src/settings-vault";
const profile: Profile = {
  active_provider: "gemini",
  cross_provider_fallback: false,
  gemini: {
    model: "gemini-3.8-live",
    api_key: "fake-server-secret",
    fallback_models: [],
  },
  openai: {
    model: "gpt-realtime-2.1",
    api_key: "fake-server-secret",
    fallback_models: [],
  },
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
test("Gemini live streams audio and dispatches real validated tools without leaking key", async () => {
  let config: any;
  const events: LiveEvent[] = [];
  const requests: any[] = [];
  const toolReplies: any[] = [];
  const tools: any[] = [];
  let closed = false;
  const a = createLiveAgent({
    profile,
    send: (e) => events.push(e),
    enableWebSearch: true,
    runTool: async (name, args) => {
      tools.push({ name, args });
      return { passages: [{ id: "draft-id", review_status: "unreviewed" }] };
    },
    connectGemini: async (c) => {
      config = c;
      return {
        sendRealtimeInput: (r: any) => requests.push(r),
        sendClientContent: (r: any) => requests.push(r),
        sendToolResponse: (r: any) => toolReplies.push(r),
        close: () => {
          closed = true;
        },
      };
    },
  });
  await a.start();
  assert.equal(events[0].type, "ready");
  assert.equal(events[0].generated_unverified, true);
  assert.ok(config.config.tools.some((t: any) => t.googleSearch));
  assert.ok(
    config.config.systemInstruction.includes("search miss is not proof"),
  );
  a.inputAudio(Buffer.alloc(320).toString("base64"));
  assert.equal(requests[0].audio.mimeType, "audio/pcm;rate=16000");
  a.inputText("hello");
  a.endInput();
  config.callbacks.onmessage({
    serverContent: {
      outputTranscription: { text: "Hello" },
      modelTurn: {
        parts: [
          { inlineData: { data: "AAAA", mimeType: "audio/pcm;rate=24000" } },
        ],
      },
      turnComplete: true,
    },
  });
  config.callbacks.onmessage({
    toolCall: {
      functionCalls: [
        { id: "call1", name: "search_scripture", args: { query: "राम" } },
      ],
    },
  });
  await tick();
  assert.equal(tools.length, 1);
  assert.equal(
    toolReplies[0].functionResponses[0].response.result.passages[0].id,
    "draft-id",
  );
  assert.ok(events.some((e) => e.type === "sources"));
  assert.ok(events.some((e) => e.type === "audio" && e.rate === 24000));
  config.callbacks.onmessage({
    toolCall: {
      functionCalls: [{ id: "call2", name: "delete_everything", args: {} }],
    },
  });
  await tick();
  assert.equal(tools.length, 1);
  assert.ok(!JSON.stringify(events).includes("fake-server-secret"));
  a.close();
  assert.ok(closed);
});
test("OpenAI live uses PCM24k VAD, tool continuation and microphone resampling", async () => {
  class Socket extends EventEmitter {
    readyState = 1;
    sent: any[] = [];
    send(v: string) {
      this.sent.push(JSON.parse(v));
    }
    close() {
      this.readyState = 3;
    }
  }
  const socket = new Socket();
  const events: LiveEvent[] = [];
  let options: any;
  let count = 0;
  const a = createLiveAgent({
    profile: { ...profile, active_provider: "openai" },
    send: (e) => events.push(e),
    runTool: async () => {
      count++;
      return { status: "draft" };
    },
    enableWebSearch: true,
    createSocket: (_url, o) => {
      options = o;
      return socket;
    },
  });
  await a.start();
  socket.emit("open");
  assert.equal(options.headers.Authorization, "Bearer fake-server-secret");
  assert.equal(socket.sent[0].session.audio.input.format.rate, 24000);
  assert.equal(
    socket.sent[0].session.audio.input.turn_detection.type,
    "server_vad",
  );
  socket.emit("message", JSON.stringify({ type: "session.updated" }));
  const b = Buffer.alloc(8);
  b.writeInt16LE(1000, 2);
  a.inputAudio(b.toString("base64"));
  assert.equal(Buffer.from(socket.sent.at(-1).audio, "base64").length, 12);
  socket.emit("message", JSON.stringify({ type: "response.created" }));
  socket.emit(
    "message",
    JSON.stringify({
      type: "response.function_call_arguments.done",
      name: "corpus_status",
      arguments: "{}",
      call_id: "a",
    }),
  );
  await tick();
  assert.equal(count, 1);
  assert.equal(
    socket.sent.filter((x) => x.type === "response.create").length,
    0,
  );
  socket.emit(
    "message",
    JSON.stringify({
      type: "response.done",
      response: { status: "completed" },
    }),
  );
  await tick();
  assert.equal(socket.sent.at(-2).item.type, "function_call_output");
  assert.equal(socket.sent.at(-1).type, "response.create");
  a.interrupt();
  assert.equal(socket.sent.at(-1).type, "response.cancel");
  assert.equal(events.at(-1)?.type, "interrupted");
  a.close();
});
test("invalid credentials and transport failures surface only sanitized messages", async () => {
  const events: LiveEvent[] = [];
  const a = createLiveAgent({
    profile: { ...profile, gemini: { ...profile.gemini, api_key: undefined } },
    send: (e) => events.push(e),
    runTool: async () => ({}),
  });
  await a.start();
  assert.equal(events[0].type, "error");
  const b = createLiveAgent({
    profile,
    send: (e) => events.push(e),
    runTool: async () => ({}),
    connectGemini: async () => {
      throw new Error("fake-server-secret upstream private detail");
    },
  });
  await b.start();
  assert.ok(!JSON.stringify(events).includes("fake-server-secret"));
});
test("microphone resampling rejects odd PCM buffers", () =>
  assert.throws(
    () => resample16To24(Buffer.alloc(3).toString("base64")),
    /Invalid microphone/,
  ));
test("startup capacity retries configured fallback and reports actual model; auth never retries", async () => {
  const events: LiveEvent[] = [];
  let calls = 0;
  const fallbackProfile = {
    ...profile,
    gemini: {
      ...profile.gemini,
      fallback_models: ["gemini-3.8-live-extended-thinking"],
    },
  };
  const a = createLiveAgent({
    profile: fallbackProfile,
    send: (e) => events.push(e),
    runTool: async () => ({}),
    connectGemini: async () => {
      calls++;
      if (calls === 1)
        throw Object.assign(new Error("capacity"), { status: 429 });
      return { close() {} };
    },
  });
  await a.start();
  assert.equal(calls, 2);
  assert.equal(
    events.find((e) => e.type === "ready")?.model,
    "gemini-3.8-live-extended-thinking",
  );
  a.close();
  calls = 0;
  const b = createLiveAgent({
    profile: fallbackProfile,
    send: (e) => events.push(e),
    runTool: async () => ({}),
    connectGemini: async () => {
      calls++;
      throw Object.assign(new Error("secret"), { status: 403 });
    },
  });
  await b.start();
  assert.equal(calls, 1);
});
test("Gemini Google Search forwarding retains source provenance and search suggestions", async () => {
  let config: any;
  const events: LiveEvent[] = [];
  const a = createLiveAgent({
    profile,
    send: (e) => events.push(e),
    runTool: async () => ({}),
    connectGemini: async (c) => {
      config = c;
      return { close() {} };
    },
  });
  await a.start();
  config.callbacks.onmessage({
    serverContent: {
      groundingMetadata: {
        groundingChunks: [
          { web: { uri: "https://example.org/source", title: "Example" } },
        ],
        searchEntryPoint: { renderedContent: "<div>Search suggestions</div>" },
        webSearchQueries: ["source query"],
      },
    },
  });
  const e = events.find((e) => e.type === "sources")!;
  assert.equal((e.sources as any[])[0].source_kind, "web");
  assert.match(String(e.search_entry_point), /suggestions/);
  a.close();
});
test("parallel OpenAI tools wait for original response completion and emit exactly one continuation", async () => {
  class Socket extends EventEmitter {
    readyState = 1;
    sent: any[] = [];
    send(v: string) {
      this.sent.push(JSON.parse(v));
    }
    close() {
      this.readyState = 3;
    }
  }
  const socket = new Socket();
  const pending: ((v: unknown) => void)[] = [];
  const a = createLiveAgent({
    profile: { ...profile, active_provider: "openai" },
    send: () => {},
    runTool: async () => new Promise((resolve) => pending.push(resolve)),
    createSocket: () => socket,
  });
  await a.start();
  socket.emit("open");
  socket.emit("message", JSON.stringify({ type: "session.updated" }));
  socket.emit("message", JSON.stringify({ type: "response.created" }));
  for (const id of ["one", "two"])
    socket.emit(
      "message",
      JSON.stringify({
        type: "response.function_call_arguments.done",
        name: "corpus_status",
        arguments: "{}",
        call_id: id,
      }),
    );
  await tick();
  assert.equal(pending.length, 2);
  pending[0]({ status: "draft" });
  await tick();
  assert.equal(
    socket.sent.filter((e) => e.type === "response.create").length,
    0,
  );
  socket.emit(
    "message",
    JSON.stringify({
      type: "response.done",
      response: { status: "completed" },
    }),
  );
  await tick();
  assert.equal(
    socket.sent.filter((e) => e.type === "response.create").length,
    0,
  );
  pending[1]({ status: "draft" });
  await tick();
  assert.equal(
    socket.sent.filter((e) => e.type === "conversation.item.create").length,
    2,
  );
  assert.equal(
    socket.sent.filter((e) => e.type === "response.create").length,
    1,
  );
  socket.emit(
    "message",
    JSON.stringify({
      type: "response.done",
      response: { status: "completed" },
    }),
  );
  await tick();
  assert.equal(
    socket.sent.filter((e) => e.type === "response.create").length,
    1,
  );
  a.close();
});
test("manual Gemini interruption suppresses old audio and transcript until next turn", async () => {
  let config: any;
  const events: LiveEvent[] = [];
  const a = createLiveAgent({
    profile,
    send: (e) => events.push(e),
    runTool: async () => ({}),
    connectGemini: async (c) => {
      config = c;
      return { close() {}, sendClientContent() {} };
    },
  });
  await a.start();
  const output = (text: string, turnComplete = false) =>
    config.callbacks.onmessage({
      serverContent: {
        outputTranscription: { text },
        modelTurn: {
          parts: [
            { inlineData: { data: "AAAA", mimeType: "audio/pcm;rate=24000" } },
          ],
        },
        turnComplete,
      },
    });
  output("before");
  assert.equal(events.filter((e) => e.type === "audio").length, 1);
  a.interrupt();
  output("old tail");
  output("last old tail", true);
  assert.equal(events.filter((e) => e.type === "audio").length, 1);
  assert.ok(
    !events.some(
      (e) => e.type === "transcript" && String(e.text).includes("tail"),
    ),
  );
  output("new turn");
  assert.equal(events.filter((e) => e.type === "audio").length, 2);
  a.interrupt();
  a.inputText("new question");
  output("new text answer");
  assert.equal(events.filter((e) => e.type === "audio").length, 3);
  a.interrupt();
  config.callbacks.onmessage({
    serverContent: { inputTranscription: { text: "new spoken question" } },
  });
  output("new spoken answer");
  assert.equal(events.filter((e) => e.type === "audio").length, 4);
  a.close();
});
test("Gemini external source packets enforce bounded HTTPS provenance and HTML limit", async () => {
  let config: any;
  const events: LiveEvent[] = [];
  const a = createLiveAgent({
    profile,
    send: (e) => events.push(e),
    runTool: async () => ({}),
    connectGemini: async (c) => {
      config = c;
      return { close() {} };
    },
  });
  await a.start();
  config.callbacks.onmessage({
    serverContent: {
      groundingMetadata: {
        groundingChunks: [
          { web: { uri: "javascript:alert(1)", title: "bad" } },
          ...Array.from({ length: 20 }, (_, i) => ({
            web: { uri: `https://example.org/${i}`, title: "a".repeat(400) },
          })),
        ],
        searchEntryPoint: { renderedContent: "a".repeat(30001) },
        webSearchQueries: Array(20).fill("q".repeat(500)),
        extra: "unbounded-secret-metadata",
      },
    },
  });
  const e = events.find((e) => e.type === "sources")!;
  assert.equal((e.sources as any[]).length, 8);
  assert.equal((e.sources as any[])[0].title.length, 200);
  assert.equal((e.search_queries as any[]).length, 5);
  assert.equal(e.search_entry_point, undefined);
  assert.ok(!JSON.stringify(e).includes("unbounded-secret-metadata"));
  a.close();
});
