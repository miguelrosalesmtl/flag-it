# flag-it

A self-hosted, multi-tenant feature-flagging platform in Go — a LaunchDarkly-style
service with **server-side evaluation**, a **React dashboard** (`web/`), and an
API that runs as many identical replicas behind a load balancer.

- **Multi-tenant**: Tenant → Project → Environment. A cross-tenant superuser sees
  everything; per-tenant roles (permission bundles) scope everyone else.
- **Server-side evaluation**: the targeting ruleset never leaves the backend.
  SDKs send a context and get back a value — they never receive the rules.
- **Auto-generated OpenAPI**: the HTTP layer is [huma](https://huma.rocks) over
  chi, so the spec is generated from the code. Browse `/docs`, fetch
  `/openapi.yaml`.

## Two API surfaces

This is the key mental model. The service exposes **two distinct APIs for two
different audiences**, distinguished by their authentication:

| | **Management API** | **Client / SDK API** |
|---|---|---|
| **Audience** | Humans configuring flags (the dashboard, admins, CI) | Apps evaluating flags at runtime (SDKs) |
| **Auth** | JWT bearer (`Authorization: Bearer …`, from login) | SDK key (`X-SDK-Key: …`, minted per environment) |
| **Paths** | `/api/v1/tenants/…` — flags, targeting, segments, projects, environments, SDK keys, members, roles, audit | `/api/v1/eval`, `/api/v1/eval/all`, `/api/v1/eval/stream` (SSE), `/api/v1/events` |
| **Traffic** | Low — a handful of admins | Potentially huge — every SDK instance, long-lived streams |
| **Writes vs reads** | Read/write config | Read-only evaluation (+ pushes usage summaries) |

**Today both surfaces run in the same process** — one binary, one OpenAPI, just
endpoints scoped by different auth. That is deliberately simple and correct for
now.

Because they have **opposite scaling profiles**, they are designed to be pulled
apart later without a rewrite: the `internal/` packages don't care which binary
they compile into, so the eval/stream endpoints can move to their own
independently-scaled deployable (many replicas behind a load balancer) while the
management API stays small. This mirrors LaunchDarkly's production split (a
separate evaluation/streaming tier plus a Relay Proxy). Nothing about the domain
code changes — only how it's deployed.

## Architecture (horizontal scale)

```
                 ┌──────────────┐  writes   ┌────────────┐
   SDKs ───────► │  replica A   │ ────────► │            │
                 │  (in-mem     │           │  Postgres  │  source of truth
   SDKs ───────► │   cache)     │ ◄──────── │            │
                 └──────┬───────┘   reads   └────────────┘
                        │ publish/subscribe
                 ┌──────▼───────┐
                 │    Redis     │  pub/sub bus — broadcasts flag changes
                 └──────▲───────┘
                        │
                 ┌──────┴───────┐
   SDKs ───────► │  replica B   │  reloads changed flags on each event
                 └──────────────┘
```

- **Postgres is the source of truth.** All config lives there.
- **Each replica keeps every environment's flags in memory**, so evaluation is a
  map lookup — no database round-trip on the hot path.
- **Redis pub/sub keeps replicas consistent.** On a write, the handling replica
  saves to Postgres, updates its own cache, and publishes a change event; every
  replica reloads the affected environment. New/restarted pods warm from Postgres
  on boot, so a missed broadcast self-heals.
- **Bounded writes for analytics & contexts.** Evaluation counts and seen
  contexts are buffered in memory and flushed to Postgres on an interval — never
  one write per eval.

## Layout

```
cmd/server            Entrypoint + subcommands: server | migrate | createsuperuser | openapi
internal/
  settings            Django-style typed config from env / .env
  database            Postgres pool (pgx) + goose migration runner
  logger              Structured logging (slog)
  models              Domain types — the shared vocabulary (no I/O)
  store               Postgres persistence (the ONLY package that writes SQL)
  auth                JWT issue/verify, bcrypt, first-run bootstrap  ── service
  authz               Roles, permissions, Subject.Can(...)           ── service
  catalog             Tenants / projects / environments / SDK keys   ── service
  audit               Append-only change log                         ── service
  analytics           Buffered eval counters → rollups               ── service
  contexts            Records contexts seen during eval              ── service
  flags               Cache + evaluation engine (+ pure eval funcs)  ── service
  pubsub              Redis pub/sub bus
  server              HTTP layer: huma operations (the ONLY place that knows HTTP)
pkg/ffclient          Thin Go SDK (talks to the eval API)
migrations            SQL schema (goose, embedded)
web/                  React + TypeScript dashboard (see web/README.md)
```

The dependency direction points inward, toward `models`. Handlers go through
services; SQL lives only in `store`; business logic lives only in services. See
`CLAUDE.md` for the rules.

## Configuration

All config comes from environment variables, optionally seeded from `.env` (real
env vars always win — exactly how Kubernetes ConfigMaps/Secrets behave). Nothing
reads `os.Getenv` outside `internal/settings`.

```bash
cp .env.example .env
```

## Run locally

```bash
make up        # Postgres, Redis, and 2 app replicas (docker compose up --build)
# Replica 1: http://localhost:8080   Replica 2: http://localhost:8081

make web-dev   # the dashboard on http://localhost:5173 (needs the API running)
```

First run has no users, so the dashboard opens a **setup wizard** (or use the
CLI: `./bin/server createsuperuser <email> <password>`). The wizard creates the
first superuser + tenant via the public, one-time `POST /api/v1/setup`.

## API reference

Full spec at `/docs` (Swagger UI) and `/openapi.yaml`. The shape:

### Management API (JWT bearer)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/v1/setup` | First-run: needs-setup check / bootstrap (public, one-time) |
| POST | `/api/v1/auth/login` | Exchange credentials for a JWT |
| GET | `/api/v1/me` | Current user |
| — | `/api/v1/users`, `/api/v1/tenants`, `/api/v1/permissions` | Users, tenants, permission vocabulary |
| — | `/api/v1/tenants/{t}/projects/{p}/flags` | Flag definitions (+ `/{flagKey}`, `/environments/{env}/flags` with on/off state) |
| PATCH | `…/flags/{flagKey}/environments/{env}` | Targeting via semantic instructions (turnFlagOn, addRule, …) |
| — | `…/segments`, `…/environments`, `…/environments/{env}/sdk-keys` | Segments, environments, SDK keys |
| — | `…/environments/{env}/contexts` | Contexts seen during evaluation (+ detail with expected variations) |
| — | `/api/v1/tenants/{t}/roles`, `…/members`, `…/audit` | Roles, members, change history |

### Client / SDK API (`X-SDK-Key`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/eval` | Evaluate one flag for a context |
| POST | `/api/v1/eval/all` | Evaluate every flag for a context (batch) |
| GET | `/api/v1/eval/stream` | Server-Sent Events — real-time flag updates |
| POST | `/api/v1/events` | SDKs push rolled-up evaluation summaries |

### Health (public)

`GET /healthz` (liveness) · `GET /readyz` (readiness — pings Postgres + Redis).

## Evaluation

Server-side, LaunchDarkly-style: multi-kind contexts, prerequisites, individual
targets, rules with clauses (14 operators incl. segmentMatch, semver, dates),
and percentage rollouts with stable SHA-1 bucketing. The ruleset never ships to
clients; the SDK sends a context and receives `{value, variation, reason}`.

## Kubernetes notes

- Run 2+ replicas behind a Service; they're stateless apart from the cache.
- Set `INSTANCE_ID` from the downward API (`metadata.name`) so logs and pub/sub
  events are attributable per pod.
- Wire `/healthz` → `livenessProbe`, `/readyz` → `readinessProbe`.
- `SIGTERM` triggers graceful shutdown within `SERVER_SHUTDOWN_TIMEOUT`.
- Put `JWT_SECRET`, `POSTGRES_PASSWORD`, and `REDIS_PASSWORD` in a Secret.
- To scale the client/eval surface independently, deploy the eval/stream
  endpoints as their own replica set (see "Two API surfaces").

## Development

```bash
make test   # go test ./...
make vet    # go vet ./...
make fmt    # gofmt -w .
make openapi  # regenerate docs/openapi.yaml from the code

# web/
make web-install && make web-build   # or: cd web && pnpm lint && pnpm typecheck && pnpm test:e2e
```
