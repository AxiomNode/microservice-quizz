/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../app/db/client.js", () => ({ prisma: {} }));

import { loadConfig } from "../../app/config.js";
import { GAME_STRATEGIES } from "../../app/games/registry.js";
import type { GameType } from "../../app/games/strategy.js";
import { GenerationService } from "../../app/services/generationService.js";
import { UNIQUENESS_INPUTS } from "./uniquenessInputs.js";

const GAMES: GameType[] = ["quiz", "word-pass"];
const vectors = JSON.parse(
  fs.readFileSync(fileURLToPath(new URL("./uniquenessVectors.json", import.meta.url)), "utf8"),
) as Record<GameType, Array<{ name: string; key: string }>>;
const savedEnv = { ...process.env };

describe("uniquenessKey parity with the pre-merge services", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://vectors:vectors@localhost:5432/vectors";
    process.env.PRIVATE_DOCS_TOKEN = "vectors-token";
  });
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("covers every input for every game", () => {
    for (const game of GAMES) {
      expect(vectors[game].map((item) => item.name)).toEqual(UNIQUENESS_INPUTS.map((item) => item.name));
    }
  });

  describe.each(GAMES)("%s", (game) => {
    const strategy = GAME_STRATEGIES[game];

    it.each(UNIQUENESS_INPUTS.map((item, index) => ({ ...item, index })))(
      "keeps the hash of: $name",
      ({ payload, index }) => {
        const service = new GenerationService(loadConfig(strategy), undefined, strategy) as any;
        expect(service.buildUniquenessKey(payload)).toBe(vectors[game][index].key);
      },
    );
  });

  it("never gives the same key to the two games for the same payload", () => {
    for (let index = 0; index < UNIQUENESS_INPUTS.length; index += 1) {
      expect(vectors.quiz[index].key).not.toBe(vectors["word-pass"][index].key);
    }
  });
});
