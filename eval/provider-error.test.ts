import test from "node:test";
import assert from "node:assert/strict";
import {
  providerFailure,
  ProviderRequestError,
} from "../packages/provider-client/provider-error";
test("provider failures identify actionable status categories without echoing server content", () => {
  assert.match(providerFailure(403), /authentication or access/);
  assert.match(providerFailure(429), /quota or rate/);
  assert.match(providerFailure(404), /model or requested tools/);
  assert.match(providerFailure(503), /temporarily unavailable/);
  assert.equal(new ProviderRequestError(429).status, 429);
});
