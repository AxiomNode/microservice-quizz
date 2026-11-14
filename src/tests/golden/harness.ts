/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module harness - Builds the real service wiring (same modules and order as app/server.ts) on top of a
 * recording in-memory Prisma double and a stubbed ai-engine fetch, so black-box behaviour can be captured as
 * golden fixtures. It only touches the public entry points of the service, so the very same file runs against
 * both the pre-merge quiz and word-pass code bases.
 */
import { buildGameServer } from "@axiomnode/shared-sdk-client";
import { vi } from "vitest";

import { GOLDEN_SEEDS, type GoldenGame } from "./seeds.js";

export interface RecordedCall {
  method: string;
  args: unknown;
}

export interface HarnessPrisma {
  gameGeneration: Record<string, ReturnType<typeof vi.fn>>;
  $disconnect: () => Promise<void>;
}

/** Recording prisma double. `state.findFirst` queues what successive findFirst calls answer. */
export function createFakePrisma(game: GoldenGame) {
  const seed = GOLDEN_SEEDS[game];
  const calls: RecordedCall[] = [];
  const state: { findFirst: Array<Record<string, unknown> | null>; rows: Array<Record<string, unknown>> } = {
    findFirst: [],
    rows: seed.rows.map((item) => ({ ...item })),
  };
  const record = (method: string, args: unknown) =>
    calls.push({ method, args: JSON.parse(JSON.stringify(args ?? null)) });

  const gameGeneration = {
    findMany: vi.fn(async (args: any) => {
      record("findMany", args);
      const ids: string[] | undefined = args?.where?.id?.in;
      const matching = ids ? state.rows.filter((item) => ids.includes(item.id as string)) : state.rows;
      const rows = typeof args?.take === "number" ? matching.slice(0, args.take) : matching;
      return args?.select?.id === true && Object.keys(args.select).length === 1
        ? rows.map((item) => ({ id: item.id }))
        : rows;
    }),
    findFirst: vi.fn(async (args: any) => {
      record("findFirst", args);
      return state.findFirst.length > 0 ? (state.findFirst.shift() ?? null) : null;
    }),
    count: vi.fn(async (args: any) => {
      record("count", args);
      return state.rows.length;
    }),
    groupBy: vi.fn(async (args: any) => {
      record("groupBy", args);
      const groups = new Map<string, { categoryId: unknown; categoryName: unknown; n: number; max: Date }>();
      for (const item of state.rows) {
        const key = `${item.categoryId}|${item.categoryName}`;
        const current = groups.get(key);
        const created = item.createdAt as Date;
        if (current) {
          current.n += 1;
          if (created > current.max) current.max = created;
        } else {
          groups.set(key, { categoryId: item.categoryId, categoryName: item.categoryName, n: 1, max: created });
        }
      }
      return [...groups.values()].map((group) => ({
        categoryId: group.categoryId,
        categoryName: group.categoryName,
        _count: { _all: group.n },
        _max: { createdAt: group.max },
      }));
    }),
    create: vi.fn(async (args: any) => {
      record("create", args);
      return { id: "golden-created", createdAt: new Date("2026-11-14T12:00:00.000Z"), ...args.data };
    }),
    update: vi.fn(async (args: any) => {
      record("update", args);
      return { ...state.rows[0], ...args.data, id: args.where?.id ?? "golden-updated" };
    }),
    deleteMany: vi.fn(async (args: any) => {
      record("deleteMany", args);
      return { count: 1 };
    }),
  };

  return {
    prisma: { gameGeneration, $disconnect: vi.fn(async () => undefined) } as unknown as HarnessPrisma,
    calls,
    state,
  };
}

export interface RecordedFetch {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

/** Stubs global fetch (ai-engine). Records every outbound call; /generate answers with seed.aiPayload(n). */
export function installFetchStub(game: GoldenGame) {
  const seed = GOLDEN_SEEDS[game];
  const calls: RecordedFetch[] = [];
  let generateCalls = 0;
  const stub = vi.fn(async (input: any, init: any = {}) => {
    const url = new URL(String(input));
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(init.headers ?? {})) {
      headers[key.toLowerCase()] = String(value);
    }
    let body: unknown = null;
    if (typeof init.body === "string") {
      body = JSON.parse(init.body);
    }
    const query = [...url.searchParams.entries()].map(([k, v]) => `${k}=${v}`).sort().join("&");
    calls.push({ method: init.method ?? "GET", url: `${url.origin}${url.pathname}?${query}`, headers, body });
    const respond = (payload: unknown) =>
      ({ ok: true, status: 200, json: async () => payload }) as unknown as Response;
    if (url.pathname.startsWith("/generate/")) {
      generateCalls += 1;
      return respond(seed.aiPayload(generateCalls));
    }
    if (url.pathname.startsWith("/ingest/")) {
      return respond({ ingested: 2 });
    }
    return respond({});
  });
  vi.stubGlobal("fetch", stub);
  return { calls, stub };
}

/** Same wiring and order as app/server.ts buildServer(); `modules` are the repo's own app modules. */
export async function buildHarnessApp(modules: {
  loadConfig: () => any;
  GenerationService: new (config: any, observer: any) => any;
  ModelGenerationJob: new (config: any, service: any) => any;
  RuntimeGenerationWorker: new (service: any) => any;
  ServiceMetrics: new (config: any) => any;
  gameRoutes: any;
  healthRoutes: any;
  monitoringRoutes: any;
  prisma: HarnessPrisma;
}) {
  const config = modules.loadConfig();
  const metrics = new modules.ServiceMetrics(config);
  const generationService = new modules.GenerationService(config, {
    onModelStored: () => metrics.recordGenerationStored(),
    onModelDuplicate: (reason: string) => metrics.recordGenerationDuplicate(reason),
    onModelFailed: () => metrics.recordGenerationFailed(),
    onAiAuthCircuitStateChanged: (state: unknown) => metrics.recordAiAuthCircuitState(state),
    onProcessStarted: ({ taskId, requested }: any) => metrics.recordGenerationProcessStarted(requested, taskId),
    onProcessItemProgress: (payload: any) =>
      metrics.recordLog(
        payload.status === "failed" || payload.status === "timeout" ? "error" : "info",
        "generation_process_item_progress",
        payload,
      ),
    onProcessCompleted: (snapshot: unknown) => metrics.recordGenerationProcessCompleted(snapshot),
    onBatchCompleted: (result: unknown) => metrics.recordBatch(result),
    onOutboundRequest: (metric: unknown) => metrics.recordOutboundRequest(metric),
  });
  const generationJob = new modules.ModelGenerationJob(config, generationService);
  const runtimeGenerationWorker = new modules.RuntimeGenerationWorker(generationService);
  const server = await buildGameServer({
    config,
    generationService,
    generationJob,
    runtimeGenerationWorker,
    metrics,
    disconnect: () => modules.prisma.$disconnect(),
    registerHealthRoutes: (app: any) => modules.healthRoutes(app, generationService),
    registerGameRoutes: modules.gameRoutes,
    registerMonitoringRoutes: modules.monitoringRoutes,
  } as any);
  return { ...server, config, generationService, metrics };
}

/** Make output stable: sort object keys and replace uuids. */
export function normalize(value: unknown): unknown {
  const text = JSON.stringify(value, (_key, item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
    }
    return item;
  });
  return JSON.parse(
    (text ?? "null").replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<uuid>"),
  );
}
