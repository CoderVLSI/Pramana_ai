import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { proxyTrust } from "../services/api/src/proxy-config";
test("one-hop HTTPS proxy config preserves protocol and client address; direct mode ignores headers", async () => {
  for (const [setting, expected] of [["1", "https"], [undefined, "http"]] as const) {
    const app = Fastify({ trustProxy: proxyTrust(setting) });
    app.get("/transport", req => ({ protocol: req.protocol, ip: req.ip }));
    try {
      const r = await app.inject({ method: "GET", url: "/transport", headers: { "x-forwarded-proto": "https", "x-forwarded-for": "203.0.113.1" } });
      assert.equal(r.json().protocol, expected);
      assert.equal(r.json().ip, setting ? "203.0.113.1" : "127.0.0.1");
    } finally { await app.close(); }
  }
  assert.equal(proxyTrust("false"), false);
  assert.equal(proxyTrust("127.0.0.1"), "127.0.0.1");
});
