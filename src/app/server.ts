import "dotenv/config";

import { buildGameServer } from "@axiomnode/shared-sdk-client";

import { loadConfig } from "./config.js";
import { prisma } from "./db/client.js";
import { quizStrategy } from "./games/quiz.js";
import type { GameStrategy } from "./games/strategy.js";
import { gameRoutes } from "./routes/games.js";
import { healthRoutes } from "./routes/health.js";
import { GenerationService } from "./services/generationService.js";
import { ModelGenerationJob } from "./services/modelGenerationJob.js";
import { RuntimeGenerationWorker } from "./services/runtimeGenerationWorker.js";
import { monitoringRoutes } from "./routes/monitoring.js";
import { ServiceMetrics } from "./services/serviceMetrics.js";
import { startListeningFirst } from "./services/startup.js";

/** @module server — Fastify application bootstrap, hooks, and startup orchestration. */

async function buildServer(strategy: GameStrategy) {
  const config = loadConfig(strategy);
  const metrics = new ServiceMetrics(config);

  const generationService = new GenerationService(config, {
    onModelStored: () => metrics.recordGenerationStored(),
    onModelDuplicate: (reason) => metrics.recordGenerationDuplicate(reason),
    onModelFailed: () => metrics.recordGenerationFailed(),
    onAiAuthCircuitStateChanged: (state) => metrics.recordAiAuthCircuitState(state),
    onProcessStarted: ({ taskId, requested }) => metrics.recordGenerationProcessStarted(requested, taskId),
    onProcessItemProgress: (payload) => metrics.recordLog(
      payload.status === "failed" || payload.status === "timeout" ? "error" : "info",
      "generation_process_item_progress",
      payload
    ),
    onProcessCompleted: (snapshot) => metrics.recordGenerationProcessCompleted(snapshot),
    onBatchCompleted: (result) => metrics.recordBatch(result),
    onOutboundRequest: (metric) => metrics.recordOutboundRequest(metric)
  }, strategy);
  const generationJob = new ModelGenerationJob(config, generationService);
  const runtimeGenerationWorker = new RuntimeGenerationWorker(generationService, strategy);
  return buildGameServer({
    config,
    generationService,
    generationJob,
    runtimeGenerationWorker,
    metrics,
    disconnect: () => prisma.$disconnect(),
    registerHealthRoutes: (app) => healthRoutes(app, generationService, strategy),
    registerGameRoutes: (app, service, onIngestedDocuments, worker) =>
      gameRoutes(app, service, onIngestedDocuments, worker, strategy),
    registerMonitoringRoutes: (app, serviceMetrics, service) =>
      monitoringRoutes(app, serviceMetrics, service, strategy),
  });
}

async function main() {
  const strategy = quizStrategy;
  // Listen first; catalogs are refreshed in the background (with the same ai-engine retries) and /health
  // reports `catalogReady` honestly instead of blocking startup while ai-engine is unreachable.
  await startListeningFirst({
    ...(await buildServer(strategy)),
    gameType: strategy.gameType,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
