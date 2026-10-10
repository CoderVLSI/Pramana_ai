import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateWelcome,
  ChatProviderError,
} from "../services/api/src/chat-provider";
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const models = {
  models: [
    {
      name: "models/gemini-3.8-live",
      supportedGenerationMethods: ["generateContent"],
    },
    {
      name: "models/gemini-3.8-flash",
      supportedGenerationMethods: ["generateContent"],
    },
    {
      name: "models/gemini-3.7-flash",
      supportedGenerationMethods: ["generateContent"],
    },
  ],
};
test("Gemini greeting discovers accessible text models, uses header key and rejects Live", async () => {
  const calls: string[] = [];
  const mock: typeof fetch = async (url, init) => {
    calls.push(String(url));
    assert.ok(!String(url).includes("test-secret"));
    assert.equal(
      (init?.headers as Record<string, string>)["x-goog-api-key"],
      "test-secret",
    );
    return calls.length === 1
      ? response(models)
      : response({
          candidates: [
            { content: { parts: [{ text: '{"response":"welcome"}' }] } },
          ],
        });
  };
  const r = await generateWelcome({
    provider: "gemini",
    key: "test-secret",
    query: "hi",
    fetch: mock,
  });
  assert.equal(r.model, "gemini-3.8-flash");
  assert.match(r.message, /Hello/);
  assert.ok(!calls[1].includes("live"));
});
test("OpenAI uses key-eligible Responses text model and approved navigation template", async () => {
  let n = 0;
  const mock: typeof fetch = async (_url, init) => {
    n++;
    if (n === 1) return response({ data: [{ id: "gpt-4.1-mini" }] });
    const body = JSON.parse(init?.body as string);
    assert.equal(body.store, false);
    return response({
      output: [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: '{"response":"settings"}' }],
        },
      ],
    });
  };
  const r = await generateWelcome({
    provider: "openai",
    key: "fake",
    query: "where settings",
    fetch: mock,
  });
  assert.equal(r.model, "gpt-4.1-mini");
  assert.match(r.message, /gear icon/);
});
test("capacity fallback remains within two discovered text models", async () => {
  let n = 0;
  const mock: typeof fetch = async () => {
    n++;
    return n === 1
      ? response(models)
      : n === 2
        ? response({ error: "secret" }, 429)
        : response({
            candidates: [
              { content: { parts: [{ text: '{"response":"study"}' }] } },
            ],
          });
  };
  assert.equal(
    (
      await generateWelcome({
        provider: "gemini",
        key: "fake",
        query: "hi",
        fetch: mock,
      })
    ).model,
    "gemini-3.7-flash",
  );
  assert.equal(n, 3);
});
test("authentication errors are sanitized and do not retry", async () => {
  let n = 0;
  const mock: typeof fetch = async () => {
    n++;
    return response({ error: "private-key-payload" }, 403);
  };
  await assert.rejects(
    generateWelcome({
      provider: "gemini",
      key: "fake",
      query: "hi",
      fetch: mock,
    }),
    (e: unknown) =>
      e instanceof ChatProviderError &&
      e.code === "auth" &&
      !e.message.includes("private-key"),
  );
  assert.equal(n, 1);
});
test("hallucinated scripture output is rejected rather than presented", async () => {
  let n = 0;
  const mock: typeof fetch = async () => {
    n++;
    return n === 1
      ? response({ models: [models.models[1]] })
      : response({
          candidates: [
            {
              content: {
                parts: [{ text: "A verse says unsupported doctrine." }],
              },
            },
          ],
        });
  };
  await assert.rejects(
    generateWelcome({
      provider: "gemini",
      key: "fake",
      query: "hi",
      fetch: mock,
    }),
    ChatProviderError,
  );
  assert.equal(n, 2);
});
test("missing keys and no eligible text models fail clearly", async () => {
  await assert.rejects(
    generateWelcome({ provider: "gemini", key: "", query: "hi" }),
    /Add your provider/,
  );
  await assert.rejects(
    generateWelcome({
      provider: "gemini",
      key: "fake",
      query: "hi",
      fetch: async () => response({ models: [models.models[0]] }),
    }),
    /No available text model/,
  );
});
