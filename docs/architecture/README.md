# Architecture

`microservice-quizz` follows a layered design:

- Route layer (Fastify handlers)
- Service layer (AI orchestration + business rules)
- Persistence layer (Prisma + PostgreSQL)

The service is intentionally scoped to a single game type: `quiz`.

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
