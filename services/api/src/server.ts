import { upanishadRegister } from "../../../packages/corpus-schema/upanishads";
import {
  gitaPressRegister,
  gitaPressEpicRegister,
  gitaPressVedaRegister,
} from "../../../packages/corpus-schema/register";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { mkdir, appendFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
const dataDirectory =
  process.env.PRAMANA_DATA_DIR ||
  fileURLToPath(new URL("../data/", import.meta.url));
import { passages, works } from "./corpus";
import { answerStrict, search } from "./engine";
import {
  loadApprovedCorpus,
  approvedCorpusStatus,
  approvedRecord,
  approvedPassages,
  approvedWorkSummaries,
} from "./approved-rag";
loadApprovedCorpus();
import { registerSettingsRoutes } from "./settings-routes";
import { VaultError } from "./settings-vault";
const app = Fastify({
  logger: { redact: ["req.headers.authorization", "req.body.api_key"] },
  bodyLimit: 16384,
  trustProxy: process.env.TRUST_PROXY || false,
});
app.setErrorHandler((error, req, reply) => {
  if (error instanceof VaultError)
    return reply.code(error.statusCode).send({ error: error.message });
  if (error && typeof error === "object" && "validation" in error)
    return reply
      .code(400)
      .send({ error: "Invalid request. Check the required fields." });
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    [400, 413, 415].includes(Number(error.statusCode))
  )
    return reply
      .code(Number(error.statusCode))
      .send({ error: "Invalid request format or size." });
  req.log.error({ message: "Request failed" });
  return reply.code(500).send({ error: "The request could not be completed." });
});
await app.register(cors, {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:8081",
  methods: ["GET", "POST", "PUT", "DELETE"],
});
const rates = new Map<string, { count: number; reset: number }>();
app.addHook("onRequest", async (req, reply) => {
  const now = Date.now();
  let rate = rates.get(req.ip);
  if (!rate || rate.reset < now) {
    rate = { count: 0, reset: now + 60000 };
    rates.set(req.ip, rate);
  }
  if (++rate.count > 60)
    return reply
      .code(429)
      .send({ error: "Please wait a minute before trying again." });
});
setInterval(() => {
  for (const [ip, rate] of rates) if (rate.reset < Date.now()) rates.delete(ip);
}, 60000).unref();
const questionSchema = {
  type: "object",
  required: ["query"],
  additionalProperties: false,
  properties: {
    query: { type: "string", minLength: 1, maxLength: 2000, pattern: "\\S" },
    work_ids: { type: "array", maxItems: 160, items: { type: "string" } },
    edition_ids: { type: "array", maxItems: 160, items: { type: "string" } },
  },
};
app.get("/health", async () => ({
  status: "ok",
  mode: approvedCorpusStatus().approved_passages
    ? "reviewed-corpus-and-development-fixtures"
    : "development-fixtures",
  approved_passages: approvedCorpusStatus().approved_passages,
}));
app.get("/v1/works", async () => {
  const summaries = approvedWorkSummaries();
  return works.map((w) =>
    summaries[w.id]
      ? {
          ...w,
          passage_count: summaries[w.id].passage_count,
          status: "Reviewed passages indexed · see edition coverage",
          subtitle:
            "Gita Press reviewed excerpts · edition coverage shown separately",
          editions: summaries[w.id].editions,
        }
      : w,
  );
});
app.get("/v1/corpus/register", async () => {
  const status = approvedCorpusStatus(),
    summaries = approvedWorkSummaries();
  return {
    publisher: "Gita Press",
    location: "Gorakhpur",
    total_works: 132,
    upanishad_count: 108,
    veda_count: 4,
    mahapurana_count: 18,
    epic_count: 2,
    indexed_passages: status.approved_passages,
    rights_status: status.approved_passages
      ? "approved_for_indexed_editions_only"
      : "pending",
    works: [
      ...gitaPressRegister,
      ...gitaPressEpicRegister,
      ...gitaPressVedaRegister,
      ...upanishadRegister,
    ].map((w) => {
      const summary = summaries[w.work_id];
      return summary
        ? {
            ...w,
            indexed_passages: summary.passage_count,
            rights_status: "approved_for_indexed_editions_only",
            review_status: "approved_for_indexed_editions_only",
            completeness: "see_indexed_editions",
            indexed_editions: summary.editions,
          }
        : w;
    }),
  };
});
app.get<{ Querystring: { offset?: number; limit?: number } }>(
  "/v1/passages",
  {
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          offset: { type: "integer", minimum: 0, maximum: 10000000 },
          limit: { type: "integer", minimum: 1, maximum: 200 },
        },
      },
    },
  },
  async (req) => {
    const offset = req.query.offset ?? 0,
      limit = req.query.limit ?? 200;
    const fixturePage = passages.slice(offset, offset + limit);
    return [
      ...fixturePage,
      ...approvedPassages(
        Math.max(0, offset - passages.length),
        limit - fixturePage.length,
      ),
    ];
  },
);
app.get<{ Params: { id: string } }>("/v1/passages/:id", async (req, reply) => {
  const p =
    approvedRecord(req.params.id) ??
    passages.find((p) => p.id === req.params.id);
  return p
    ? {
        ...p,
        context:
          p.review_status === "approved"
            ? []
            : passages.filter(
                (x) =>
                  x.chapter === p.chapter && Math.abs(x.verse - p.verse) <= 1,
              ),
      }
    : reply.code(404).send({ error: "Passage not found" });
});
app.post<{
  Body: { query: string; work_ids?: string[]; edition_ids?: string[] };
}>("/v1/questions", { schema: { body: questionSchema } }, async (req) =>
  answerStrict(req.body.query, req.body),
);
app.post<{
  Body: { query: string; work_ids?: string[]; edition_ids?: string[] };
}>("/v1/passages/search", { schema: { body: questionSchema } }, async (req) =>
  search(req.body.query, req.body),
);
app.post<{ Body: { passage_id: string; reason: string } }>(
  "/v1/reports",
  {
    schema: {
      body: {
        type: "object",
        required: ["passage_id", "reason"],
        additionalProperties: false,
        properties: {
          passage_id: { type: "string" },
          reason: { type: "string", minLength: 5, maxLength: 2000 },
        },
      },
    },
  },
  async (req, reply) => {
    if (
      !approvedRecord(req.body.passage_id) &&
      !passages.some((p) => p.id === req.body.passage_id)
    )
      return reply.code(404).send({ error: "Unknown passage" });
    const report = {
      case_id: randomUUID(),
      ...req.body,
      status: "received",
      created_at: new Date().toISOString(),
    };
    await mkdir(dataDirectory, { recursive: true });
    await appendFile(
      `${dataDirectory}/reports.jsonl`,
      JSON.stringify(report) + "\n",
    );
    return reply.code(201).send(report);
  },
);
await registerSettingsRoutes(app);
await app.listen({
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "0.0.0.0",
});
