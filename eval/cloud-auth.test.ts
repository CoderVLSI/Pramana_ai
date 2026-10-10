import test from "node:test";
import assert from "node:assert/strict";
import { CloudAuth } from "../packages/cloud-sync/auth";
function fixture(fetcher: typeof fetch) {
  let value: string | null = null;
  return {
    auth: new CloudAuth(
      "https://test.supabase.co",
      "public",
      {
        get: async () => value,
        set: async (v) => {
          value = v;
        },
        remove: async () => {
          value = null;
        },
      },
      fetcher,
    ),
    get: () => value,
  };
}
test("email confirmation does not invent a signed-in session", async () => {
  const f = fixture(
    async () => new Response(JSON.stringify({ user: { id: "a" } })),
  );
  assert.equal(await f.auth.signUp("a@example.com", "password123"), null);
  assert.equal(f.get(), null);
});
test("sign-in persists tokens without persisting password, refreshes expired session", async () => {
  const calls: string[] = [];
  const f = fixture(async (url, options) => {
    calls.push(String(url));
    assert.ok(options?.signal);
    return new Response(
      JSON.stringify({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: calls.length === 1 ? -1 : 3600,
        user: { id: "id", email: "a@example.com" },
      }),
    );
  });
  await f.auth.signIn("a@example.com", "privatepassword");
  assert.equal(f.get()?.includes("privatepassword"), false);
  const [a, b] = await Promise.all([f.auth.session(), f.auth.session()]);
  assert.equal(a?.access_token, b?.access_token);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].includes("refresh_token"));
});
test("offline sign-out clears local credentials", async () => {
  let offline = false;
  const f = fixture(async () => {
    if (offline) throw Error("offline");
    return new Response(
      JSON.stringify({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        user: { id: "id" },
      }),
    );
  });
  await f.auth.signIn("a@example.com", "password");
  offline = true;
  await f.auth.signOut();
  assert.equal(f.get(), null);
});
