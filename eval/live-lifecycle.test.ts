import test from "node:test";
import assert from "node:assert/strict";
import { shouldStopLive } from "../packages/provider-client/live-lifecycle";
test("permission dialog does not cancel live startup; actual backgrounding still stops it", () => {
  assert.equal(shouldStopLive("inactive", true, true), false);
  assert.equal(shouldStopLive("background", true, true), false);
  assert.equal(shouldStopLive("background", true, false), true);
  assert.equal(shouldStopLive("active", true, false), false);
  assert.equal(shouldStopLive("inactive", false, false), false);
});
