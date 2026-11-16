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
 * `GAME_TYPE` is mandatory: a missing, blank or unknown value always throws, so a deployment that forgot to set it
 * (or has a typo) can never silently start as the wrong game against the wrong rows.
 */
export function resolveStrategy(env: Record<string, string | undefined>): GameStrategy {
  const raw = env.GAME_TYPE?.trim();
  if (!raw) {
    throw new Error(`GAME_TYPE is required. Set it to one of: ${GAME_TYPES.join(", ")}.`);
  }

  if (!Object.prototype.hasOwnProperty.call(GAME_STRATEGIES, raw)) {
    throw new Error(`Invalid GAME_TYPE "${raw}". Expected one of: ${GAME_TYPES.join(", ")}.`);
  }
  return GAME_STRATEGIES[raw as GameType];
}
