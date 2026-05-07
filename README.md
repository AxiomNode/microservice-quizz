# microservice-quizz

Last updated: 2026-05-03.

[![codecov](https://codecov.io/gh/AxiomNode/microservice-quizz/branch/main/graph/badge.svg)](https://codecov.io/gh/AxiomNode/microservice-quizz)

TypeScript microservice for quiz generation and persistence.

## Responsibility

`microservice-quizz` is the quiz domain service responsible for generation orchestration, persistence of generated content, and read APIs for reusable quiz models.

It depends on `ai-engine` for content generation but remains the domain owner for request shaping, validation, persistence, and retrieval semantics.

## Runtime role

### Main responsibilities

- Request quiz generation from `ai-engine`.
- Persist generated quiz models and history in PostgreSQL.
- Expose quiz catalog and generation APIs for BFF consumers.

### Ownership boundary

`microservice-quizz` owns quiz-domain correctness even when `ai-engine` produced the raw content.

That includes:

- generation request shaping
- quiz payload validation
- rejection of incomplete or invalid stored/generated rows
- persistence and retrieval semantics for quiz models

## Runtime surface

### Primary use cases

- request quiz generation for a user-facing category and language
- ingest externally generated quiz content into the domain store
- retrieve random stored quiz models for playback or reuse
- inspect historical generated content
- expose private docs and health surfaces for deployment validation

Detailed generation semantics, duplicate handling, and inventory behavior are documented in the quiz capability dossier so this README can stay at repository level.

### Stack

- Node.js 20+
- Fastify
- Zod
- Prisma
- PostgreSQL
- Vitest

## Local setup

### Project layout

- `src/`: service code, Prisma schema, tests, and Docker assets.
- `docs/`: architecture, guides, and operations docs.

### Local development

```bash
cd src
cp .env.example .env
npm install
npm run db:push
npm run dev
```

Inject real secrets from the private `secrets` repository when needed:

```bash
node scripts/prepare-runtime-secrets.mjs dev
```

### Route note

This service owns quiz generation, ingest, random inventory, grouped inventory, and history routes. Use `docs/architecture/README.md` and the quiz inventory capability dossier for the concrete contract inventory.

## Dependencies and contracts

### Dependency model

Primary infrastructure dependency:

- PostgreSQL

Primary service dependencies:

- `ai-engine-api`
- `ai-engine-stats` via shared instrumentation paths where applicable

Primary consumers:

- `bff-mobile`
- `bff-backoffice`

### Private docs

- Route: `/private/docs`
- JSON: `/private/docs/json`
- Auth headers: `X-Private-Docs-Token` or `Authorization: Bearer <token>`

## Documentation

- `docs/README.md`
- `docs/architecture/README.md`
- `docs/guides/README.md`
- `docs/operations/README.md`

## Deployment and operations notes

### CI/CD and rollout note

CI, smoke checks, and staging rollout behavior are documented in `docs/operations/README.md` and `../docs/operations/cicd-workflow-map.md`.

### Resilience notes

- This service is expected to tolerate bad persisted rows without failing the whole read path where possible.
- Retry behavior toward `ai-engine` should be driven by explicit environment configuration, not ad hoc hardcoded retries.
- Async generation process items use `GAME_GENERATION_ITEM_TIMEOUT_MS` and `GAME_GENERATION_ITEM_RETRY_MAX_ATTEMPTS` so blocked LLM calls become explicit `timeout` item progress events instead of indefinite `running` tasks.
- Docker smoke validation and private docs validation are part of the delivery contract.

### Failure boundaries

- AI request returns invalid structured content
- AI request rejected because generation capacity is saturated
- database write or read failure after otherwise valid generation
- stored invalid rows degrade selection or history endpoints

## References

- `docs/architecture/`
- `docs/operations/`
- `../docs/guides/capabilities/domain/quiz-inventory-and-generation.md`
- `../docs/operations/cicd-workflow-map.md`
