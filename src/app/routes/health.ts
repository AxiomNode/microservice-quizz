import { FastifyInstance } from "fastify";

import type { GameStrategy } from "../games/strategy.js";

/** @module health — Lightweight health-check endpoint of the game microservice. */

/** Optional readiness source: the generation service knows whether catalogs came from ai-engine. */
export interface CatalogReadinessSource {
  isCatalogReady(): boolean;
  getCatalogSnapshot(): { source: string };
}

/**
 * Register the GET /health route.
 *
 * Always answers HTTP 200 (liveness). `catalogReady` is false while the service still runs on the local
 * fallback catalogs, for example while ai-engine is unreachable at startup.
 */
export async function healthRoutes(
  app: FastifyInstance,
  readiness: CatalogReadinessSource | undefined,
  strategy: GameStrategy
): Promise<void> {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: strategy.serviceName,
      gameType: strategy.gameType,
      ...(readiness
        ? {
            catalogReady: readiness.isCatalogReady(),
            catalogSource: readiness.getCatalogSnapshot().source
          }
        : {})
    };
  });
}
