# Architecture

`microservice-quizz` follows a layered design:

- Route layer (Fastify handlers)
- Service layer (AI orchestration + business rules)
- Persistence layer (Prisma + PostgreSQL)

The service is intentionally scoped to a single game type: `quiz`.
