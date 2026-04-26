import { FastifyInstance } from "fastify";
import {
  buildMonitoringLogsPayload,
  buildMonitoringStatsPayload,
  MonitoringLogsQuerySchema,
} from "@axiomnode/shared-sdk-client";
import { ServiceMetrics } from "../services/serviceMetrics.js";
import { GenerationService } from "../services/generationService.js";

/** @module monitoring — Routes for service stats, logs, and Prometheus-compatible metrics. */

/** Register /monitor/* and /metrics routes. */
export async function monitoringRoutes(
  app: FastifyInstance,
  metrics: ServiceMetrics,
  generationService: GenerationService
): Promise<void> {
  app.get("/monitor/stats", async (_request, reply) => {
    const stats = metrics.snapshot();
    const catalogs = generationService.getCatalogSnapshot();
    const grouped = await generationService.groupedModelsSummary();

    return reply.send(buildMonitoringStatsPayload(stats, catalogs, grouped));
  });

  app.get("/monitor/logs", async (request, reply) => {
    /* v8 ignore next -- Fastify always materializes request.query for matched routes; the nullish fallback is defensive only */
    const parsed = MonitoringLogsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        message: "Invalid query parameters",
        errors: parsed.error.flatten()
      });
    }

    const logs = metrics.recentLogs(parsed.data.limit);

    return reply.send(buildMonitoringLogsPayload("microservice-quiz", logs));
  });

  app.get("/metrics", async (_request, reply) => {
    reply.type("text/plain; version=0.0.4");
    return reply.send(metrics.toPrometheus());
  });
}
