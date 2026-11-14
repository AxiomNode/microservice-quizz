import { createGameConfigSchema, loadGameConfig } from "@axiomnode/shared-sdk-client";
import { z } from "zod";

import { quizStrategy } from "./games/quiz.js";
import type { GameStrategy } from "./games/strategy.js";

/** @module config — Zod-validated environment configuration of the game microservice. */

/** Environment schema whose defaults (service name, port, endpoints, batch size) come from the game strategy. */
function createConfigSchema(strategy: GameStrategy) {
  return createGameConfigSchema({
    serviceName: strategy.serviceName,
    servicePort: strategy.defaults.port,
    generationEndpoint: strategy.defaults.generationEndpoint,
    ingestEndpoint: strategy.defaults.ingestEndpoint,
    maxQuestionsDefault: strategy.defaults.maxItemsDefault
  });
}

/** Fully validated application configuration derived from environment variables. */
export type AppConfig = z.infer<ReturnType<typeof createConfigSchema>>;

/** Parse and validate environment variables into an AppConfig, throwing on invalid values. */
export function loadConfig(strategy: GameStrategy = quizStrategy): AppConfig {
  return loadGameConfig(createConfigSchema(strategy));
}
