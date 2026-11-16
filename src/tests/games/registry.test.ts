import { describe, expect, it } from "vitest";

import { GAME_STRATEGIES, GAME_TYPES, resolveStrategy } from "../../app/games/registry.js";
import { quizStrategy } from "../../app/games/quiz.js";
import { wordpassStrategy } from "../../app/games/wordpass.js";

describe("resolveStrategy", () => {
  it("lists both games and keys every strategy by its own game type", () => {
    expect(GAME_TYPES).toEqual(["quiz", "word-pass"]);
    for (const [key, strategy] of Object.entries(GAME_STRATEGIES)) {
      expect(strategy.gameType).toBe(key);
    }
  });

  it("selects the strategy named by GAME_TYPE", () => {
    expect(resolveStrategy({ GAME_TYPE: "quiz" })).toBe(quizStrategy);
    expect(resolveStrategy({ GAME_TYPE: "word-pass" })).toBe(wordpassStrategy);
    expect(resolveStrategy({ GAME_TYPE: "  word-pass " })).toBe(wordpassStrategy);
  });

  it("refuses to start when GAME_TYPE is missing or blank (no default game)", () => {
    for (const env of [{}, { GAME_TYPE: undefined }, { GAME_TYPE: "" }, { GAME_TYPE: "   " }]) {
      expect(() => resolveStrategy(env)).toThrow("GAME_TYPE is required. Set it to one of: quiz, word-pass.");
    }
  });

  it("fails loudly on an unknown GAME_TYPE instead of starting the wrong game", () => {
    for (const bad of ["wordpass", "Quiz", "quizz", "constructor", "__proto__"]) {
      expect(() => resolveStrategy({ GAME_TYPE: bad })).toThrow(
        `Invalid GAME_TYPE "${bad}". Expected one of: quiz, word-pass.`,
      );
    }
  });
});
