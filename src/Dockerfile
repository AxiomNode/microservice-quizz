FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /workspace/microservice-quizz/src
COPY microservice-quizz/src/package.json microservice-quizz/src/package-lock.json* ./
COPY shared-sdk-client/typescript /workspace/shared-sdk-client/typescript
COPY contracts-and-schemas /workspace/contracts-and-schemas
RUN npm --prefix /workspace/shared-sdk-client/typescript install \
	&& npm --prefix /workspace/shared-sdk-client/typescript run build
RUN npm install

FROM node:20-bookworm-slim AS build
WORKDIR /workspace/microservice-quizz/src
RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=deps /workspace/microservice-quizz/src/node_modules ./node_modules
COPY --from=deps /workspace/shared-sdk-client/typescript /workspace/shared-sdk-client/typescript
COPY --from=deps /workspace/shared-sdk-client/typescript /shared-sdk-client/typescript
COPY microservice-quizz/src/package.json ./package.json
COPY microservice-quizz/src/tsconfig*.json ./
COPY microservice-quizz/src/.env.example ./.env.example
COPY microservice-quizz/src/prisma ./prisma
COPY microservice-quizz/src/app ./app
RUN npm run db:generate && npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl ca-certificates \
	&& rm -rf /var/lib/apt/lists/*
COPY --from=build /workspace/microservice-quizz/src/node_modules ./node_modules
COPY --from=build /workspace/shared-sdk-client/typescript /workspace/shared-sdk-client/typescript
COPY --from=build /workspace/shared-sdk-client/typescript /shared-sdk-client/typescript
COPY --from=build /workspace/microservice-quizz/src/dist ./dist
COPY --from=build /workspace/microservice-quizz/src/prisma ./prisma
COPY --from=build /workspace/microservice-quizz/src/.env.example ./.env.example
EXPOSE 7100
CMD ["sh", "-c", "npx prisma db push && node dist/app/server.js"]
