import { quizStrategy } from "./quiz.js";
import type { GameStrategy, GameType } from "./strategy.js";
import { wordpassStrategy } from "./wordpass.js";

/** @module registry - Resolves the GameStrategy a process runs as from GAME_TYPE. */

/** Every game this code base can run as; one process runs exactly one of them. */
export const GAME_STRATEGIES: Record<GameType, GameStrategy> = {
  quiz: quizStrategy,
  "word-pass": wordpassStrategy,
};

export const GAME_TYPES = Object.keys(GAME_STRATEGIES) as GameType[];

/**
 * Pick the strategy named by `GAME_TYPE`.
 *
 * Transitional: while the deployments do not set GAME_TYPE yet, a missing value falls back to `quiz` and
 * `warn` is called once. An unknown value always throws, so a typo can never start the wrong game.
 */
export function resolveStrategy(
  env: Record<string, string | undefined>,
  warn: (message: string) => void = (message) => console.warn(message)
): GameStrategy {
  const raw = env.GAME_TYPE?.trim();
  if (!raw) {
    warn(`GAME_TYPE is not set; defaulting to "quiz". Set GAME_TYPE to one of: ${GAME_TYPES.join(", ")}.`);
    return quizStrategy;
  }

  if (!Object.prototype.hasOwnProperty.call(GAME_STRATEGIES, raw)) {
    throw new Error(`Invalid GAME_TYPE "${raw}". Expected one of: ${GAME_TYPES.join(", ")}.`);
  }
  return GAME_STRATEGIES[raw as GameType];
}
