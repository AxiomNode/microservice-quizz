import {
  BaseGenerateSchema,
  canonicalizeQuizModel,
  extractQuizQuestionTexts,
  normalizeContentToken,
} from "@axiomnode/shared-sdk-client";

import type { GameStrategy } from "./strategy.js";

/** @module quiz - Multiple-choice trivia strategy. */

const QUESTION_STYLES = [
  "direct questions",
  "contextual questions",
  "reasoning questions",
  "general culture questions",
  "chronological questions",
  "comparative questions"
];

/** Rules of the quiz game: question-text dedup signature, trivia prompts, 512 token budget. */
export const quizStrategy: GameStrategy = {
  gameType: "quiz",
  serviceName: "microservice-quiz",
  defaults: {
    port: 7100,
    generationEndpoint: "/generate/quiz",
    ingestEndpoint: "/ingest/quiz",
    maxItemsDefault: 12
  },
  generateSchema: BaseGenerateSchema,
  groupedBy: ["category"],
  includeMatrixCoverage: false,
  maxTokens: 512,

  canonicalize: canonicalizeQuizModel,

  /** Question texts in their original order. */
  contentSignature(payload) {
    const rawQuestions = extractQuizQuestionTexts(payload);
    if (rawQuestions.length === 0) {
      return null;
    }
    return rawQuestions
      .map((item) => normalizeContentToken(item))
      .filter((item) => item.length > 0)
      .join("|");
  },

  manualQuery(categoryName, difficulty) {
    return `${categoryName} manual curation difficulty ${difficulty}`;
  },

  storedQuery(_content, requestedQuery) {
    return requestedQuery;
  },

  nextPromptVariant({ attempt, base, cycleLength }) {
    const style = QUESTION_STYLES[Math.floor(attempt / cycleLength) % QUESTION_STYLES.length];
    return { query: `${base} ${style} trivia multiple choice avoid true false` };
  }
};
