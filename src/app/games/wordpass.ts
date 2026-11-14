import {
  BaseGenerateSchema,
  canonicalizeWordpassModel,
  extractWordpassDefinitions,
  extractWordpassWords,
  normalizeContentToken,
} from "@axiomnode/shared-sdk-client";
import { z } from "zod";

import type { GameStrategy } from "./strategy.js";

/** @module wordpass - Word-pass (definition -> word) strategy. */

const LETTER_SETS = [
  "A,B,C,D,E,F,G,H,I,J,L,M,N,O,P,R,S,T,V,Z",
  "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z",
  "A,C,E,G,I,K,L,M,N,O,P,R,S,T,U,V"
];

/** Longest `query` kept for a stored word-pass entry. */
const MAX_STORED_QUERY_LENGTH = 240;

/** Hints that carry no information about the word (ai-engine placeholders); never used as the stored query. */
export function isGenericWordpassHint(hint: string): boolean {
  const normalized = hint
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

  return normalized.includes("frequent real word")
    || normalized.includes("frequencywords")
    || normalized.includes("word frequency")
    || normalized.includes("frequent term");
}

/**
 * Human-readable `query` for a stored word-pass entry: the first informative definition, else a definition
 * built from the first answer, else the fallback text, else "word-pass". Capped at 240 characters.
 */
export function buildPrimaryWordpassText(payload: unknown, fallback: string): string {
  const hints = extractWordpassDefinitions(payload)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const preferredHint = hints.find((item) => !isGenericWordpassHint(item))
    ?? hints[0];

  if (preferredHint) {
    return preferredHint.slice(0, MAX_STORED_QUERY_LENGTH);
  }

  const answers = extractWordpassWords(payload)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (answers.length > 0) {
    return `Definition of ${answers[0]}`.slice(0, MAX_STORED_QUERY_LENGTH);
  }

  const normalizedFallback = fallback.trim();
  return normalizedFallback.length > 0 ? normalizedFallback.slice(0, MAX_STORED_QUERY_LENGTH) : "word-pass";
}

/** Rules of the word-pass game: order-insensitive word signature, letter sets, 1024 token budget. */
export const wordpassStrategy: GameStrategy = {
  gameType: "word-pass",
  serviceName: "microservice-wordpass",
  defaults: {
    port: 7100,
    generationEndpoint: "/generate/word-pass",
    ingestEndpoint: "/ingest/word-pass",
    maxItemsDefault: 10
  },
  generateSchema: BaseGenerateSchema.extend({
    letters: z.string().optional(),
  }),
  groupedBy: ["category", "language"],
  includeMatrixCoverage: true,
  maxTokens: 1024,

  canonicalize: canonicalizeWordpassModel,

  /**
   * Normalised words, sorted. Must keep using extractWordpassWords (accepts `word ?? answer`): the stored
   * uniquenessKey values depend on it, so changing it would let old duplicates through.
   */
  contentSignature(payload) {
    const words = extractWordpassWords(payload);
    if (words.length === 0) {
      return null;
    }
    return words
      .map((item) => normalizeContentToken(item))
      .filter((item) => item.length > 0)
      .sort()
      .join("|");
  },

  manualQuery(categoryName, difficulty, content) {
    return buildPrimaryWordpassText(content, `${categoryName} difficulty ${difficulty}`);
  },

  storedQuery(content, requestedQuery) {
    return buildPrimaryWordpassText(content, requestedQuery);
  },

  nextPromptVariant({ attempt, base }) {
    const letters = LETTER_SETS[attempt % LETTER_SETS.length];
    return {
      query: `${base} word-pass avoid ambiguous or nonsensical answers`,
      requestExtras: { letters }
    };
  }
};
