import { describe, expect, it, vi } from "vitest";

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

  it("selects the strategy named by GAME_TYPE without warning", () => {
    const warn = vi.fn();
    expect(resolveStrategy({ GAME_TYPE: "quiz" }, warn)).toBe(quizStrategy);
    expect(resolveStrategy({ GAME_TYPE: "word-pass" }, warn)).toBe(wordpassStrategy);
    expect(resolveStrategy({ GAME_TYPE: "  word-pass " }, warn)).toBe(wordpassStrategy);
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to quiz with a warning while GAME_TYPE is unset (transitional)", () => {
    const warn = vi.fn();
    expect(resolveStrategy({}, warn)).toBe(quizStrategy);
    expect(resolveStrategy({ GAME_TYPE: "   " }, warn)).toBe(quizStrategy);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain("GAME_TYPE is not set");
  });

  it("uses console.warn by default", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(resolveStrategy({})).toBe(quizStrategy);
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("fails loudly on an unknown GAME_TYPE instead of starting the wrong game", () => {
    for (const bad of ["wordpass", "Quiz", "quizz", "constructor", "__proto__"]) {
      expect(() => resolveStrategy({ GAME_TYPE: bad }, vi.fn())).toThrow(
        `Invalid GAME_TYPE "${bad}". Expected one of: quiz, word-pass.`,
      );
    }
  });
});
