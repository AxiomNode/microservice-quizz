import { afterEach, describe, expect, it } from "vitest";

import { loadConfig } from "../app/config.js";
import { GAME_FIXTURES } from "./support/games.js";

const originalEnv = { ...process.env };

function withEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...originalEnv, ...overrides };
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe.each(GAME_FIXTURES)("loadConfig ($gameType)", (fx) => {
  const DATABASE_URL = fx.createConfig().DATABASE_URL;
  it("loads defaults and only normalizes the optional fields wired through OptionalEnvString", () => {
    withEnv({
      DATABASE_URL,
      PRIVATE_DOCS_ENABLED: "false",
      PRIVATE_DOCS_TOKEN: "   ",
      AI_ENGINE_INGEST_SOURCE: "   ",
    });

    const config = loadConfig(fx.strategy);

    expect(config.SERVICE_NAME).toBe(fx.serviceName);
    expect(config.PRIVATE_DOCS_ENABLED).toBe(false);
    expect(config.PRIVATE_DOCS_TOKEN).toBeUndefined();
    expect(config.AI_ENGINE_INGEST_SOURCE).toBe("   ");
    expect(config.BATCH_GENERATION_ENABLED).toBe(false);
  });

  it("accepts private docs when an explicit token is configured", () => {
    withEnv({
      DATABASE_URL,
      PRIVATE_DOCS_ENABLED: "true",
      PRIVATE_DOCS_TOKEN: "docs-token",
      AI_ENGINE_API_KEY: undefined,
      BATCH_GENERATION_INTERVAL_MINUTES: "15",
    });

    const config = loadConfig(fx.strategy);

    expect(config.PRIVATE_DOCS_ENABLED).toBe(true);
    expect(config.PRIVATE_DOCS_TOKEN).toBe("docs-token");
    expect(config.BATCH_GENERATION_INTERVAL_MINUTES).toBe(15);
  });

  it("parses BATCH_GENERATION_ENABLED=false as disabled", () => {
    withEnv({
      DATABASE_URL,
      PRIVATE_DOCS_ENABLED: "false",
      BATCH_GENERATION_ENABLED: "false",
    });

    const config = loadConfig(fx.strategy);

    expect(config.BATCH_GENERATION_ENABLED).toBe(false);
  });

  it("accepts private docs when only AI_ENGINE_API_KEY is configured", () => {
    withEnv({
      DATABASE_URL,
      PRIVATE_DOCS_ENABLED: "on",
      PRIVATE_DOCS_TOKEN: "",
      AI_ENGINE_API_KEY: "fallback-key",
    });

    const config = loadConfig(fx.strategy);

    expect(config.PRIVATE_DOCS_ENABLED).toBe(true);
    expect(config.AI_ENGINE_API_KEY).toBe("fallback-key");
  });

  it("fails when private docs are enabled without PRIVATE_DOCS_TOKEN or AI_ENGINE_API_KEY", () => {
    withEnv({
      DATABASE_URL,
      PRIVATE_DOCS_ENABLED: "yes",
      PRIVATE_DOCS_TOKEN: undefined,
      AI_ENGINE_API_KEY: undefined,
    });

    expect(() => loadConfig(fx.strategy)).toThrow("Private docs require PRIVATE_DOCS_TOKEN or AI_ENGINE_API_KEY");
  });

  it("fails when numeric constraints are invalid", () => {
    withEnv({
      DATABASE_URL,
      PRIVATE_DOCS_ENABLED: "false",
      AI_ENGINE_REQUEST_TIMEOUT_MS: "1000",
    });

    expect(() => loadConfig(fx.strategy)).toThrow();
  });

  it("fails when PRIVATE_DOCS_ENABLED is not a recognized boolean", () => {
    withEnv({
      DATABASE_URL,
      PRIVATE_DOCS_ENABLED: "maybe",
    });

    expect(() => loadConfig(fx.strategy)).toThrow();
  });

  describe("strategy defaults", () => {
    const strategyKeys = [
      "SERVICE_NAME",
      "SERVICE_PORT",
      "AI_ENGINE_GENERATION_ENDPOINT",
      "AI_ENGINE_INGEST_ENDPOINT",
      "BATCH_GENERATION_MAX_QUESTIONS",
    ];
    const clean = (extra: Record<string, string | undefined> = {}) =>
      withEnv({
        ...Object.fromEntries(strategyKeys.map((key) => [key, undefined])),
        DATABASE_URL,
        PRIVATE_DOCS_TOKEN: "games-token",
        ...extra,
      });

    it("takes service name, port, endpoints and batch size from the strategy (port 7100 for every game)", () => {
      clean();

      expect(loadConfig(fx.strategy)).toMatchObject({
        SERVICE_NAME: fx.serviceName,
        SERVICE_PORT: 7100,
        AI_ENGINE_GENERATION_ENDPOINT: fx.generationEndpoint,
        AI_ENGINE_INGEST_ENDPOINT: fx.ingestEndpoint,
        BATCH_GENERATION_MAX_QUESTIONS: fx.maxItemsDefault,
      });
    });

    it("lets the environment override every strategy default, so an explicit SERVICE_PORT=7101 still works", () => {
      clean({
        SERVICE_NAME: "custom-name",
        SERVICE_PORT: "7101",
        AI_ENGINE_GENERATION_ENDPOINT: "/custom/generate",
        AI_ENGINE_INGEST_ENDPOINT: "/custom/ingest",
        BATCH_GENERATION_MAX_QUESTIONS: "7",
      });

      expect(loadConfig(fx.strategy)).toMatchObject({
        SERVICE_NAME: "custom-name",
        SERVICE_PORT: 7101,
        AI_ENGINE_GENERATION_ENDPOINT: "/custom/generate",
        AI_ENGINE_INGEST_ENDPOINT: "/custom/ingest",
        BATCH_GENERATION_MAX_QUESTIONS: 7,
      });
    });
  });
});