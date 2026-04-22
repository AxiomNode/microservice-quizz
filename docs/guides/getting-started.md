# Getting Started

## Scope

This guide covers local development and basic runtime verification for `microservice-quizz`.

## Prerequisites

Before starting, ensure:

- Node.js and npm are available
- PostgreSQL is reachable for the configured local environment
- required secrets have been prepared from the private `secrets` repository
- downstream AI integration is available if generation endpoints will be tested end-to-end

## Local setup

1. Install dependencies:

```bash
cd src
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Inject real secrets from private repository `secrets`:

```bash
node scripts/prepare-runtime-secrets.mjs dev
```

This generates `src/.env.secrets` for this service.

3. Initialize database:

```bash
npm run db:push
```

4. Run dev server:

```bash
npm run dev
```

## Smoke path examples

5. Generate a quiz session:

```bash
curl -X POST http://localhost:7100/games/generate \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"17","language":"es","difficultyPercentage":55,"numQuestions":8}'
```

6. Retrieve random models filtered by language and category:

```bash
curl "http://localhost:7100/games/models/random?count=10&language=es&categoryId=17"
```

7. Group model counts by category and language:

```bash
curl "http://localhost:7100/games/models/grouped"
```

## Development notes

- generation success depends on downstream AI availability and content validity, not only service health
- random-model reads may surface persistence-quality problems that do not appear on the write path
- category and language behavior should stay aligned with shared SDK catalogs

## Fixed language policy

- Active fixed languages: `es`, `en`, `fr`, `de`, `it`.
- To add a new language later, edit `shared-sdk-client/typescript/src/trivia-categories.ts` and then restart/rebuild.
