# Golden fixtures

Black-box snapshots of the two pre-merge game services, replayed by `../golden.test.ts` against the merged
service once per game strategy.

| File | Captured from |
|---|---|
| `quiz.json` | `AxiomNode/microservice-quizz` at `03d2f89` (origin/main) |
| `word-pass.json` | `AxiomNode/microservice-word-pass` at `0271474` (origin/main), same harness and seeds |

They were captured with the first revision of the harness (commit "chore: drop tracked leftovers and add golden
snapshots of service behaviour"), which wires the service the same way the old `server.ts` did and was run
unchanged inside each pre-merge repository with `GOLDEN_UPDATE=1`.

Each scenario records the HTTP status and body, the Prisma calls the request made (with the `gameType`
filter, stored `query` and `uniquenessKey`) and the outbound ai-engine requests.

Never regenerate a fixture from refactored code: a diff against these files means behaviour changed.
