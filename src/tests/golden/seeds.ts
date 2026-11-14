/**
 * @module seeds - Deterministic per-game inputs shared by the golden harness: stored rows, the ai-engine
 * payload returned by the stubbed fetch, and manual-curation content. Kept identical for every game so a
 * fixture captured from one service can be replayed against the merged service.
 */

export type GoldenGame = "quiz" | "word-pass";

export interface GoldenSeed {
  gameType: GoldenGame;
  rows: Array<Record<string, unknown>>;
  /** What the stubbed ai-engine /generate endpoint answers. */
  aiPayload: (call: number) => unknown;
  manualContent: Record<string, unknown>;
  updateContent: Record<string, unknown>;
  /** Extra body fields sent to POST /games/generate (word-pass accepts `letters`). */
  generateExtras: Record<string, unknown>;
}

function quizPayload(call: number): unknown {
  return {
    game_type: "quiz",
    game: {
      questions: [
        {
          question: `Golden question number ${call}?`,
          options: ["Alpha", "Beta", "Gamma", "Delta"],
          correct_index: call % 4,
        },
      ],
    },
  };
}

function wordpassPayload(call: number): unknown {
  return {
    game_type: "word-pass",
    game: {
      words: [
        { word: `Zeta${call}`, definition: "A frequent real word used as a filler" },
        { word: `Omega${call}`, definition: `The last letter of the Greek alphabet, ${call}` },
        { word: `Gamma${call}`, answer: `Gamma${call}`, hint: `Third letter, ${call}` },
      ],
    },
  };
}

const CREATED = [
  new Date("2026-04-15T18:00:00.000Z"),
  new Date("2026-04-15T18:01:00.000Z"),
  new Date("2026-04-15T18:02:00.000Z"),
];

function row(
  game: GoldenGame,
  n: number,
  categoryId: string,
  categoryName: string,
  difficulty: number,
  response: unknown,
): Record<string, unknown> {
  return {
    id: `golden-${game}-${n}`,
    gameType: game,
    query: `${categoryName} seeded ${n}`,
    status: "created",
    categoryId,
    categoryName,
    language: null,
    uniquenessKey: `seed-key-${game}-${n}`,
    batchRunId: n === 3 ? null : "batch-seed",
    difficultyPercentage: difficulty,
    requestJson: JSON.stringify({ query: `${categoryName} seeded ${n}`, difficulty_percentage: String(difficulty) }),
    responseJson: JSON.stringify(response),
    createdAt: CREATED[n - 1],
  };
}

export const GOLDEN_SEEDS: Record<GoldenGame, GoldenSeed> = {
  quiz: {
    gameType: "quiz",
    rows: [
      row("quiz", 1, "9", "General Knowledge", 40, quizPayload(101)),
      row("quiz", 2, "17", "Science & Nature", 60, quizPayload(102)),
      row("quiz", 3, "9", "General Knowledge", 80, quizPayload(103)),
    ],
    aiPayload: quizPayload,
    manualContent: {
      game: {
        questions: [{ question: "Manual golden question?", answers: ["One", "Two", "Three"], correctIndex: 1 }],
      },
    },
    updateContent: {
      game: {
        questions: [{ question: "Updated golden question?", answers: ["Red", "Blue"], correctIndex: 0 }],
      },
    },
    generateExtras: {},
  },
  "word-pass": {
    gameType: "word-pass",
    rows: [
      row("word-pass", 1, "9", "General Knowledge", 40, wordpassPayload(101)),
      row("word-pass", 2, "17", "Science & Nature", 60, wordpassPayload(102)),
      row("word-pass", 3, "9", "General Knowledge", 80, wordpassPayload(103)),
    ],
    aiPayload: wordpassPayload,
    manualContent: {
      game: {
        words: [
          { word: "Sigma", definition: "A Greek letter used for sums" },
          { word: "Tau", definition: "A frequent term in physics" },
        ],
      },
    },
    updateContent: {
      game: {
        words: [{ word: "Lambda", definition: "Eleventh letter of the Greek alphabet" }],
      },
    },
    generateExtras: { letters: "A,B,C" },
  },
};
