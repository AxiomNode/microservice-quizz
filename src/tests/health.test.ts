import "dotenv/config";

import { describe, expect, it } from "vitest";

import Fastify from "fastify";
import { healthRoutes } from "../app/routes/health.js";
import { GAME_FIXTURES } from "./support/games.js";

describe.each(GAME_FIXTURES)("health route ($gameType)", (fx) => {
  it("returns service metadata", async () => {
    const app = Fastify();
    await healthRoutes(app, undefined, fx.strategy);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: fx.serviceName,
      gameType: fx.gameType
    });

    await app.close();
  });
});
