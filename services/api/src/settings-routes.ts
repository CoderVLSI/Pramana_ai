import { join } from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { fileURLToPath } from "node:url";
import { SettingsVault, VaultError } from "./settings-vault";
import {
  providerModels,
  validModel,
  modelResearchDate,
  type Provider,
} from "./provider-models";
import { testProvider } from "./voice-providers";
import { speakWithFallback, type Speak } from "./voice-router";
import { answerStrict, verify } from "./engine";
import { generateWelcome, ChatProviderError } from "./chat-provider";
import { isAppConversation } from "../../../packages/citation-schema/conversation";
export async function registerSettingsRoutes(
  app: FastifyInstance,
  options: { chatFetch?: typeof globalThis.fetch; voiceSpeak?: Speak } = {},
) {
  const vault = new SettingsVault(
    process.env.PRAMANA_DATA_DIR
      ? join(process.env.PRAMANA_DATA_DIR, "settings")
      : fileURLToPath(new URL("../data/settings/", import.meta.url)),
    process.env.SETTINGS_MASTER_KEY,
  );
  await vault.init();
  function transport(req: FastifyRequest) {
    const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.ip);
    if (
      req.protocol !== "https" &&
      !loopback &&
      !(
        process.env.NODE_ENV !== "production" &&
        process.env.ALLOW_INSECURE_LOCAL_SETTINGS === "true"
      )
    )
      throw new VaultError(403, "Use HTTPS to configure provider credentials.");
  }
  function token(req: FastifyRequest) {
    transport(req);
    return req.headers.authorization?.replace(/^Bearer /, "") || "";
  }
  app.post<{ Body: { query: string; preferred_name?: string } }>(
    "/v1/chat",
    {
      schema: {
        body: {
          type: "object",
          required: ["query"],
          additionalProperties: false,
          properties: {
            query: {
              type: "string",
              minLength: 1,
              maxLength: 500,
              pattern: "\\S",
            },
            preferred_name: { type: "string", maxLength: 80 },
          },
        },
      },
    },
    async (req, reply) => {
      reply.header("Cache-Control", "no-store");
      if (!isAppConversation(req.body.query))
        return reply.code(422).send({
          error:
            "Use the scripture-question endpoint for source-based questions.",
        });
      const profile = await vault.read(token(req));
      const provider = profile.active_provider;
      const key = profile[provider].api_key;
      const local = {
        kind: "app_conversation",
        message:
          "Hello! What would you like to study? You can ask a scripture question or explore the Library.",
        provider,
        model: null,
      };
      if (!key)
        return {
          ...local,
          connection_status: "not_configured",
          note: "This is a local greeting. Add your provider API key in Settings for connected text chat.",
        };
      try {
        const result = await generateWelcome({
          provider,
          key,
          name: req.body.preferred_name,
          query: req.body.query,
          fetch: options.chatFetch,
        });
        return {
          kind: "app_conversation",
          ...result,
          provider,
          connection_status: "connected",
        };
      } catch (error) {
        return {
          ...local,
          connection_status: "failed",
          note:
            "This is a local greeting. " +
            (error instanceof ChatProviderError
              ? error.message
              : "The provider could not be reached. Try again shortly."),
        };
      }
    },
  );
  app.post<{
    Body: {
      query: string;
      preferred_name?: string;
      work_ids?: string[];
      edition_ids?: string[];
    };
  }>(
    "/v1/voice/turn",
    {
      schema: {
        body: {
          type: "object",
          required: ["query"],
          additionalProperties: false,
          properties: {
            query: {
              type: "string",
              minLength: 1,
              maxLength: 2000,
              pattern: "\\S",
            },
            preferred_name: { type: "string", maxLength: 80 },
            work_ids: {
              type: "array",
              maxItems: 160,
              items: { type: "string", maxLength: 200 },
            },
            edition_ids: {
              type: "array",
              maxItems: 160,
              items: { type: "string", maxLength: 200 },
            },
          },
        },
      },
    },
    async (req, reply) => {
      reply.header("Cache-Control", "no-store");
      const profile = await vault.read(token(req));
      const provider = profile.active_provider;
      const key = profile[provider].api_key;
      let text: string;
      let answer: ReturnType<typeof answerStrict> | undefined;
      let kind: "app_conversation" | "verified_scripture" | "source_status";
      let note: string | undefined;
      if (isAppConversation(req.body.query)) {
        kind = "app_conversation";
        text =
          "Hello! What would you like to study? You can ask a scripture question or explore the Library.";
        if (key) {
          try {
            text = (
              await generateWelcome({
                provider,
                key,
                query: req.body.query,
                name: req.body.preferred_name,
                fetch: options.chatFetch,
              })
            ).message;
          } catch (error) {
            note =
              "This is a local greeting. " +
              (error instanceof ChatProviderError
                ? error.message
                : "Text provider unavailable.");
          }
        } else
          note =
            "This is a local greeting. Add your provider API key in Settings to enable voice.";
      } else {
        answer = answerStrict(req.body.query, req.body);
        const approved =
          answer.safe_to_speak &&
          answer.citations.length > 0 &&
          answer.citations.every(
            (p) => p.review_status === "approved" && p.audio_allowed === true,
          ) &&
          verify(answer, answer.citations);
        kind = approved ? "verified_scripture" : "source_status";
        text = approved
          ? answer.citations
              .map((p) => p.reference + ". " + p.translation)
              .join(" ")
          : "I could not verify an answer in the selected scripture collection. Please check the source review status in Library.";
      }
      if (!key)
        return {
          text,
          answer,
          kind,
          provider,
          audio: null,
          note:
            note ??
            "Add your selected provider API key in Settings to enable voice.",
        };
      try {
        const audio = await speakWithFallback(
          profile,
          text,
          options.voiceSpeak,
        );
        return {
          text,
          answer,
          kind,
          provider: audio.provider,
          audio,
          ...(note ? { note } : {}),
        };
      } catch {
        return {
          text,
          answer,
          kind,
          provider,
          audio: null,
          note: [
            note,
            "Voice could not be completed or its wording could not be verified. Your text response is still available. Check the API key, model access and quota in Settings.",
          ]
            .filter(Boolean)
            .join(" "),
        };
      }
    },
  );
  app.get("/v1/voice/models", async () => ({
    models: providerModels,
    researched_on: modelResearchDate,
    mode: "strict_verified_script",
    voice_ready: true,
    approved_source_audio_ready: false,
    reason:
      "Voice turns support greetings and source-status messages. Scripture audio requires approved, audio-enabled sources; the current corpus remains unapproved.",
  }));
  app.post("/v1/settings/session", async (req, reply) => {
    transport(req);
    return reply
      .header("Cache-Control", "no-store")
      .send({ token: await vault.create() });
  });
  app.get("/v1/settings", async (req, reply) =>
    reply
      .header("Cache-Control", "no-store")
      .send(vault.publicProfile(await vault.read(token(req)))),
  );
  const schema = {
    type: "object",
    required: ["provider", "model"],
    additionalProperties: false,
    properties: {
      provider: { type: "string", enum: ["openai", "gemini"] },
      model: { type: "string", maxLength: 100 },
      api_key: {
        type: "string",
        minLength: 16,
        maxLength: 512,
        pattern: "^\\S+$",
      },
      remove_key: { type: "boolean" },
      fallback_models: {
        type: "array",
        items: { type: "string", maxLength: 100 },
        uniqueItems: true,
        maxItems: 3,
      },
      cross_provider_fallback: { type: "boolean" },
    },
  };
  app.put<{
    Body: {
      provider: Provider;
      model: string;
      api_key?: string;
      remove_key?: boolean;
      fallback_models?: string[];
      cross_provider_fallback?: boolean;
    };
  }>("/v1/settings", { schema: { body: schema } }, async (req, reply) => {
    if (!validModel(req.body.provider, req.body.model))
      throw new VaultError(400, "Choose a supported voice model.");
    if (
      req.body.fallback_models?.some(
        (m) => m === req.body.model || !validModel(req.body.provider, m),
      )
    )
      throw new VaultError(
        400,
        "Fallback models must be available, distinct from the main model, and belong to this provider.",
      );
    if (req.body.api_key && req.body.remove_key)
      throw new VaultError(400, "Choose either replacement or removal.");
    return reply
      .header("Cache-Control", "no-store")
      .send(await vault.update(token(req), req.body.provider, req.body));
  });
  app.post<{ Body: { provider: Provider } }>(
    "/v1/settings/test",
    {
      schema: {
        body: {
          type: "object",
          required: ["provider"],
          additionalProperties: false,
          properties: {
            provider: { type: "string", enum: ["openai", "gemini"] },
          },
        },
      },
    },
    async (req, reply) => {
      const profile = await vault.read(token(req));
      const settings = profile[req.body.provider];
      if (!settings.api_key)
        throw new VaultError(400, "Save an API key first.");
      return reply
        .header("Cache-Control", "no-store")
        .send(
          await testProvider(
            req.body.provider,
            settings.api_key,
            settings.model,
          ),
        );
    },
  );
  app.delete("/v1/settings/session", async (req) => {
    await vault.remove(token(req));
    return { removed: true };
  });
  // Generative credentials never leave the server. A caller cannot bypass the voice verifier.
  app.post("/v1/voice/token", async (_req, reply) =>
    reply.code(409).send({
      error:
        "Strict mode keeps realtime sessions on the backend. Use verified-turn; direct generative tokens are not issued.",
    }),
  );
  app.post<{
    Body: { query: string; work_ids?: string[]; edition_ids?: string[] };
  }>(
    "/v1/voice/verified-turn",
    {
      schema: {
        body: {
          type: "object",
          required: ["query"],
          additionalProperties: false,
          properties: {
            query: {
              type: "string",
              minLength: 1,
              maxLength: 2000,
              pattern: "\\S",
            },
            work_ids: {
              type: "array",
              items: { type: "string" },
              maxItems: 160,
            },
            edition_ids: {
              type: "array",
              items: { type: "string" },
              maxItems: 160,
            },
          },
        },
      },
    },
    async (req, reply) => {
      const profile = await vault.read(token(req)),
        answer = answerStrict(req.body.query, req.body);
      if (
        !answer.safe_to_speak ||
        !answer.citations.length ||
        !answer.citations.every((p) => p.review_status === "approved") ||
        !verify(answer, answer.citations)
      )
        throw new VaultError(
          409,
          "Voice is blocked: the selected passages have not passed source review and verification.",
        );
      const provider = profile.active_provider,
        settings = profile[provider];
      if (!settings.api_key)
        throw new VaultError(400, "Add the selected provider key in Settings.");
      const script = answer.citations
        .map((p) => p.reference + ". " + p.translation)
        .join(" ");
      const audio = await speakWithFallback(profile, script);
      return reply
        .header("Cache-Control", "no-store")
        .send({ ...audio, answer });
    },
  );
}
