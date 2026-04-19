import { afterEach, describe, expect, it, vi } from "vitest";

import { AiEngineClient } from "../app/services/aiEngineClient.js";

function createClient() {
  return new AiEngineClient({
    AI_ENGINE_BASE_URL: "http://localhost:7001",
    AI_ENGINE_GENERATION_ENDPOINT: "/generate/quiz",
    AI_ENGINE_INGEST_ENDPOINT: "/ingest/quiz",
    AI_ENGINE_CATALOGS_ENDPOINT: "/catalogs",
    AI_ENGINE_API_KEY: "games-key",
    AI_ENGINE_INGEST_API_KEY: "bridge-key",
    AI_ENGINE_REQUEST_TIMEOUT_MS: 5000,
    AI_ENGINE_RETRY_MAX_ATTEMPTS: 3,
    AI_ENGINE_RETRY_INITIAL_DELAY_MS: 10,
    AI_ENGINE_RETRY_MAX_DELAY_MS: 20,
  });
}

function createResponse(status: number, payload: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe("AiEngineClient retry policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("retries transient generation failures and eventually succeeds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(503, { detail: "busy" }))
      .mockResolvedValueOnce(createResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = createClient().generate({ query: "fotosintesis" });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient client errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(422, { detail: "invalid payload" }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = createClient().generate({ query: "fotosintesis" });
    const assertion = expect(promise).rejects.toThrow(/ai-engine error 422/);
    await vi.runAllTimersAsync();

    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});