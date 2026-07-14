# flag-it

A self-hosted, multi-organization feature-flagging platform in Go — a LaunchDarkly-style
service with **server-side evaluation**, a **React dashboard** (`web/`), and an
API that runs as many identical replicas behind a load balancer.

- **Multi-organization**: Organization → Project → Environment. A cross-organization superuser sees
  everything; per-organization roles (permission bundles) scope everyone else.
- **Server-side evaluation**: the targeting ruleset never leaves the backend.
  SDKs send a context and get back a value — they never receive the rules.
- **Auto-generated OpenAPI**: the HTTP layer is [huma](https://huma.rocks) over
  chi, so the spec is generated from the code. Browse `/docs`, fetch
  `/openapi.yaml`.
- **Governance & operations**: approval workflows, scheduled changes, inbound
  flag triggers, temporary-flag / stale detection, and signed outbound
  webhooks — every change audited end to end.

## Two API surfaces

This is the key mental model. The service exposes **two distinct APIs for two
different audiences**, distinguished by their authentication:

| | **Management API** | **Client / SDK API** |
|---|---|---|
| **Audience** | Humans configuring flags (the dashboard, admins, CI) | Apps evaluating flags at runtime (SDKs) |
| **Auth** | JWT bearer (`Authorization: Bearer …`, from login) | SDK key (`X-SDK-Key: …`, minted per environment) |
| **Paths** | `/api/v1/organizations/…` — flags, targeting, segments, projects, environments, SDK keys, members, roles, audit, approvals, scheduled changes, triggers, webhooks | `/api/v1/eval`, `/api/v1/eval/all`, `/api/v1/eval/stream` (SSE), `/api/v1/events` |
| **Traffic** | Low — a handful of admins | Potentially huge — every SDK instance, long-lived streams |
| **Writes vs reads** | Read/write config | Read-only evaluation (+ pushes usage summaries) |

**Today both surfaces run in the same process** — one binary, one OpenAPI, just
endpoints scoped by different auth. That is deliberately simple and correct for
now. (A third, narrow surface exists for **inbound flag triggers**:
`POST /api/v1/triggers/{token}` takes no bearer or SDK key — the unguessable URL
token *is* the credential, so an alerting system can flip a kill-switch.)

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
- **Background workers.** A scheduler applies due scheduled changes, and a
  webhook deliverer sends signed events with retry/backoff — both run off the
  request path as goroutines that drain on `SIGTERM`.

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
  catalog             Organizations / projects / environments / SDK keys   ── service
  audit               Append-only change log                         ── service
  analytics           Buffered eval counters → rollups               ── service
  contexts            Records contexts seen during eval              ── service
  flags               Cache + evaluation engine (+ pure eval funcs)  ── service
  governance          Approvals, scheduled changes, flag triggers    ── service
  webhooks            Outbound webhook delivery (signed, retrying)    ── service
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
first superuser + organization via the public, one-time `POST /api/v1/setup`.

## API reference

Full spec at `/docs` (Swagger UI) and `/openapi.yaml`. The shape:

### Management API (JWT bearer)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/v1/setup` | First-run: needs-setup check / bootstrap (public, one-time) |
| POST | `/api/v1/auth/login` | Exchange credentials for a JWT |
| GET | `/api/v1/me` | Current user |
| — | `/api/v1/users`, `/api/v1/organizations`, `/api/v1/permissions` | Users, organizations, permission vocabulary |
| — | `/api/v1/organizations/{t}/projects/{p}/flags` | Flag definitions (+ `/{flagKey}`, `/environments/{env}/flags` with on/off state) |
| PATCH | `…/flags/{flagKey}/environments/{env}` | Targeting via semantic instructions (turnFlagOn, addRule, reorderRules, updateRule, …) |
| GET | `…/flags/lifecycle` | Flags annotated new/active/stale for cleanup (temporary flag detection) |
| — | `…/segments`, `…/environments`, `…/environments/{env}/sdk-keys` | Segments, environments, SDK keys |
| — | `…/environments/{env}/contexts` | Contexts seen during evaluation (+ detail with expected variations) |
| — | `…/flags/{flagKey}/environments/{env}/changes`, `…/changes/{id}/approve`\|`reject` | Approval workflow: propose a change, review it |
| — | `…/flags/{flagKey}/environments/{env}/scheduled-changes`, `…/scheduled-changes/{id}/cancel` | Schedule a change for a future time |
| — | `…/flags/{flagKey}/environments/{env}/triggers`, `…/triggers/{id}/…` | Inbound-webhook triggers (create/list/enable/reset/delete) |
| — | `/api/v1/organizations/{t}/webhooks`, `…/webhooks/{id}/deliveries` | Outbound webhooks + delivery log |
| — | `/api/v1/organizations/{t}/roles`, `…/members`, `…/projects/{p}/roles`, `…/audit` | Roles, organization members, project-scoped role grants, change history |

### Client / SDK API (`X-SDK-Key`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/eval` | Evaluate one flag for a context |
| POST | `/api/v1/eval/all` | Evaluate every flag for a context (batch) |
| GET | `/api/v1/eval/stream` | Server-Sent Events — real-time flag updates |
| POST | `/api/v1/events` | SDKs push rolled-up evaluation summaries |

### Trigger webhooks (URL token)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/triggers/{token}` | Fire a flag trigger — no bearer/SDK key; the token in the URL is the credential |

### Health (public)

`GET /healthz` (liveness) · `GET /readyz` (readiness — pings Postgres + Redis).

## Evaluation

Server-side, LaunchDarkly-style: multi-kind contexts, prerequisites, individual
targets, and multiple ordered targeting rules (first match wins), each clause one
of 15 operators (incl. `segmentMatch`, semver, dates). A rule serves a fixed
variation or a **percentage rollout** with stable SHA-1 bucketing — bucketable by
any attribute (`bucketBy`), by another context kind (`contextKind`, e.g. keep a
whole org together), and reshuffleable with a `seed`. The ruleset never ships to
clients; the SDK sends a context and receives `{value, variation, reason}`.

## Governance & operations

Every flag change is expressible as a set of **semantic instructions**
(`turnFlagOn`, `addRule`, `reorderRules`, …). That one abstraction is applied
directly on write, and reused by three controlled paths:

- **Approval workflows** — propose a change as a change request; it applies only
  when a reviewer approves it.
- **Scheduled changes** — attach instructions to a future time; a background
  scheduler applies them when due (cancellable until then).
- **Flag triggers** — an unguessable inbound-webhook URL that applies a fixed
  on/off action when POSTed to (see "Trigger webhooks" above).

Plus:

- **Flag lifecycle** — mark flags temporary; a derived new/active/stale status
  (from age + evaluation activity) surfaces cleanup candidates.
- **Outbound webhooks** — the audit log doubles as an event stream: every
  recorded entry is fanned out to subscribed organization webhooks and delivered as an
  HMAC-signed POST, with retry/backoff and a per-webhook delivery log.

All of the above are audited, and all are wired into the dashboard.

## Kubernetes notes

- Run 2+ replicas behind a Service; they're stateless apart from the cache.
- Set `INSTANCE_ID` from the downward API (`metadata.name`) so logs and pub/sub
  events are attributable per pod.
- Wire `/healthz` → `livenessProbe`, `/readyz` → `readinessProbe`.
- `SIGTERM` triggers graceful shutdown within `SERVER_SHUTDOWN_TIMEOUT`.
- Put `JWT_SECRET`, `POSTGRES_PASSWORD`, and `REDIS_PASSWORD` in a Secret.
- Set `PUBLIC_URL` to the externally reachable base URL so generated flag-trigger
  webhook URLs point at the right host.
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
