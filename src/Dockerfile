FROM node:22-bookworm-slim AS deps
# openssl is needed here (not only at runtime) so Prisma downloads the
# debian-openssl-3.0.x engines when the packages are installed.
RUN apt-get update 	&& apt-get install -y --no-install-recommends openssl ca-certificates 	&& rm -rf /var/lib/apt/lists/*
WORKDIR /workspace/shared-sdk-client/typescript
COPY shared-sdk-client/typescript/package.json shared-sdk-client/typescript/package-lock.json ./
RUN npm ci
COPY shared-sdk-client/typescript ./
RUN npm run build
WORKDIR /workspace/microservice-quizz/src
COPY microservice-quizz/src/package.json microservice-quizz/src/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /workspace/microservice-quizz/src
RUN apt-get update 	&& apt-get install -y --no-install-recommends openssl ca-certificates 	&& rm -rf /var/lib/apt/lists/*
# node_modules/@axiomnode/shared-sdk-client is a relative symlink to
# /workspace/shared-sdk-client/typescript, so the SDK must live at that path.
COPY --from=deps /workspace/shared-sdk-client/typescript /workspace/shared-sdk-client/typescript
COPY --from=deps /workspace/microservice-quizz/src/node_modules ./node_modules
COPY microservice-quizz/src/package.json ./package.json
COPY microservice-quizz/src/tsconfig*.json ./
COPY microservice-quizz/src/.env.example ./.env.example
COPY microservice-quizz/src/prisma ./prisma
COPY microservice-quizz/src/app ./app
RUN npm run db:generate && npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production 	CHECKPOINT_DISABLE=1
RUN apt-get update 	&& apt-get install -y --no-install-recommends openssl ca-certificates 	&& rm -rf /var/lib/apt/lists/*
# From /app/node_modules/@axiomnode the same relative symlink resolves to
# /shared-sdk-client/typescript, so the SDK is copied once, to that path.
COPY --from=build --chown=node:node /workspace/shared-sdk-client/typescript /shared-sdk-client/typescript
COPY --from=build --chown=node:node /workspace/microservice-quizz/src/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/microservice-quizz/src/dist ./dist
COPY --from=build --chown=node:node /workspace/microservice-quizz/src/prisma ./prisma
COPY --from=build --chown=node:node /workspace/microservice-quizz/src/.env.example ./.env.example
USER node
EXPOSE 7100
# The image does not touch the schema: the orchestrator runs it before the server (Kubernetes:
# `prisma migrate deploy` in the Deployment args; compose: `prisma db push` in `command`), because
# both games share one database that must not be reshaped by whichever container starts first.
# prisma is a pinned production dependency, so `npx --no-install prisma` works without a download.
# GAME_TYPE (quiz | word-pass) is mandatory: the process exits at start-up without it.
CMD ["node", "dist/app/server.js"]
