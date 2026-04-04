# AGENTS

## Repo purpose
Quiz generation and persistence microservice backed by ai-engine and PostgreSQL.

## Key paths
- src/: Fastify routes, services, Prisma, tests
- docs/: architecture, guides, operations
- .github/workflows/ci.yml: CI + infra dispatch

## Local commands
- cd src && npm install
- cd src && npm run db:push && npm run dev
- cd src && npm test && npm run lint && npm run build

## CI/CD notes
- Push to main dispatches platform-infra build-push with service=microservice-quizz.
- Deployment to dev is automated from platform-infra.

## LLM editing rules
- Preserve API behavior for generate/ingest/model endpoints.
- Keep Prisma and route validation aligned.
- Update docs when ports/routes/workflow assumptions change.
