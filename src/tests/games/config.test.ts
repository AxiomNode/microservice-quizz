import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "../../app/config.js";
import { quizStrategy } from "../../app/games/quiz.js";
import { wordpassStrategy } from "../../app/games/wordpass.js";

const savedEnv = { ...process.env };
const STRATEGY_KEYS = [
  "SERVICE_NAME",
  "SERVICE_PORT",
  "AI_ENGINE_GENERATION_ENDPOINT",
  "AI_ENGINE_INGEST_ENDPOINT",
  "BATCH_GENERATION_MAX_QUESTIONS",
];

describe("loadConfig defaults per game", () => {
  beforeEach(() => {
    for (const key of STRATEGY_KEYS) delete process.env[key];
    process.env.DATABASE_URL = "postgresql://games:games@localhost:5432/games?schema=public";
    process.env.PRIVATE_DOCS_TOKEN = "games-token";
  });
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("uses the quiz defaults", () => {
    expect(loadConfig(quizStrategy)).toMatchObject({
      SERVICE_NAME: "microservice-quiz",
      SERVICE_PORT: 7100,
      AI_ENGINE_GENERATION_ENDPOINT: "/generate/quiz",
      AI_ENGINE_INGEST_ENDPOINT: "/ingest/quiz",
      BATCH_GENERATION_MAX_QUESTIONS: 12,
    });
  });

  it("uses the word-pass defaults, now on port 7100 like quiz", () => {
    expect(loadConfig(wordpassStrategy)).toMatchObject({
      SERVICE_NAME: "microservice-wordpass",
      SERVICE_PORT: 7100,
      AI_ENGINE_GENERATION_ENDPOINT: "/generate/word-pass",
      AI_ENGINE_INGEST_ENDPOINT: "/ingest/word-pass",
      BATCH_GENERATION_MAX_QUESTIONS: 10,
    });
  });

  it("lets the environment override every strategy default, so an explicit SERVICE_PORT=7101 still works", () => {
    process.env.SERVICE_NAME = "custom-name";
    process.env.SERVICE_PORT = "7101";
    process.env.AI_ENGINE_GENERATION_ENDPOINT = "/custom/generate";
    process.env.AI_ENGINE_INGEST_ENDPOINT = "/custom/ingest";
    process.env.BATCH_GENERATION_MAX_QUESTIONS = "7";

    expect(loadConfig(wordpassStrategy)).toMatchObject({
      SERVICE_NAME: "custom-name",
      SERVICE_PORT: 7101,
      AI_ENGINE_GENERATION_ENDPOINT: "/custom/generate",
      AI_ENGINE_INGEST_ENDPOINT: "/custom/ingest",
      BATCH_GENERATION_MAX_QUESTIONS: 7,
    });
  });
});
