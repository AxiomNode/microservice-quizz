import { describe, expect, it, vi } from "vitest";

import Fastify from "fastify";

import { gameRoutes } from "../app/routes/games.js";

function createGenerationServiceStub() {
  return {
    assertAiGenerationAvailable: vi.fn(),
    generateAndStore: vi.fn(),
    startGenerationProcess: vi.fn(),
    runGenerationProcessBlocking: vi.fn(),
    listGenerationProcesses: vi.fn().mockReturnValue([]),
    getGenerationProcess: vi.fn(),
    ingestToRag: vi.fn(),
    randomModels: vi.fn().mockResolvedValue([]),
    history: vi.fn(),
    storeManualModel: vi.fn(),
    deleteHistoryItem: vi.fn(),
    groupedModelsSummary: vi.fn(),
    getCatalogSnapshot: vi.fn(),
  };
}

describe("games routes", () => {
  it("rejects invalid generate payloads before hitting the generation service", async () => {
    const app = Fastify();
    const generationService = createGenerationServiceStub();

    await gameRoutes(app, generationService as never);

    const response = await app.inject({
      method: "POST",
      url: "/games/generate",
      payload: {
        language: "es",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ message: "Invalid payload" });
    expect(generationService.assertAiGenerationAvailable).not.toHaveBeenCalled();
    expect(generationService.generateAndStore).not.toHaveBeenCalled();

    await app.close();
  });

  it("rejects invalid random-model query params before hitting the generation service", async () => {
    const app = Fastify();
    const generationService = createGenerationServiceStub();

    await gameRoutes(app, generationService as never);

    const response = await app.inject({
      method: "GET",
      url: "/games/models/random?count=0",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ message: "Invalid query parameters" });
    expect(generationService.randomModels).not.toHaveBeenCalled();

    await app.close();
  });
});