import type { z } from "zod";

/** @module strategy - The per-game rules the shared generation service is parameterised with. */

/** Game types a service instance can run as. */
export type GameType = "quiz" | "word-pass";

/** Inputs for deriving the prompt of one generation attempt. */
export interface PromptVariantArgs {
  /** Monotonic attempt counter (batch attempt number or process item index). */
  attempt: number;
  /** `<category> <variant> <frame>`: the part of the prompt every game shares. */
  base: string;
  /** Attempts needed to walk once through every category x prompt variant x context frame combination. */
  cycleLength: number;
}

/** The prompt text of one attempt plus extra ai-engine query parameters (for example `letters`). */
export interface PromptVariant {
  query: string;
  requestExtras?: Record<string, string>;
}

/** Defaults that seed the Zod environment schema of the service. */
export interface GameStrategyDefaults {
  port: number;
  generationEndpoint: string;
  ingestEndpoint: string;
  /** Default of BATCH_GENERATION_MAX_QUESTIONS (items per generated model). */
  maxItemsDefault: number;
}

/**
 * Everything that differs between the games served by one code base. The generation service, routes and
 * monitoring are generic and read these values; nothing outside `app/games/` branches on the game type.
 */
export interface GameStrategy {
  gameType: GameType;
  /** Service name: default SERVICE_NAME, metrics/health label and default `X-Ingest-Source`. */
  serviceName: string;
  defaults: GameStrategyDefaults;
  /** Body schema of POST /games/generate (the shared SDK requires a ZodObject). */
  generateSchema: z.ZodObject;
  /** Dimensions reported by GET /games/models/grouped. */
  groupedBy: Array<"category" | "language">;
  /** Whether /monitor/stats reports matrix coverage. */
  includeMatrixCoverage: boolean;
  /** `max_tokens` sent to ai-engine. */
  maxTokens: number;
  /** Validates and normalises a generated or manually curated payload; throws on incomplete content. */
  canonicalize(payload: unknown): unknown;
  /**
   * Content fingerprint used for deduplication (`primary:<signature>` inside the uniquenessKey), or null to
   * fall back to the stable JSON of the whole payload. Changing it re-opens duplicates: hash vectors pin it.
   */
  contentSignature(payload: unknown): string | null;
  /** `query` column of a manually created or edited entry. */
  manualQuery(categoryName: string, difficulty: number | undefined, content: unknown): string;
  /** `query` column of a generated entry, given the prompt that produced it. */
  storedQuery(content: unknown, requestedQuery: string): string;
  /** Prompt (and extra ai-engine parameters) for one generation attempt. */
  nextPromptVariant(args: PromptVariantArgs): PromptVariant;
}
