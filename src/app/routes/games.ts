import { FastifyInstance } from "fastify";
import { GenerationService } from "../services/generationService.js";
import {
  RuntimeGenerationWorker,
} from "../services/runtimeGenerationWorker.js";
import {
  BaseGenerateSchema,
  createGameRoutes as createSharedGameRoutes,
} from "@axiomnode/shared-sdk-client";

const GenerateSchema = BaseGenerateSchema;

/** @module games — Fastify routes for quiz generation, ingestion, history, and model retrieval. */

/** Register all /games/* routes on the Fastify instance. */
export async function gameRoutes(
  app: FastifyInstance,
  generationService: GenerationService,
  onIngestedDocuments?: (total: number) => void,
  runtimeGenerationWorker?: RuntimeGenerationWorker
): Promise<void> {
  return createSharedGameRoutes({
    app,
    gameType: "quiz",
    generateSchema: GenerateSchema,
    groupedBy: ["category"],
    generationService,
    onIngestedDocuments,
    runtimeGenerationWorker,
  });
}
