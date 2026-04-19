import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("../app/db/client.js", () => ({
  prisma: {
    gameGeneration: {
      findMany: prismaMocks.findMany,
      findFirst: prismaMocks.findFirst,
      create: prismaMocks.create,
      deleteMany: prismaMocks.deleteMany,
      groupBy: prismaMocks.groupBy,
    },
  },
}));

import { GenerationService } from "../app/services/generationService.js";
import type { AppConfig } from "../app/config.js";

function createConfig(): AppConfig {
  return {
    SERVICE_NAME: "microservice-quiz",
    SERVICE_PORT: 7100,
    NODE_ENV: "test",
    AI_ENGINE_BASE_URL: "http://localhost:7001",
    AI_ENGINE_GENERATION_ENDPOINT: "/generate/quiz",
    AI_ENGINE_INGEST_ENDPOINT: "/ingest/quiz",
    AI_ENGINE_CATALOGS_ENDPOINT: "/catalogs",
    AI_ENGINE_INGEST_SOURCE: "microservice-quiz",
    AI_ENGINE_API_KEY: "test-key",
    AI_ENGINE_INGEST_API_KEY: "test-ingest-key",
    AI_ENGINE_REQUEST_TIMEOUT_MS: 420000,
    AI_ENGINE_RETRY_MAX_ATTEMPTS: 3,
    AI_ENGINE_RETRY_INITIAL_DELAY_MS: 1500,
    AI_ENGINE_RETRY_MAX_DELAY_MS: 12000,
    AI_AUTH_CIRCUIT_FAILURE_THRESHOLD: 3,
    AI_AUTH_CIRCUIT_COOLDOWN_MS: 300000,
    PRIVATE_DOCS_ENABLED: true,
    PRIVATE_DOCS_PREFIX: "/private/docs",
    PRIVATE_DOCS_TOKEN: "private-docs-token",
    METRICS_LOG_BUFFER_SIZE: 500,
    BATCH_GENERATION_ENABLED: true,
    BATCH_GENERATION_INTERVAL_MINUTES: 20,
    BATCH_GENERATION_TARGET_COUNT: 1000,
    BATCH_GENERATION_MAX_ATTEMPTS: 4000,
    BATCH_GENERATION_CONCURRENCY: 8,
    BATCH_GENERATION_MIN_DIFFICULTY: 25,
    BATCH_GENERATION_MAX_DIFFICULTY: 85,
    BATCH_GENERATION_MIN_QUESTIONS: 5,
    BATCH_GENERATION_MAX_QUESTIONS: 12,
    DATABASE_URL: "postgresql://quiz:quiz@localhost:7432/quizdb?schema=public",
  };
}

describe("GenerationService", () => {
  beforeEach(() => {
    prismaMocks.findMany.mockReset();
    prismaMocks.findFirst.mockReset();
    prismaMocks.create.mockReset();
    prismaMocks.deleteMany.mockReset();
    prismaMocks.groupBy.mockReset();
    vi.restoreAllMocks();
  });

  it("skips invalid persisted quiz entries in randomModels instead of failing the whole request", async () => {
    const service = new GenerationService(createConfig());
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    prismaMocks.findMany.mockResolvedValue([
      {
        id: "invalid-quiz",
        gameType: "quiz",
        query: "invalid quiz",
        language: "es",
        status: "created",
        categoryId: "9",
        categoryName: "General Knowledge",
        requestJson: JSON.stringify({ language: "es" }),
        responseJson: JSON.stringify({ game_type: "quiz", game: { questions: [] } }),
        createdAt: new Date("2026-04-15T18:00:00.000Z"),
      },
      {
        id: "valid-quiz",
        gameType: "quiz",
        query: "valid quiz",
        language: "es",
        status: "created",
        categoryId: "9",
        categoryName: "General Knowledge",
        requestJson: JSON.stringify({ language: "es" }),
        responseJson: JSON.stringify({
          game_type: "quiz",
          game: {
            questions: [
              {
                question: "Capital de Francia",
                options: ["Paris", "Roma", "Berlin", "Lisboa"],
                correct_index: 0,
              },
            ],
          },
        }),
        createdAt: new Date("2026-04-15T18:01:00.000Z"),
      },
    ]);

    const result = await service.randomModels({ count: 2, language: "es" });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("valid-quiz");
    expect(warnSpy).toHaveBeenCalledWith(
      "Skipping invalid stored quiz model",
      "invalid-quiz",
      "Generated quiz has no questions — rejecting incomplete content"
    );
  });
});