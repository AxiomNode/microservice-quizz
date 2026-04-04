# Deployment

## Build image
```bash
docker build -t microservice-quiz:latest ./src
```

## Run container
```bash
docker run --rm -p 7100:7100 --env-file ./src/.env microservice-quiz:latest
```

## Docker Compose (repository-local)

Run from repository root:

```bash
docker compose up -d --build
```

Stop and remove containers:

```bash
docker compose down
```

## Automated CI/CD path

1. Push to `main` in this repository.
2. `.github/workflows/ci.yml` dispatches `platform-infra` build for `microservice-quizz`.
3. `platform-infra` publishes the image to GHCR.
4. `platform-infra` deploy workflow applies rollout to `dev`.
