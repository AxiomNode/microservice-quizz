import { createGameConfigSchema, loadGameConfig } from "@axiomnode/shared-sdk-client";
import { z } from "zod";

/** @module config — Zod-validated environment configuration for the quiz microservice. */

const ConfigSchema = createGameConfigSchema({
  serviceName: "microservice-quiz",
  servicePort: 7100,
  generationEndpoint: "/generate/quiz",
  ingestEndpoint: "/ingest/quiz",
  maxQuestionsDefault: 12
});

/** Fully validated application configuration derived from environment variables. */
export type AppConfig = z.infer<typeof ConfigSchema>;

/** Parse and validate environment variables into an AppConfig, throwing on invalid values. */
export function loadConfig(): AppConfig {
  return loadGameConfig(ConfigSchema);
}
