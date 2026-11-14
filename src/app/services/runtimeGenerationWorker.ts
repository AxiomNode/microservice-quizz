import type { FastifyBaseLogger } from "fastify";
import {
  GameRuntimeGenerationWorker,
  RuntimeDifficultyLevel,
  RuntimeGenerationWorkerSnapshot as SharedRuntimeGenerationWorkerSnapshot,
  RuntimeGenerationWorkerStartInput,
} from "@axiomnode/shared-sdk-client";

import { prisma } from "../db/client.js";
import type { GameStrategy, GameType } from "../games/strategy.js";
import { GenerationService } from "./generationService.js";

export type { RuntimeDifficultyLevel, RuntimeGenerationWorkerStartInput };
export type RuntimeGenerationWorkerSnapshot = SharedRuntimeGenerationWorkerSnapshot<GameType>;

type DifficultyRow = { difficultyPercentage: number | null };

/**
 * Difficulty distribution for the worker snapshot, read with a single GROUP BY (at most 102 rows over the wire)
 * instead of loading every row of the table. The shared worker contract still expects one entry per stored row,
 * so the groups are expanded into that many references to one shared object per distinct value.
 */
async function listDifficultyPercentages(gameType: string): Promise<DifficultyRow[]> {
  const groups = await prisma.gameGeneration.groupBy({
    by: ["difficultyPercentage"],
    where: { gameType },
    _count: { _all: true },
  });

  const rows: DifficultyRow[] = [];
  for (const group of groups) {
    const row: DifficultyRow = { difficultyPercentage: group.difficultyPercentage };
    for (let index = 0; index < group._count._all; index += 1) {
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Runtime worker that starts/stops periodic AI generation cycles without restarting the service.
 * It runs one cycle every interval and tracks counters that the backoffice can inspect.
 */
export class RuntimeGenerationWorker extends GameRuntimeGenerationWorker<GameType, GenerationService> {
  constructor(generationService: GenerationService, strategy: GameStrategy) {
    super(strategy.gameType, generationService, {
      countByGameType: (gameType) =>
        prisma.gameGeneration.count({
          where: { gameType },
        }),
      listDifficultyPercentages: (gameType) => listDifficultyPercentages(gameType),
    });
  }

  override bindLogger(logger: FastifyBaseLogger): void {
    super.bindLogger(logger);
  }
}
