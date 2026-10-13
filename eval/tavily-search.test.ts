import test from "node:test";
import assert from "node:assert/strict";
import { DeviceClient } from "../packages/provider-client/device-client";
import { searchWeb } from "../packages/provider-client/web-search";

const tavilyBody = {
  answer: "A short answer.",
  results: [
    { title: "Source A", url: "https://example.org/a", content: "Alpha text" },
    { title: "Bad", url: "http://insecure.example/b", content: "ignored" },
  ],
};
const profile = (over: any = {}): any => ({
  active_provider: "openai",
  cross_provider_fallback: false,
  openai: { api_key: "", model: "gpt-realtime", fallback_models: [] },
  gemini: { api_key: "", model: "gemini-live", fallback_models: [] },
  search: { tavily_api_key: "tvly-test" },
  ...over,
});

test("Tavily is used first, with bearer auth, and keeps only https sources", async () => {
  let seen: any;
  const request: typeof fetch = async (url, init: any) => {
    seen = { url: String(url), auth: init.headers.Authorization };
    return Response.json(tavilyBody);
  };
  const result = await searchWeb(profile(), "vishnu purana", request);
  assert.equal(seen.url, "https://api.tavily.com/search");
  assert.equal(seen.auth, "Bearer tvly-test");
  assert.equal(result.source_status, "external_web_unverified");
  assert.deepEqual(result.evidence, [
    { url: "https://example.org/a", title: "Source A" },
  ]);
  assert.match(String(result.text), /A short answer\./);
});

test("Tavily failure falls back to the provider search only when that provider has a key", async () => {
  const urls: string[] = [];
  const request: typeof fetch = async (url) => {
    urls.push(String(url));
    return new Response(JSON.stringify({ detail: { error: "Usage limit" } }), {
      status: 432,
    });
  };
  await assert.rejects(() => searchWeb(profile(), "q", request));
  assert.deepEqual(urls, ["https://api.tavily.com/search"]);
  urls.length = 0;
  await assert.rejects(() =>
    searchWeb(
      profile({
        openai: {
          api_key: "sk-test-key-1234567890",
          model: "x",
          fallback_models: [],
        },
      }),
      "q",
      request,
    ),
  );
  assert.ok(urls.length > 1 && urls[1].includes("api.openai.com"));
});

test("Tavily key is stored on device, hidden from the public profile, testable and removable", async () => {
  let saved: string | null = null;
  const client = new DeviceClient(
    {
      get: async () => saved,
      set: async (v) => {
        saved = v;
      },
      remove: async () => {
        saved = null;
      },
    },
    (async () => Response.json(tavilyBody)) as typeof fetch,
  );
  await assert.rejects(() => client.testSearchKey(), /Save your Tavily key/);
  await assert.rejects(() => client.saveSearchKey({ api_key: "has space" }));
  const profile1: any = await client.saveSearchKey({ api_key: "tvly-abc123" });
  assert.equal(profile1.search.tavily_configured, true);
  assert.ok(!JSON.stringify(profile1).includes("tvly-abc123"));
  assert.match((await client.testSearchKey()).message, /works/);
  const profile2: any = await client.saveSearchKey({ remove: true });
  assert.equal(profile2.search.tavily_configured, false);
});
