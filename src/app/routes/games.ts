import { FastifyInstance } from "fastify";
import { GenerationService } from "../services/generationService.js";
import {
  RuntimeGenerationWorker,
} from "../services/runtimeGenerationWorker.js";
import {
  BaseGenerateSchema,
  HistoryQuerySchema,
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
  const InsightsQuerySchema = HistoryQuerySchema.pick({ categoryId: true, difficultyPercentage: true, status: true });

  /** Aggregate behind the Backoffice history insights: GROUP BY category, no row payloads. */
  app.get("/games/history/insights", async (request, reply) => {
    const parsed = InsightsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        message: "Invalid query parameters",
        errors: parsed.error.flatten(),
      });
    }

    const insights = await generationService.historyInsights(parsed.data);
    return reply.send({ gameType: "quiz", ...insights });
  });

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
