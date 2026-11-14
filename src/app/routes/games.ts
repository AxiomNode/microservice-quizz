import { FastifyInstance } from "fastify";
import { GenerationService } from "../services/generationService.js";
import {
  RuntimeGenerationWorker,
} from "../services/runtimeGenerationWorker.js";
import {
  HistoryQuerySchema,
  createGameRoutes as createSharedGameRoutes,
} from "@axiomnode/shared-sdk-client";
import { quizStrategy } from "../games/quiz.js";
import type { GameStrategy } from "../games/strategy.js";

/** @module games — Fastify routes for game generation, ingestion, history, and model retrieval. */

/** Register all /games/* routes on the Fastify instance. */
export async function gameRoutes(
  app: FastifyInstance,
  generationService: GenerationService,
  onIngestedDocuments?: (total: number) => void,
  runtimeGenerationWorker?: RuntimeGenerationWorker,
  strategy: GameStrategy = quizStrategy
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
    return reply.send({ gameType: strategy.gameType, ...insights });
  });

  return createSharedGameRoutes({
    app,
    gameType: strategy.gameType,
    generateSchema: strategy.generateSchema,
    groupedBy: strategy.groupedBy,
    generationService,
    onIngestedDocuments,
    runtimeGenerationWorker,
  });
}
