# feature-flag

A LaunchDarkly-style feature flagging service in Go, built to run as many
identical replicas in Kubernetes and scale horizontally.

## Architecture

```
                 ┌──────────────┐  writes   ┌────────────┐
   clients ────► │  replica A   │ ────────► │            │
                 │  (in-mem     │           │  Postgres  │  source of truth
   clients ────► │   cache)     │ ◄──────── │            │
                 └──────┬───────┘   reads   └────────────┘
                        │ publish/subscribe
                 ┌──────▼───────┐
                 │    Redis     │  pub/sub bus — broadcasts flag changes
                 └──────▲───────┘
                        │
                 ┌──────┴───────┐
   clients ────► │  replica B   │  reloads changed flags on each event
                 └──────────────┘
```

- **Postgres is the source of truth.** All flag config lives there.
- **Each replica keeps every flag in memory**, so evaluation is a map lookup —
  no database round-trip on the hot path.
- **Redis pub/sub keeps replicas consistent.** On a write, the handling replica
  saves to Postgres, updates its own cache, and publishes a change event. Every
  replica (including the publisher) reloads the affected flag from Postgres when
  it receives the event. New/restarted pods warm their cache from Postgres on
  boot, so a missed broadcast self-heals.

## Layout

| Path | Responsibility |
|------|----------------|
| `cmd/server` | Entrypoint: wiring + graceful shutdown |
| `internal/settings` | Django-style typed config from env / `.env` |
| `internal/database` | Postgres connection pool (pgx) |
| `internal/pubsub` | Redis pub/sub bus |
| `internal/flags` | Models, repository, cache + evaluation service |
| `internal/server` | HTTP routing, middleware, handlers |
| `internal/logger` | Structured logging (slog) |
| `migrations` | SQL schema |

## Configuration

All configuration comes from environment variables, optionally seeded from a
`.env` file (see `.env.example`). Real environment variables always win, which
is exactly how it behaves under Kubernetes ConfigMaps/Secrets. Nothing reads
`os.Getenv` outside `internal/settings`.

```bash
cp .env.example .env
```

## Run locally

Bring up Postgres, Redis, and **two** app replicas (to watch pub/sub propagate):

```bash
make up        # docker compose up --build
```

- Replica 1: http://localhost:8080
- Replica 2: http://localhost:8081

Or run a single instance against your own Postgres/Redis:

```bash
make up        # start just the infra, or run your own
make run       # go run ./cmd/server
```

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | Liveness probe |
| GET | `/readyz` | Readiness probe (pings Postgres + Redis) |
| GET | `/api/v1/flags` | List all flags |
| GET | `/api/v1/flags/{key}` | Get one flag |
| PUT | `/api/v1/flags/{key}` | Create/update a flag *(requires `X-API-Key`)* |
| DELETE | `/api/v1/flags/{key}` | Delete a flag *(requires `X-API-Key`)* |
| POST | `/api/v1/flags/{key}/evaluate` | Evaluate a flag for a context |

### Example

Create a flag with a 30% rollout:

```bash
curl -X PUT localhost:8080/api/v1/flags/new-search \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "New search",
    "enabled": true,
    "variations": [true, false],
    "default_variation": 1,
    "off_variation": 1,
    "rollout": [30, 70]
  }'
```

Evaluate it for a user (the same key always lands in the same bucket, across
every replica):

```bash
curl -X POST localhost:8081/api/v1/flags/new-search/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"context": {"key": "user-42"}}'
# => {"flag_key":"new-search","value":true,"variation":0,"reason":"ROLLOUT"}
```

Write it on replica 1 (`:8080`), read it on replica 2 (`:8081`) — the change
propagates over Redis.

## Evaluation rules

Evaluated in order:

1. Flag disabled → `off_variation` (`reason: OFF`)
2. Context key in `targets` → that variation (`TARGET_MATCH`)
3. `rollout` configured → stable hash bucket by `flag_key:context_key` (`ROLLOUT`)
4. Otherwise → `default_variation` (`DEFAULT`)

## Kubernetes notes

- Run 2+ replicas behind a Service; they're stateless apart from the cache.
- Set `INSTANCE_ID` from the downward API (`metadata.name`) so log lines and
  pub/sub events are attributable per pod.
- Wire `/healthz` to `livenessProbe` and `/readyz` to `readinessProbe`.
- `SIGTERM` triggers graceful shutdown within `SERVER_SHUTDOWN_TIMEOUT`.
- Put `API_KEY`, `POSTGRES_PASSWORD`, and `REDIS_PASSWORD` in a Secret. `API_KEY`
  is required when `APP_ENV=production` (enforced at startup).

## Development

```bash
make tidy   # go mod tidy
make test   # go test ./...
make vet    # go vet ./...
make fmt    # gofmt -w .
```
