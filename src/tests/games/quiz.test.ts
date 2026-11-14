import { describe, expect, it } from "vitest";

import { quizStrategy } from "../../app/games/quiz.js";

describe("quiz strategy", () => {
  it("exposes the quiz identity and defaults", () => {
    expect(quizStrategy).toMatchObject({
      gameType: "quiz",
      serviceName: "microservice-quiz",
      groupedBy: ["category"],
      includeMatrixCoverage: false,
      maxTokens: 512,
      defaults: { port: 7100, generationEndpoint: "/generate/quiz", ingestEndpoint: "/ingest/quiz", maxItemsDefault: 12 },
    });
  });

  it("builds an ordered, normalised question signature and ignores payloads without questions", () => {
    expect(
      quizStrategy.contentSignature({
        game: { questions: [{ question: "¿Capital de Perú?" }, { question: "Second   One" }] },
      }),
    ).toBe("capital de peru|second one");
    expect(quizStrategy.contentSignature({ questions: [{ question: "Uno" }, { question: "Dos" }] })).toBe("uno|dos");
    expect(quizStrategy.contentSignature({ game: { questions: [] } })).toBeNull();
    expect(quizStrategy.contentSignature({ game: { words: [{ word: "x" }] } })).toBeNull();
  });

  it("keeps the manual query format and stores the requested query untouched", () => {
    expect(quizStrategy.manualQuery("History", 40, {})).toBe("History manual curation difficulty 40");
    expect(quizStrategy.manualQuery("History", undefined, {})).toBe("History manual curation difficulty undefined");
    expect(quizStrategy.storedQuery({ game: {} }, "requested prompt")).toBe("requested prompt");
  });

  it("rotates the question style once per full prompt cycle and sends no extra request parameters", () => {
    const base = "Science fundamentals introduction";
    const first = quizStrategy.nextPromptVariant({ attempt: 0, base, cycleLength: 10 });
    const second = quizStrategy.nextPromptVariant({ attempt: 10, base, cycleLength: 10 });
    const wrapped = quizStrategy.nextPromptVariant({ attempt: 60, base, cycleLength: 10 });

    expect(first).toEqual({ query: `${base} direct questions trivia multiple choice avoid true false` });
    expect(second.query).toBe(`${base} contextual questions trivia multiple choice avoid true false`);
    expect(wrapped.query).toBe(first.query);
    expect(first.requestExtras).toBeUndefined();
  });

  it("canonicalizes quiz models and rejects empty ones", () => {
    expect(quizStrategy.canonicalize({ question: "Q?", answers: ["A", "B"], correctIndex: 1 })).toEqual({
      game: { questions: [{ id: "q-1", question: "Q?", answers: ["A", "B"], correctIndex: 1 }] },
    });
    expect(() => quizStrategy.canonicalize({})).toThrow("Generated quiz has no questions");
  });
});
