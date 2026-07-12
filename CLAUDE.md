# CLAUDE.md — backend (Go)

The frontend has its own rules in `web/CLAUDE.md`. This file governs the Go code.

## The one rule

**Business logic lives in services. Handlers are thin. SQL lives in the store.**

A violation is not a style nit — it is how partial writes, duplicated policy, and
untestable logic get in. The layers below are the whole architecture; keep code in
the layer it belongs to.

## Layers (dependencies point inward — toward `models`)

```
cmd  →  server  →  services  →  store  →  models
                   (auth, authz, flags, analytics)
```

| Layer | Package(s) | May contain | May NOT contain |
|-------|-----------|-------------|-----------------|
| **domain** | `internal/models` | structs + pure methods on them (e.g. `Subject.Can`) | any I/O, any dependency on other internal packages |
| **repository** | `internal/store` | SQL, transactions, row scanning | business rules, huma, HTTP |
| **service** | `internal/auth`, `internal/authz`, `internal/flags`, `internal/analytics` | business logic, orchestration, caching, the pure eval engine | huma/HTTP, hand-written SQL |
| **transport** | `internal/server` | huma operations, request/response mapping, authn/authz **enforcement**, audit calls | business workflows, domain policy, crypto, direct multi-write orchestration |

`models` imports nothing. `store` speaks only SQL. Services never import `huma`.
The `server` package is the only place that knows HTTP exists.

## What a handler may do (and nothing more)

A `server/*.go` operation handler is an adapter. Its entire job:

1. **Validate input shape** (presence, format — much of it via huma struct tags).
2. **Resolve** the URL to entities (`resolveTenant`/`resolveScope`/`resolveEnv`).
3. **Authorize** (`s.authorize(...)` / `s.requireSuperuser(...)`).
4. **Call ONE service method** — or a single trivial store CRUD for a plain
   read/write with no rules attached.
5. **Map** the result to the response DTO and record an **audit** entry.

If a handler does more than this, logic has leaked. In particular, a handler MUST NOT:

- **Orchestrate multiple writes.** Two `store.X()` writes in a handler is a bug —
  if the second fails, the first already committed. Move the whole thing into one
  **service method that wraps a `store` transaction** (see `store.AddMember`,
  `store.Bootstrap`). Partial writes are never acceptable.
- **Implement domain policy.** Reaching into `subject.TenantPerms[...]` /
  `subject.ProjectPerms[...]`, deciding what a role may do, filtering a list by
  permission — that belongs on `models.Subject` or an `authz` method (see
  `Subject.ReadableProjects`).
- **Do crypto.** No `bcrypt`, no `jwt`, no password hashing. Call `auth.Service`
  (`CreateUser`, `Login`, `Bootstrap`). The handler must never see a password hash.
- **Touch the eval engine internals.** No building `EvalEnv`, no bucketing. Call
  `flags.Service`.
- **Write SQL or use `pgx`/the pool.** Ever. That is the store's job.

## Services are transport-agnostic

A service returns **domain sentinel errors** (`auth.ErrSetupComplete`,
`authz.ErrUserNotFound`, `authz.ErrRoleScope`, `store.ErrNotFound`). The handler
maps them to HTTP with a small mapper (`storeError`, `authzError`). Services never
import `huma` and never decide status codes — that couples business logic to the
transport and makes it untestable off the HTTP path.

## Transactions live in the store

Multi-write atomicity is a persistence concern. The pattern (already in the code):
extract a `querier`-based helper (`insertMembership`, `assignTenantRole`,
`insertUser`, `insertTenantWithRoles`) that runs against either the pool or a
`pgx.Tx`, then add a `Store` method that opens a transaction and composes the
helpers (`store.AddMember`, `store.GrantProjectRole`, `store.Bootstrap`,
`store.CreateTenant`). The service calls that one method; the store guarantees
all-or-nothing.

## Where does X go? (decision table)

- "It hashes a password / signs a token" → `auth`
- "It decides whether a subject may do something" → `models.Subject` (pure) or `authz`
- "It writes two rows that must both succeed" → a `store` method with a tx, called by a service
- "It reads/writes one row, no rules" → a `store` method, called directly by the handler
- "It evaluates a flag" → `flags` (pure functions; the `Service` loads data and calls them)
- "It turns an error into a 4xx/5xx" → the handler (via a mapper); never the service
- "It parses JSON / registers a route / writes an audit entry" → `server`

## Before you finish

```bash
gofmt -l internal/ cmd/     # must print nothing
go vet ./...
go test ./...
make openapi                # regenerate docs/openapi.yaml if any API shape changed
```

Regenerate the OpenAPI spec whenever an operation's input/output changes — it is
generated from the code, so it must never be hand-edited or left stale.
