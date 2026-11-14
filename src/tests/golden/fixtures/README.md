# Golden fixtures

Black-box snapshots of the two pre-merge game services, produced by `../golden.test.ts` with
`GOLDEN_UPDATE=1`:

| File | Captured from | Command |
|---|---|---|
| `quiz.json` | `AxiomNode/microservice-quizz` at `03d2f89` (origin/main) | `GOLDEN_UPDATE=1 GOLDEN_GAME=quiz npx vitest run tests/golden` |
| `word-pass.json` | `AxiomNode/microservice-word-pass` at `0271474` (origin/main), running the same harness and seeds | `GOLDEN_UPDATE=1 GOLDEN_GAME=word-pass npx vitest run tests/golden` |

Each scenario records the HTTP status and body, the Prisma calls the request made (with the `gameType`
filter, stored `query` and `uniquenessKey`) and the outbound ai-engine requests.

Never regenerate a fixture from refactored code: a diff against these files means behaviour changed.
