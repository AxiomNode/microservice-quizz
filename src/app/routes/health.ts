import { FastifyInstance } from "fastify";

/** @module health — Lightweight health-check endpoint for the quiz microservice. */

/** Register the GET /health route. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "microservice-quiz",
      gameType: "quiz"
    };
  });
}
