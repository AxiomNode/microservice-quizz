# Architecture

Last updated: 2026-05-08.

## Purpose

This section documents the repository-local architecture of `microservice-quizz`.

## Scope

`microservice-quizz` follows a layered design:

- Route layer (Fastify handlers)
- Service layer (AI orchestration + business rules)
- Persistence layer (Prisma + PostgreSQL)

One process serves exactly one game, chosen by `GAME_TYPE` (`quiz` or `word-pass`); see "Games served" below.

## Games served (one code base, one image)

The same image runs as either game; `GAME_TYPE` selects the `GameStrategy` (`src/app/games/`) for the whole process.
Nothing else in the code branches on the game type.

| | `GAME_TYPE=quiz` | `GAME_TYPE=word-pass` |
|---|---|---|
| Service name / default `X-Ingest-Source` | `microservice-quiz` | `microservice-wordpass` |
| ai-engine endpoints | `/generate/quiz`, `/ingest/quiz` | `/generate/word-pass`, `/ingest/word-pass` |
| Default `BATCH_GENERATION_MAX_QUESTIONS` | 12 | 10 |
| `max_tokens` sent to ai-engine | 512 | 1024 |
| Extra generate field | none | `letters` |
| `/games/models/grouped` `groupedBy` | `["category"]` | `["category","language"]` |
| `/monitor/stats` matrix coverage | no | yes |

- Default port is 7100 for both (`SERVICE_PORT` still overrides; docker-compose publishes word-pass on host 7101).
- `GAME_TYPE` is validated at startup: an unknown value aborts with `Invalid GAME_TYPE "x". Expected one of: quiz, word-pass.`
  While the deployments do not set it yet (transitional), a missing value falls back to `quiz` and logs a warning.
- Every query is filtered by `gameType`, and the content-uniqueness key includes it, so both games can share one table.
- `SERVICE_NAME`, the endpoints, `AI_ENGINE_INGEST_SOURCE` and `BATCH_GENERATION_MAX_QUESTIONS` default from the strategy; set them only to override.

## Routes (both games)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status, service, gameType, catalogReady, catalogSource }`; always 200 |
| GET | `/catalogs` | categories the service currently uses |
| POST | `/games/generate` | body: `categoryId`, optional `difficultyPercentage`, `itemCount`, `requestedBy` (word-pass also accepts `letters`) |
| POST | `/games/generate/process`, `/games/generate/process/wait` | multi-item generation task |
| GET | `/games/generate/processes`, `/games/generate/process/:taskId` | task status |
| GET/POST | `/games/generate/worker`, `.../start`, `.../stop` | runtime generation worker |
| POST | `/games/ingest` | ingest documents into ai-engine RAG |
| GET | `/games/models/random` | random stored models (`count`, `categoryId`, `difficultyPercentage`, `status`, `createdAfter/Before`) |
| GET | `/games/models/grouped` | counts per category (and language for word-pass) |
| GET | `/games/history` | paged history (`limit`, `page`, `pageSize`, `categoryId`, `difficultyPercentage`, `status`) |
| GET | `/games/history/insights` | category distribution of the history rows matching the same filters (`categoryId`, `difficultyPercentage`, `status`), one GROUP BY, no row payloads |
| POST/PATCH/DELETE | `/games/history/manual`, `/games/history/:entryId` | manual curation |
| GET | `/monitor/stats`, `/monitor/logs`, `/metrics` | monitoring |

### `GET /games/history/insights`

Response (both games; `gameType` echoes the strategy):

```json
{
  "gameType": "quiz",
  "total": 3,
  "categories": [
    { "categoryId": "9", "categoryName": "General Knowledge", "count": 2, "latestCreatedAt": "2026-04-15T18:02:00.000Z" }
  ]
}
```

Buckets are sorted by `latestCreatedAt` (newest first); invalid filters answer `400 { message: "Invalid query parameters" }`.
The OpenAPI contracts live in `contracts-and-schemas` and still lack this route (tracked for the contracts step of the games merge plan).

## Owned responsibilities

This repository owns quiz-domain behavior for:

- shaping quiz-generation requests
- validating generated quiz payloads
- persisting reusable quiz models and history
- serving retrieval paths for random and grouped quiz content

## Dependency model

Primary infrastructure dependency:

- PostgreSQL

Primary service dependency:

- `ai-engine-api` for generation and ingest-related flows

## Architectural constraints

- do not move quiz-domain validation into a BFF
- do not treat AI output as trusted until domain validation succeeds
- treat stored-content quality as part of runtime correctness, not just write-path correctness

## Failure boundaries

- generation returns syntactically valid but domain-invalid quiz content
- persistence succeeds for some rows while later retrieval exposes poor stored quality
- read-path failures surface independently from generation-path health

## When to update

Update this section when changing service layering, AI orchestration boundaries, or quiz-domain ownership rules.
