import "dotenv/config";

import { buildServer } from "./buildServer.js";
import { resolveStrategy } from "./games/registry.js";
import { startListeningFirst } from "./services/startup.js";

/** @module server — Process entrypoint: picks the game from GAME_TYPE and starts the service. */

async function main() {
  const strategy = resolveStrategy(process.env);
  // Listen first; catalogs are refreshed in the background (with the same ai-engine retries) and /health
  // reports `catalogReady` honestly instead of blocking startup while ai-engine is unreachable.
  await startListeningFirst({
    ...(await buildServer(strategy)),
    gameType: strategy.gameType,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
