import "dotenv/config";

import { describe, expect, it } from "vitest";

import Fastify from "fastify";
import swagger from "@fastify/swagger";

import { AppConfig } from "../app/config.js";
import { GAME_FIXTURES, type GameFixture } from "./support/games.js";
import {
  registerPrivateDocs,
  resolvePrivateDocsToken
} from "@axiomnode/shared-sdk-client/private-docs";

function baseConfig(fx: GameFixture, overrides: Partial<AppConfig> = {}): AppConfig {
  return fx.createConfig({
    AI_ENGINE_API_KEY: "fallback_token",
    AI_ENGINE_INGEST_API_KEY: "bridge_token",
    PRIVATE_DOCS_TOKEN: "private_token",
    ...overrides
  });
}

describe.each(GAME_FIXTURES)("private docs plugin ($gameType)", (fx) => {
  it("uses PRIVATE_DOCS_TOKEN over fallback", () => {
    const token = resolvePrivateDocsToken(
      baseConfig(fx, { PRIVATE_DOCS_TOKEN: "explicit_token", AI_ENGINE_API_KEY: "fallback_token" })
    );

    expect(token).toBe("explicit_token");
  });

  it("falls back to AI_ENGINE_API_KEY", () => {
    const token = resolvePrivateDocsToken(
      baseConfig(fx, { PRIVATE_DOCS_TOKEN: undefined, AI_ENGINE_API_KEY: "fallback_token" })
    );

    expect(token).toBe("fallback_token");
  });

  it("protects /private/docs/json with token", async () => {
    const app = Fastify();
    await app.register(swagger, {
      openapi: { info: { title: "test", version: "1.0.0" } }
    });

    await registerPrivateDocs(app, baseConfig(fx, { PRIVATE_DOCS_TOKEN: "secret_value" }));

    const unauthorized = await app.inject({
      method: "GET",
      url: "/private/docs/json"
    });

    expect(unauthorized.statusCode).toBe(401);

    const authorized = await app.inject({
      method: "GET",
      url: "/private/docs/json",
      headers: { "x-private-docs-token": "secret_value" }
    });

    expect(authorized.statusCode).toBe(200);
    await app.close();
  });

  it("does not register docs routes when the feature is disabled", async () => {
    const app = Fastify();
    await app.register(swagger, {
      openapi: { info: { title: "test", version: "1.0.0" } }
    });

    await registerPrivateDocs(app, baseConfig(fx, { PRIVATE_DOCS_ENABLED: false }));

    const response = await app.inject({
      method: "GET",
      url: "/private/docs/json"
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("throws when docs are enabled but no token can be resolved", async () => {
    const app = Fastify();
    await app.register(swagger, {
      openapi: { info: { title: "test", version: "1.0.0" } }
    });

    await expect(
      registerPrivateDocs(app, baseConfig(fx, { PRIVATE_DOCS_TOKEN: undefined, AI_ENGINE_API_KEY: undefined }))
    ).rejects.toThrow("Private docs are enabled but no token is configured");

    await app.close();
  });
});
