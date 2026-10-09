import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  SettingsVault,
  VaultError,
  type Profile,
} from "../services/api/src/settings-vault";
import {
  fallbackChain,
  speakWithFallback,
  ProviderFailure,
} from "../services/api/src/voice-router";
import {
  speechMatches,
  pcmToWav,
  testProvider,
  type VerifiedAudio,
} from "../services/api/src/voice-providers";
import { validModel } from "../services/api/src/provider-models";
const profile: Profile = {
  active_provider: "openai",
  cross_provider_fallback: false,
  openai: {
    model: "gpt-realtime-2.1",
    api_key: "fake-key-openai-only",
    fallback_models: ["gpt-realtime-2.1-mini", "gpt-realtime-2"],
  },
  gemini: {
    model: "gemini-3.8-live",
    api_key: "fake-key-gemini-only",
    fallback_models: ["gemini-3.8-live-extended-thinking"],
  },
};
const audio: VerifiedAudio = {
  provider: "openai",
  model: "gpt-realtime-2.1-mini",
  audio_base64: "ZGV2LWZpeHR1cmU=",
  mime_type: "audio/wav",
  transcript: "Verified passage script.",
};
test("keys encrypted at rest, isolated, removable, and never echoed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pramana-vault-"));
  try {
    const vault = new SettingsVault(dir, "ab".repeat(32));
    await vault.init();
    const a = await vault.create(),
      b = await vault.create();
    await vault.update(a, "openai", {
      model: "gpt-realtime-2.1",
      api_key: "fake-key-do-not-leak",
    });
    assert.equal((await vault.read(a)).openai.api_key, "fake-key-do-not-leak");
    assert.equal((await vault.read(b)).openai.api_key, undefined);
    assert.ok(
      !JSON.stringify(vault.publicProfile(await vault.read(a))).includes(
        "fake-key",
      ),
    );
    for (const file of await readdir(dir))
      assert.ok(
        !(await readFile(join(dir, file))).includes(Buffer.from("fake-key")),
      );
    const restarted = new SettingsVault(dir, "ab".repeat(32));
    await restarted.init();
    assert.equal(
      (await restarted.read(a)).openai.api_key,
      "fake-key-do-not-leak",
    );
    await vault.update(a, "openai", {
      model: "gpt-realtime-2.1",
      remove_key: true,
    });
    assert.equal((await vault.read(a)).openai.api_key, undefined);
    await vault.remove(a);
    await assert.rejects(vault.read(a), /Reconnect/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("fallbacks stay within provider unless explicitly enabled; expired models skipped", () => {
  assert.ok(fallbackChain(profile).every((x) => x.provider === "openai"));
  assert.ok(
    fallbackChain({ ...profile, cross_provider_fallback: true }).some(
      (x) => x.provider === "gemini",
    ),
  );
  assert.equal(
    validModel(
      "gemini",
      "gemini-3.1-flash-live-preview",
      Date.parse("2026-11-18"),
    ),
    false,
  );
  assert.equal(validModel("gemini", "gemini-2.0-flash-live-001"), false);
});
test("temporary demand failure uses next model and preserves verified script", async () => {
  const calls: string[] = [];
  const r = await speakWithFallback(
    profile,
    audio.transcript,
    async (_p, _key, model, script) => {
      calls.push(model);
      assert.equal(script, audio.transcript);
      if (calls.length === 1) throw new ProviderFailure(429, "Busy", true);
      return { ...audio, model };
    },
  );
  assert.deepEqual(calls, ["gpt-realtime-2.1", "gpt-realtime-2.1-mini"]);
  assert.equal(r.fallback_used, true);
});
test("authentication and speech verification errors never trigger fallback", async () => {
  let calls = 0;
  await assert.rejects(
    speakWithFallback(profile, audio.transcript, async () => {
      calls++;
      throw new ProviderFailure(401, "Invalid key", false);
    }),
    /Invalid key/,
  );
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(
    speakWithFallback(profile, audio.transcript, async () => {
      calls++;
      return { ...audio, transcript: "Unsupported doctrinal claim" };
    }),
    /verification/,
  );
  assert.equal(calls, 1);
});
test("cross-provider failure handling is bounded and all-provider failure preserves text", async () => {
  let calls = 0;
  await assert.rejects(
    speakWithFallback(
      { ...profile, cross_provider_fallback: true },
      audio.transcript,
      async () => {
        calls++;
        throw new ProviderFailure(503, "Busy", true);
      },
    ),
    /text answer is still available/,
  );
  assert.equal(calls, 4);
});
test("spoken transcript matching preserves word boundaries and WAV format", () => {
  assert.ok(speechMatches("Hello, world.", "hello world"));
  assert.equal(speechMatches("now here", "nowhere"), false);
  const wav = pcmToWav(Buffer.alloc(4));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt32LE(40), 4);
});
test("connection tests use fixed official origins and header keys, sanitized errors", async () => {
  const fakeFetch = (async (url, init) => {
    assert.equal(
      url,
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-live",
    );
    assert.equal(
      (init?.headers as Record<string, string>)["x-goog-api-key"],
      "private-test-key",
    );
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  assert.equal(
    (
      await testProvider(
        "gemini",
        "private-test-key",
        "gemini-3.8-live",
        fakeFetch,
      )
    ).ok,
    true,
  );
  await assert.rejects(
    testProvider(
      "openai",
      "private-test-key",
      "gpt-realtime-2.1",
      (async () =>
        new Response("secret provider payload", {
          status: 403,
        })) as typeof fetch,
    ),
    /Provider rejected/,
  );
});
