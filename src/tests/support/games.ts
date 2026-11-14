/**
 * @module games - Per-game test data shared by the parameterised suites. Every `describe.each(GAME_FIXTURES)`
 * receives one fixture and must not branch on the game type: whatever differs between the games lives here
 * (or in tests/games/<game>.test.ts for rules that exist in one game only).
 */
import type { AppConfig } from "../../app/config.js";
import { GAME_STRATEGIES } from "../../app/games/registry.js";
import type { GameStrategy, GameType } from "../../app/games/strategy.js";

export interface GameFixture {
  gameType: GameType;
  strategy: GameStrategy;
  serviceName: string;
  generationEndpoint: string;
  ingestEndpoint: string;
  maxItemsDefault: number;
  /** Key of the item array inside `game` (`questions` or `words`). */
  itemKey: "questions" | "words";
  /** Message thrown when a payload has no items. */
  emptyError: string;
  /** A valid raw (ai-engine shaped) item whose identifying text is `text`. */
  item(text?: string): Record<string, unknown>;
  /** A stored payload `{ game_type, game: { <itemKey>: items } }`. */
  payload(...items: Array<Record<string, unknown>>): Record<string, unknown>;
  /** A payload without items (must be rejected). */
  emptyPayload(): Record<string, unknown>;
  /** Raw manual-curation input for `text`, as the backoffice sends it. */
  manualContent(text?: string): Record<string, unknown>;
  /** What the service stores as `query` for a manual entry. */
  manualQuery(difficulty: number): string;
  /** Raw manual content built from a single raw item (the other accepted input shape). */
  manualContentFromItem(text?: string): Record<string, unknown>;
  /** Input for normalizeManualContent and what it must canonicalize to. */
  normalize: { input: Record<string, unknown>; output: Record<string, unknown> };
  /** Two payloads that must produce the same uniqueness key (case, accent and punctuation differences). */
  equivalentContent: [Record<string, unknown>, Record<string, unknown>];
  /** Payload shape the AI engine returns, one item. */
  generated(text?: string): Record<string, unknown>;
  /** Values the route tests use (they differ per game only to prove nothing is hard-wired). */
  routes: {
    generate: { categoryId: string; difficultyPercentage: number; itemCount: number };
    history: { query: string; page: number; pageSize: number; status: string };
    ingestText: string;
    manualRouteContent: Record<string, unknown>;
    updateContent: Record<string, unknown>;
  };
  /** Full application config exactly as loadConfig would produce it for this game, with test overrides. */
  createConfig(overrides?: Partial<AppConfig>): AppConfig;
}

function createConfig(strategy: GameStrategy, databaseUrl: string, overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    SERVICE_NAME: strategy.serviceName,
    SERVICE_PORT: strategy.defaults.port,
    NODE_ENV: "test",
    AI_ENGINE_BASE_URL: "http://localhost:7001",
    AI_ENGINE_GENERATION_ENDPOINT: strategy.defaults.generationEndpoint,
    AI_ENGINE_INGEST_ENDPOINT: strategy.defaults.ingestEndpoint,
    AI_ENGINE_CATALOGS_ENDPOINT: "/catalogs",
    AI_ENGINE_INGEST_SOURCE: strategy.serviceName,
    AI_ENGINE_API_KEY: "test-key",
    AI_ENGINE_INGEST_API_KEY: "test-ingest-key",
    AI_ENGINE_REQUEST_TIMEOUT_MS: 420000,
    GAME_GENERATION_ITEM_TIMEOUT_MS: 90000,
    GAME_GENERATION_ITEM_RETRY_MAX_ATTEMPTS: 1,
    AI_ENGINE_RETRY_MAX_ATTEMPTS: 3,
    AI_ENGINE_RETRY_INITIAL_DELAY_MS: 1500,
    AI_ENGINE_RETRY_MAX_DELAY_MS: 12000,
    AI_AUTH_CIRCUIT_FAILURE_THRESHOLD: 3,
    AI_AUTH_CIRCUIT_COOLDOWN_MS: 300000,
    PRIVATE_DOCS_ENABLED: true,
    PRIVATE_DOCS_PREFIX: "/private/docs",
    PRIVATE_DOCS_TOKEN: "private-docs-token",
    METRICS_LOG_BUFFER_SIZE: 500,
    BATCH_GENERATION_ENABLED: true,
    BATCH_GENERATION_INTERVAL_MINUTES: 20,
    BATCH_GENERATION_TARGET_COUNT: 1000,
    BATCH_GENERATION_MAX_ATTEMPTS: 4000,
    BATCH_GENERATION_CONCURRENCY: 8,
    BATCH_GENERATION_MIN_DIFFICULTY: 25,
    BATCH_GENERATION_MAX_DIFFICULTY: 85,
    BATCH_GENERATION_MIN_QUESTIONS: 5,
    BATCH_GENERATION_MAX_QUESTIONS: strategy.defaults.maxItemsDefault,
    DATABASE_URL: databaseUrl,
    ...overrides,
  };
}

const quizStrategy = GAME_STRATEGIES.quiz;
const wordpassStrategy = GAME_STRATEGIES["word-pass"];

const quizFixture: GameFixture = {
  gameType: "quiz",
  strategy: quizStrategy,
  serviceName: quizStrategy.serviceName,
  generationEndpoint: quizStrategy.defaults.generationEndpoint,
  ingestEndpoint: quizStrategy.defaults.ingestEndpoint,
  maxItemsDefault: quizStrategy.defaults.maxItemsDefault,
  itemKey: "questions",
  emptyError: "Generated quiz has no questions — rejecting incomplete content",
  item: (text = "Capital de Francia") => ({ question: text, options: ["Paris", "Roma", "Berlin", "Lisboa"], correct_index: 0 }),
  payload: (...items) => ({ game_type: "quiz", game: { questions: items } }),
  emptyPayload: () => ({ game_type: "quiz", game: { questions: [] } }),
  manualContent: (text = "Nueva") => ({ question: text, answers: ["A", "B", "C", "D"], correctIndex: 0, hint: null }),
  manualContentFromItem: (text = "Q") => ({ question: text, options: ["A", "B"], correct_index: 0 }),
  normalize: {
    input: { question: "Nueva", answers: ["A", "B"], correctIndex: 0, hint: null },
    output: { game: { questions: [{ id: "q-1", question: "Nueva", answers: ["A", "B"], correctIndex: 0 }] } },
  },
  equivalentContent: [{ questions: [{ question: "¿Capital de Perú?" }] }, { questions: [{ question: "capital de peru" }] }],
  manualQuery: (difficulty) => `General Knowledge manual curation difficulty ${difficulty}`,
  generated: (text = "Q") => ({ game: { questions: [{ question: text, options: ["A", "B"], correct_index: 0 }] } }),
  routes: {
    generate: { categoryId: "9", difficultyPercentage: 60, itemCount: 4 },
    history: { query: "limit=400&page=3&pageSize=25&status=pending_review", page: 3, pageSize: 25, status: "pending_review" },
    ingestText: "Question content",
    manualRouteContent: { question: "Q" },
    updateContent: { question: "Nueva" },
  },
  createConfig: (overrides) =>
    createConfig(quizStrategy, "postgresql://quiz:quiz@localhost:7432/quizdb?schema=public", overrides),
};

const wordpassFixture: GameFixture = {
  gameType: "word-pass",
  strategy: wordpassStrategy,
  serviceName: wordpassStrategy.serviceName,
  generationEndpoint: wordpassStrategy.defaults.generationEndpoint,
  ingestEndpoint: wordpassStrategy.defaults.ingestEndpoint,
  maxItemsDefault: wordpassStrategy.defaults.maxItemsDefault,
  itemKey: "words",
  emptyError: "Generated word-pass has no words — rejecting incomplete content",
  item: (text = "Atomo") => ({ letter: "A", hint: "Primera letra", answer: text, starts_with: true }),
  payload: (...items) => ({ game_type: "word-pass", game: { words: items } }),
  emptyPayload: () => ({ game_type: "word-pass", game: { words: [] } }),
  manualContent: (text = "Nueva") => ({ words: [{ letter: "N", hint: "Pista", answer: text, starts_with: true }] }),
  manualContentFromItem: (text = "Algo") => ({ words: [{ letter: "A", hint: "Pista", answer: text, starts_with: true }] }),
  normalize: {
    input: { words: [{ definition: "Pista nueva", word: "Nueva" }], notes: null },
    output: { game: { words: [{ id: "w-1", definition: "Pista nueva", word: "Nueva" }] } },
  },
  equivalentContent: [{ words: [{ answer: "Árbol" }] }, { words: [{ answer: "arbol" }] }],
  manualQuery: () => "Pista",
  generated: (text = "Q") => ({ game: { words: [{ letter: "A", hint: "Pista", answer: text, starts_with: true }] } }),
  routes: {
    generate: { categoryId: "11", difficultyPercentage: 55, itemCount: 5 },
    history: { query: "limit=400&page=2&pageSize=30&status=validated", page: 2, pageSize: 30, status: "validated" },
    ingestText: "Wordpass content",
    manualRouteContent: { words: [{ answer: "Q" }] },
    updateContent: { words: [{ answer: "Nueva" }] },
  },
  createConfig: (overrides) =>
    createConfig(wordpassStrategy, "postgresql://wordpass:wordpass@localhost:7433/wordpassdb?schema=public", overrides),
};

/** Fixtures the parameterised suites run against, one per game this code base serves. */
export const GAME_FIXTURES: GameFixture[] = [quizFixture, wordpassFixture];
