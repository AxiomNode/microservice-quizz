import type { FastifyBaseLogger } from "fastify";
import { GameModelGenerationJob } from "@axiomnode/shared-sdk-client";

import { AppConfig } from "../config.js";
import { GenerationService } from "./generationService.js";

/** @module modelGenerationJob — Periodic scheduler that triggers batch quiz generation cycles. */

/** Scheduled job that periodically generates quiz models via GenerationService. */
export class ModelGenerationJob extends GameModelGenerationJob<AppConfig, GenerationService> {
  protected override async runCycle(logger: FastifyBaseLogger, trigger: "startup" | "interval") {
    return super.runCycle(logger, trigger);
  }
}
