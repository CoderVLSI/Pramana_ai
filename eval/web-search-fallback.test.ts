import test from "node:test";
import assert from "node:assert/strict";
import { searchWeb } from "../packages/provider-client/web-search";

const profile: any = {
  active_provider: "gemini",
  gemini: { api_key: "test-key", model: "gemini-live", fallback_models: [] },
  openai: { api_key: "", model: "gpt-realtime", fallback_models: [] },
};
const models = ["a-flash", "b-flash", "c-flash"].map((n) => ({
  name: `models/gemini-${n}`,
  supportedGenerationMethods: ["generateContent"],
}));
const grounded = {
  candidates: [
    {
      content: { parts: [{ text: "Answer" }] },
      groundingMetadata: {
        webSearchQueries: ["q"],
        groundingChunks: [
          { web: { uri: "https://example.org/a", title: "A" } },
        ],
      },
    },
  ],
};

test("web search tries the next model when the first has no quota", async () => {
  const tried: string[] = [];
  const request: typeof fetch = async (url) => {
    const u = String(url);
    if (u.includes("/models?")) return Response.json({ models });
    tried.push(u);
    return tried.length === 1
      ? new Response("{}", { status: 429 })
      : Response.json(grounded);
  };
  const result = await searchWeb(profile, "vishnu purana", request);
  assert.equal(result.source_status, "external_web_unverified");
  assert.equal(tried.length, 2);
  assert.notEqual(tried[0], tried[1]);
});

test("web search reports quota failure only after every candidate fails", async () => {
  let generate = 0;
  const request: typeof fetch = async (url) => {
    if (String(url).includes("/models?")) return Response.json({ models });
    generate++;
    return new Response("{}", { status: 429 });
  };
  await assert.rejects(() => searchWeb(profile, "q", request), /quota/i);
  assert.equal(generate, 3);
});

test("web search does not retry on authentication errors", async () => {
  let generate = 0;
  const request: typeof fetch = async (url) => {
    if (String(url).includes("/models?")) return Response.json({ models });
    generate++;
    return new Response("{}", { status: 403 });
  };
  await assert.rejects(() => searchWeb(profile, "q", request));
  assert.equal(generate, 1);
});
