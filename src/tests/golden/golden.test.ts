/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Golden snapshot of the black-box behaviour of the game service: HTTP responses, the prisma calls each request
 * makes (including the `gameType` filter, stored query and uniquenessKey) and the ai-engine requests it sends.
 *
 * Fixtures live in ./fixtures/<gameType>.json. They were captured once from the pre-merge services
 * (quizz 03d2f89 and word-pass 0271474) and must never be regenerated from refactored code: a diff here means
 * behaviour changed. To (re)capture on purpose: GOLDEN_UPDATE=1 GOLDEN_GAME=<quiz|word-pass> npx vitest run golden
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { buildHarnessApp, createFakePrisma, installFetchStub, normalize } from "./harness.js";
import { GOLDEN_SEEDS, type GoldenGame } from "./seeds.js";

const holder = vi.hoisted(() => ({ current: undefined as any }));

vi.mock("../../app/db/client.js", () => ({
  prisma: new Proxy({}, { get: (_target, key) => holder.current?.[key] }),
}));

import { loadConfig } from "../../app/config.js";
import { gameRoutes } from "../../app/routes/games.js";
import { healthRoutes } from "../../app/routes/health.js";
import { monitoringRoutes } from "../../app/routes/monitoring.js";
import { GenerationService } from "../../app/services/generationService.js";
import { ModelGenerationJob } from "../../app/services/modelGenerationJob.js";
import { RuntimeGenerationWorker } from "../../app/services/runtimeGenerationWorker.js";
import { ServiceMetrics } from "../../app/services/serviceMetrics.js";

const GAME = (process.env.GOLDEN_GAME ?? "quiz") as GoldenGame;
const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", `${GAME}.json`);
const seed = GOLDEN_SEEDS[GAME];

const ENV_KEYS = [
  "SERVICE_NAME",
  "SERVICE_PORT",
  "AI_ENGINE_GENERATION_ENDPOINT",
  "AI_ENGINE_INGEST_ENDPOINT",
  "AI_ENGINE_INGEST_SOURCE",
  "BATCH_GENERATION_MAX_QUESTIONS",
  "GAME_TYPE",
];

describe(`golden behaviour (${GAME})`, () => {
  const savedEnv: Record<string, string | undefined> = {};
  let fake: ReturnType<typeof createFakePrisma>;
  let fetchStub: ReturnType<typeof installFetchStub>;
  let built: Awaited<ReturnType<typeof buildHarnessApp>>;
  const captured: Record<string, unknown> = {};

  beforeAll(async () => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    Object.assign(process.env, {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://golden:golden@localhost:5432/golden?schema=public",
      AI_ENGINE_BASE_URL: "http://ai-engine.golden.test",
      AI_ENGINE_API_KEY: "golden-ai-key",
      PRIVATE_DOCS_TOKEN: "golden-docs-token",
      BATCH_GENERATION_CONCURRENCY: "1",
      GAME_GENERATION_ITEM_RETRY_MAX_ATTEMPTS: "1",
      AI_ENGINE_RETRY_MAX_ATTEMPTS: "1",
    });
    vi.useFakeTimers({ now: new Date("2026-11-14T12:00:00.000Z"), toFake: ["Date"] });
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    fake = createFakePrisma(GAME);
    holder.current = fake.prisma;
    fetchStub = installFetchStub(GAME);
    built = await buildHarnessApp({
      loadConfig,
      GenerationService: GenerationService as any,
      ModelGenerationJob: ModelGenerationJob as any,
      RuntimeGenerationWorker: RuntimeGenerationWorker as any,
      ServiceMetrics: ServiceMetrics as any,
      gameRoutes,
      healthRoutes,
      monitoringRoutes,
      prisma: fake.prisma,
    });
  });

  afterAll(async () => {
    await built.app.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    if (process.env.GOLDEN_UPDATE === "1") {
      fs.writeFileSync(FIXTURE, `${JSON.stringify(normalize(captured), null, 2)}\n`);
    }
  });

  async function http(
    name: string,
    request: { method: "GET" | "POST" | "PATCH" | "DELETE"; url: string; payload?: unknown; headers?: Record<string, string> },
  ): Promise<void> {
    fake.calls.length = 0;
    fetchStub.calls.length = 0;
    const response = await built.app.inject(request as any);
    const contentType = String(response.headers["content-type"] ?? "");
    let body: unknown;
    try {
      body = contentType.includes("json") ? response.json() : response.body;
    } catch {
      body = response.body;
    }
    record(name, { request, status: response.statusCode, contentType: contentType.split(";")[0], body });
  }

  function record(name: string, result: Record<string, unknown>): void {
    const entry = normalize({ ...result, prismaCalls: [...fake.calls], aiEngineCalls: [...fetchStub.calls] });
    captured[name] = entry;
    if (process.env.GOLDEN_UPDATE !== "1") {
      const expected = JSON.parse(fs.readFileSync(FIXTURE, "utf8")) as Record<string, unknown>;
      expect(entry, `golden scenario "${name}"`).toEqual(expected[normalize(name) as string]);
    }
  }

  const docsAuth = { "x-private-docs-token": "golden-docs-token" };

  const scenarios: Array<[string, () => Promise<void>]> = [
    ["health", () => http("health", { method: "GET", url: "/health" })],
    ["catalogs", () => http("catalogs", { method: "GET", url: "/catalogs" })],
    [
      "models/random",
      () => http("models/random", { method: "GET", url: "/games/models/random?count=2&categoryId=9&difficultyPercentage=40" }),
    ],
    ["models/random invalid", () => http("models/random invalid", { method: "GET", url: "/games/models/random?count=0" })],
    ["history", () => http("history", { method: "GET", url: "/games/history?limit=5" })],
    [
      "history paged",
      () => http("history paged", { method: "GET", url: "/games/history?page=1&pageSize=2&categoryId=9&status=created" }),
    ],
    ["history/insights", () => http("history/insights", { method: "GET", url: "/games/history/insights?status=created" })],
    ["models/grouped", () => http("models/grouped", { method: "GET", url: "/games/models/grouped" })],
    ["monitor/stats", () => http("monitor/stats", { method: "GET", url: "/monitor/stats" })],
    ["monitor/logs", () => http("monitor/logs", { method: "GET", url: "/monitor/logs?limit=50" })],
    ["generate invalid", () => http("generate invalid", { method: "POST", url: "/games/generate", payload: {} })],
    [
      "generate",
      () =>
        http("generate", {
          method: "POST",
          url: "/games/generate",
          payload: { categoryId: "17", difficultyPercentage: 55, itemCount: 3, ...seed.generateExtras },
        }),
    ],
    [
      "generate duplicate",
      async () => {
        fake.state.findFirst.push({ id: "existing" });
        await http("generate duplicate", {
          method: "POST",
          url: "/games/generate",
          payload: { categoryId: "9", difficultyPercentage: 20 },
        });
      },
    ],
    [
      "generate/process/wait",
      () =>
        http("generate/process/wait", {
          method: "POST",
          url: "/games/generate/process/wait",
          payload: { categoryId: "9", count: 3, requestedBy: "backoffice", ...seed.generateExtras },
        }),
    ],
    [
      "history/manual",
      () =>
        http("history/manual", {
          method: "POST",
          url: "/games/history/manual",
          payload: { categoryId: "17", difficultyPercentage: 70, content: seed.manualContent, status: "validated" },
        }),
    ],
    [
      "history/manual duplicate",
      async () => {
        fake.state.findFirst.push({ id: "dup" });
        await http("history/manual duplicate", {
          method: "POST",
          url: "/games/history/manual",
          payload: { categoryId: "17", difficultyPercentage: 70, content: seed.manualContent },
        });
      },
    ],
    [
      "history patch",
      async () => {
        fake.state.findFirst.push(fake.state.rows[1], null);
        await http("history patch", {
          method: "PATCH",
          url: `/games/history/golden-${GAME}-2`,
          payload: { categoryId: "9", difficultyPercentage: 33, content: seed.updateContent },
        });
      },
    ],
    ["history patch missing", () => http("history patch missing", { method: "PATCH", url: "/games/history/nope", payload: { difficultyPercentage: 1 } })],
    ["history delete", () => http("history delete", { method: "DELETE", url: `/games/history/golden-${GAME}-1` })],
    [
      "ingest",
      () =>
        http("ingest", {
          method: "POST",
          url: "/games/ingest",
          payload: { documents: [{ content: "alpha", docId: "d1" }, { content: "beta" }], categoryId: "9", difficultyPercentage: 40 },
        }),
    ],
    ["worker state", () => http("worker state", { method: "GET", url: "/games/generate/worker" })],
    ["metrics", () => http("metrics", { method: "GET", url: "/metrics" })],
    ["monitor/stats after traffic", () => http("monitor/stats after traffic", { method: "GET", url: "/monitor/stats" })],
    [
      "private docs",
      () => http("private docs", { method: "GET", url: "/private/docs/json", headers: docsAuth }),
    ],
    [
      "batch generation (service)",
      async () => {
        fake.calls.length = 0;
        fetchStub.calls.length = 0;
        const result = await built.generationService.generateBatchModels({ targetCount: 4, maxAttempts: 4 });
        record("batch generation (service)", { result });
      },
    ],
  ];

  it.each(scenarios.map(([name]) => name))("scenario: %s", async (name) => {
    const scenario = scenarios.find(([title]) => title === name);
    await scenario![1]();
  });
});
