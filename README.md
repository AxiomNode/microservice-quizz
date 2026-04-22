# microservice-quizz

[![codecov](https://codecov.io/gh/AxiomNode/microservice-quizz/branch/main/graph/badge.svg)](https://codecov.io/gh/AxiomNode/microservice-quizz)

TypeScript microservice for quiz generation and persistence.

## Architectural role

`microservice-quizz` is the quiz domain service responsible for generation orchestration, persistence of generated content, and read APIs for reusable quiz models.

It depends on `ai-engine` for content generation but remains the domain owner for request shaping, validation, persistence, and retrieval semantics.

## Responsibilities

- Request quiz generation from `ai-engine`.
- Persist generated quiz models and history in PostgreSQL.
- Expose quiz catalog and generation APIs for BFF consumers.

## Ownership boundary

`microservice-quizz` owns quiz-domain correctness even when `ai-engine` produced the raw content.

That includes:

- generation request shaping
- quiz payload validation
- rejection of incomplete or invalid stored/generated rows
- persistence and retrieval semantics for quiz models

## Primary use cases

- request quiz generation for a user-facing category and language
- ingest externally generated quiz content into the domain store
- retrieve random stored quiz models for playback or reuse
- inspect historical generated content
- expose private docs and health surfaces for deployment validation

## Stack

- Node.js 20+
- Fastify
- Zod
- Prisma
- PostgreSQL
- Vitest

## Project layout

- `src/`: service code, Prisma schema, tests, and Docker assets.
- `docs/`: architecture, guides, and operations docs.

## Local development

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

## API highlights

- `GET /health`
- `POST /games/generate`
- `POST /games/ingest`
- `GET /games/models/random`
- `GET /games/models/grouped`
- `GET /games/history`

## Dependency model

Primary infrastructure dependency:

- PostgreSQL

Primary service dependencies:

- `ai-engine-api`
- `ai-engine-stats` via shared instrumentation paths where applicable

Primary consumers:

- `bff-mobile`
- `bff-backoffice`

## Private docs

- Route: `/private/docs`
- JSON: `/private/docs/json`
- Auth headers: `X-Private-Docs-Token` or `Authorization: Bearer <token>`

## CI/CD workflow behavior

- `.github/workflows/ci.yml`
  - Trigger: push (`main`, `develop`), pull request, manual dispatch.
  - Job `build-test-lint-audit`: build, test, lint, npm production audit.
  - Job `docker-smoke-private-docs`: validates container startup + private docs auth behavior.
  - Job `trigger-platform-infra-build`:
    - Runs on push to `main`.
    - Waits for `build-test-lint-audit` and `docker-smoke-private-docs` to succeed before dispatching `platform-infra`.
    - Dispatches `platform-infra/.github/workflows/build-push.yaml` with `service=microservice-quizz`.
    - Requires `PLATFORM_INFRA_DISPATCH_TOKEN` in this repo.

## Deployment automation chain

Push to `main` triggers image rebuild in `platform-infra`, followed by automatic deployment to `stg`.

## Resilience notes

- This service is expected to tolerate bad persisted rows without failing the whole read path where possible.
- Retry behavior toward `ai-engine` should be driven by explicit environment configuration, not ad hoc hardcoded retries.
- Docker smoke validation and private docs validation are part of the delivery contract.

## Failure boundaries

- AI request returns invalid structured content
- AI request rejected because generation capacity is saturated
- database write or read failure after otherwise valid generation
- stored invalid rows degrade selection or history endpoints

## Related documents

- `docs/architecture/`
- `docs/operations/`
