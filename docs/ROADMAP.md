# Feature-Flag Platform — Roadmap & Reference

A self-hosted, multi-tenant feature-flag platform inspired by LaunchDarkly. We are
**not** wire-compatible with LaunchDarkly and do **not** depend on their code — the
goal is **feature parity with LaunchDarkly plus improvements** (notably true
multi-tenancy), built our own way.

This document is both a **reference** (what LaunchDarkly does, reverse-engineered
from their docs and open-source SDKs) and a **living roadmap** (what we build, in
order). Check items off as we go.

**Status legend:** ✅ built · 🟡 foundation exists / partial · ❌ not yet

**Where we are (2026-07):** backend milestones complete through **Phase 6**. The
**Web UI dashboard** (a Phase 8 item) is built for the full management surface, plus
a **Contexts inspector** (new work beyond the original phases — migration 00013).
**Phase 7 (governance)** is underway: **approval workflows** (change requests,
reviewed before they apply — migration 00014) and **scheduled changes** (applied
automatically at a future time by a background scheduler — migration 00015) both
ship. Not started: the rest of Phase 7 (flag triggers, flag lifecycle) and the
rest of **Phase 8** (integrations,
SSO/SCIM, teams, data export, CLI). Deferred: A/B experimentation (P6), JS SDK (P4),
private attributes (P1), and the scaling/hardening list.

---

## 1. Where we stand today

The **infrastructure spine is largely done**; the **product surface** is thin.

Built & verified:
- ✅ Multi-tenant schema (tenants → projects → environments), Postgres 18, `uuidv7()` PKs
- ✅ RBAC: superuser / tenant_admin / project writer·reader (live-tested, 12/12 cases)
- ✅ Per-environment flag config (`flags` + `flag_environments`)
- ✅ In-memory per-environment cache + Redis pub/sub propagation across replicas
- ✅ goose migrations, embedded, verified against real PG18 (apply + full rollback)
- ✅ Settings module, structured logging, graceful shutdown, `migrate` subcommand
- ✅ Basic HTTP: evaluate (via SDK key → environment), flag CRUD (ID-addressed, no auth yet)

Thin / missing: rich targeting, segments, contexts, real SDKs, delivery protocol,
analytics, governance, integrations, UI.

---

## 2. Architecture reference (how LaunchDarkly works)

Two **different** SDK architectures. The open-source **LaunchDarkly Relay Proxy**
(`launchdarkly/ld-relay`) is a working reference server for both.

### Server-side SDKs (Go, Node, Python, …)
The SDK streams the **entire ruleset** and evaluates **in-process** — no per-request
network call at flag-check time.
- Streaming (default): SSE `GET /all` → `put` (full `{flags, segments}`), then
  `patch` / `delete` deltas (each carries a `path` like `/flags/{key}` and a `version`)
- Polling (fallback): `GET /sdk/latest-all` → `{flags, segments}`
- Events: `POST /bulk` (JSON array of events)
- Auth: `Authorization: <sdk-key>` header

### Client-side SDKs (browser, mobile)
The **server evaluates** and returns a per-flag value map; the SDK just stores it.
- `GET`/`REPORT /sdk/evalx/{clientSideId}/contexts/{base64Context}`
  → `{ "<flagKey>": { "value", "variation", "version", "flagVersion", "reason" } }`
- Streaming via a separate host; context is base64url-encoded in the URL
- Credentials: **public client-side ID** (in URL) or **mobile key** (header)
- `clientSideAvailability: { usingEnvironmentId, usingMobileKey }` gates flag exposure

### Our chosen model — SERVER-SIDE EVALUATION ONLY (decided)
Evaluation always runs on **our backend**; we never ship the ruleset to clients.
Clients send a context, we evaluate and return values. Rationale: keeps customers'
targeting rules on our infra (never exposed to untrusted clients), keeps the engine
internal, and centralizes audit/control. Implications:
- The engine stays in `internal/` (not extracted to a shared SDK package).
- SDKs are **thin clients** that call the eval endpoint + cache values locally — they
  do NOT embed the engine or receive the ruleset.
- Delivery (Phase 4) = server-side eval endpoints + per-context value caching/streaming,
  NOT ruleset streaming. Key endpoint: **batch "evaluate all flags for a context"**
  (returns `{flagKey: value}`), so clients avoid a round-trip per flag.
- Untrusted clients only ever receive evaluated values (gated by `clientSideAvailability`),
  never rules.

---

## 3. Feature catalog (parity target vs. current status)

### 3.1 Flag model & types
- ✅ Multivariate flags — arbitrary JSON variations (boolean/string/number/JSON)
- ✅ Per-environment on/off + config; version bumping
- 🟡 Name / description
- ❌ Tags
- ❌ Maintainer / owner
- ❌ Temporary vs permanent flags
- ❌ Archiving / stale-flag detection / lifecycle

### 3.2 Targeting & evaluation — *core value, biggest gap*
- ✅ Individual targeting (context key → variation)
- ✅ Percentage rollout (ours 0–100; LD 0–100000 with `bucketBy`/`seed`)
- 🟡 Fallthrough / default variation
- ✅ Evaluation reasons returned
- ❌ Targeting **rules** (ordered rules of ANDed **clauses**)
- ❌ **Operators** (14 — see Appendix A)
- ❌ **Segments** (reusable lists + rule-based + "big segments")
- ❌ **Prerequisites** (flag gated on another flag's result)
- ❌ **Multi-kind contexts** (user/org/device), attribute references, **private attributes**

### 3.3 Projects / environments / keys
- ✅ Projects → environments; per-env config
- ✅ Auto-seeded default environments (production, staging)
- 🟡 Per-env credentials (`sdk_keys` table, server/client kinds)
- ❌ Distinct SDK key + mobile key + public client-side ID model
- 🟡 Key rotation (schema supports `revoked_at`; no API yet)

### 3.4 SDK & delivery
- 🟡 Change propagation backbone (Redis pub/sub → per-env cache reload)
- ❌ Streaming endpoint for SDKs (SSE)
- ❌ Polling endpoint
- ❌ Actual SDKs (server + client)
- ❌ Bootstrap / offline mode

### 3.5 Experimentation & analytics
- ❌ A/B testing / experiments / metrics / statistical results
- ❌ Flag evaluation analytics / insights
- ❌ Event ingestion pipeline (summary / index / feature events)

### 3.6 Workflow & governance
- ✅ Approval workflows
- ✅ Scheduled changes (flag triggers / inbound webhooks still pending)
- ❌ Audit log / change history
- ❌ Comments on changes
- ❌ Code references

### 3.7 Access control & admin — *foundation is ahead of a fresh start*
- ✅ RBAC v2: **dynamic per-tenant roles** = permission bundles + scoped assignments
      (superseded the hardcoded tenant_admin/writer/reader model)
- ✅ Permission vocabulary; `Subject.Can(permission, resource)`; tenant/project scopes
- ✅ Seeded system roles per tenant (tenant_admin/writer/reader) + **custom roles**
- ✅ **True multi-tenancy** with cross-tenant superuser (improvement over LD)
- ✅ JWT auth kept **pluggable** (OIDC seam planned — authenticator maps token→userID)
- ❌ Teams
- ❌ Level-3 policy engine (resource patterns, allow/deny) — evolve from current bundles
- ❌ SSO / SCIM (via the OIDC seam)

### 3.8 Platform / integrations
- ✅ Full management API (our own, key-addressed) + auto-generated OpenAPI
- ✅ Full keys-based CRUD API
- ✅ Web UI dashboard (React SPA, `web/` — full management surface)
- ❌ Webhooks
- ❌ Integrations (Slack / Jira / Datadog / Terraform)
- ❌ Data export
- ❌ CLI (beyond `migrate` / `createsuperuser`)

---

## 4. Improvements over LaunchDarkly (our differentiators)

- **Native multi-tenancy** — platform hosts many orgs; cross-tenant superuser. LD's
  "account" is single-tenant per customer.
- **Postgres as auditable source of truth** — SQL-queryable history, easy data
  residency and self-hosting.
- **Unified context model from day one** — LD bolted multi-context onto a legacy
  "user" model; we design it clean, no legacy baggage.
- **First-class self-hosting** — simpler operations, open, no per-seat pricing pressure.
- Opportunity for **saner rollout math** and clearer defaults.

---

## 5. Implementation roadmap (step by step)

Ordered by value. Each phase should ship with migrations, tests, and a live check.

### Phase 0 — Finish the current spine ✅ COMPLETE
- [x] End-to-end verify flags rework (2 replicas, pub/sub propagation) against live PG+Redis
- [x] JWT auth (bcrypt passwords, login, token-verify middleware) + `createsuperuser` command
- [x] Put management routes behind RBAC (authz middleware; verified 401/403 live)
- [x] HTTP CRUD for tenants / projects / environments / users / memberships / role grants
- [x] **Authz v2 — dynamic per-tenant roles** (permission bundles + scoped assignments;
      seeded system roles + custom roles; migration 00006; live-verified, incl. HTTP)
- [x] authN: own login with a **pluggable OIDC seam** (`tokenVerifier` interface; defaults
      to our JWT — swap in an OIDC verifier later without touching authz)
- [x] **SDK-key management endpoint** (mint/list/revoke per environment; `sdk_key.manage`;
      full lifecycle live-verified — mint→eval→revoke→401)
- [x] update/delete verbs (users/tenants/projects), list-users, and **filtered project
      listing** (project-scoped users see only their granted projects)

> Deferred to when a real IdP is wired: an actual OIDC verifier implementation (the seam
> is in place). SDK keys are stored in plaintext (they're bearer tokens looked up by value);
> masking/rotation UX is a later refinement.

### Phase 1 — Rich targeting (highest value) ✅ CORE COMPLETE
- [x] Context model: multi-kind contexts (`kind`, `key`, attributes, nested attribute refs)
- [ ] Private attributes (`_meta.privateAttributes` parsed but redaction not implemented)
- [x] Targeting **rules**: ordered rules, each a set of ANDed **clauses** (first match wins)
- [x] **Operators** (Appendix A): all 14 (`in`, string, regex, numeric, date, `semVer*`;
      `segmentMatch` stubbed until Phase 2)
- [x] Rollouts: weights 0–100000, `bucketBy`, `seed`; SHA-1 bucketing (Appendix B)
- [x] `fallthrough` as variation-or-rollout
- [x] Evaluation reasons: OFF / TARGET_MATCH / RULE_MATCH / FALLTHROUGH
      (PREREQUISITE_FAILED comes with Phase 3)
- [x] Reworked `flag_environments` + evaluator (migration 00007; salt on flags);
      batch "evaluate all flags for a context" endpoint; live-verified end to end
- [x] Engine kept server-side (`internal/`), per the server-side-eval decision

### Phase 2 — Segments ✅ COMPLETE
- [x] Segment entity: `included` / `excluded` (+ per-kind contexts) + rule-based membership
      (migration 00008; project-scoped, shared across the project's environments)
- [x] `segmentMatch` operator wired into clause evaluation (with a cycle guard for
      nested segment references)
- [x] Percentage segments (weighted membership via the shared SHA-1 bucketing)
- [x] Cache holds segments per environment; management endpoints; live-verified end to end
- [ ] (Later) "big segments" (externally-stored membership for unbounded lists)

### Phase 3 — Prerequisites ✅ COMPLETE
- [x] Prerequisite entity (flag key + required variation); per-environment config
      (migration 00009)
- [x] Gating logic (prereq must be on AND serve the required variation, not an
      off/failed path); circular-reference guard; PREREQUISITE_FAILED reason
- [x] Evaluator bundles flags+segments into `EvalEnv` (also the cache unit);
      live-verified end to end (gate on/off flips the dependent flag)

### Phase 4 — Delivery & SDKs (SERVER-SIDE EVAL ONLY) ✅ CORE COMPLETE
- [x] Batch eval endpoint: "evaluate all flags for a context" → `{flagKey: value}` (`/eval/all`)
- [x] `clientSideAvailability` gating — per-flag `client_side_available` (default false =
      server-only); client-kind SDK keys only see opted-in flags (migration 00010; live-verified)
- [x] Streaming of updated *evaluated values per context* — SSE endpoint
      `GET /api/v1/eval/stream` (raw handler, browser-friendly via ?sdk_key=&context=),
      pushes on env change via an in-process notifier fed by the pub/sub reload path;
      also fixed a systemic double-reload (skip self-published events). Live-verified.
- [x] Thin **Go SDK** (`pkg/ffclient`): Evaluate / AllFlags / Bool·StringVariation /
      Watch (SSE). No engine, no ruleset. Live-verified.
- [x] Bootstrap — `AllFlags` is the primitive (call server-side, inline the map into a page)
- [ ] JS SDK (Go SDK done; JS still to write)

Also: the whole HTTP layer is now **huma** (typed ops → auto-generated OpenAPI at
`/docs`, `/openapi.yaml`; `make openapi`).

### Phase 5 — Management API & audit  ✅ COMPLETE
- [x] **Semantic patch instructions** — `PATCH .../flags/{key}/environments/{env}` with
      `{comment?, instructions:[{kind,...}]}`. 11 kinds (turnFlagOn/Off, updateOffVariation,
      updateFallthrough{Variation,Rollout}, add/removeTargets, add/removeRule,
      add/removePrerequisite). Surgical, concurrency-friendly, captures intent. Unit + e2e.
- [x] **Audit log** — append-only `audit_log` (migration 00011); recorded best-effort from
      the write handlers (actor from ctx, secret-safe), queryable `GET /tenants/{t}/audit`
      (filters: project/resource/before; `audit.read` permission). Live-verified (secret
      not leaked, RBAC enforced, comment + actor captured).
- [x] **Keys-based CRUD** — the whole management API is now key-addressed:
      `/tenants/{tenantSlug}/projects/{projectKey}/...` (was UUIDs). Handlers resolve
      slug/key → internal IDs at the edge; authz/audit/store unchanged. All e2e re-verified.

> Note: audit recording is best-effort (logged on failure, doesn't fail the write). A
> future refinement is to record in the same transaction as the change.
> API-contract change (for the UI): tenant is addressed by **slug**, project by **key** —
> `/api/v1/tenants/{tenantSlug}/projects/{projectKey}/...`.

### Phase 6 — Events & analytics  ✅ CORE COMPLETE
- [x] **Rolled-up evaluation counters** — server-side eval accumulates counts in memory
      (`internal/analytics`) and flushes to `flag_eval_stats` on an interval
      (`ANALYTICS_FLUSH_INTERVAL`; migration 00012). One row per flag/variation/window —
      volume stays bounded regardless of eval rate (the summary approach).
- [x] **Event ingestion** — `POST /api/v1/events` (SDK key auth) accepts client-pushed
      summaries for streaming/local-cache clients; feeds the same counters.
- [x] **Analytics query** — `GET .../flags/{key}/environments/{env}/stats?since=` →
      per-variation counts + total (requires flag.read). Live-verified.
- [x] **Contexts inspector** — contexts seen during evaluation are recorded
      (`internal/contexts`: buffered in memory, flushed to the `contexts` table on an
      interval; migration 00013), off the eval hot path like the counters. Endpoints list
      them per environment (searchable) and show a context's attributes + **expected
      variations** (every flag evaluated for that stored context). Surfaced in the UI.
- [ ] **Analytics / monitoring UI** — the eval telemetry is collected and queryable
      (per-flag `flag-stats` endpoint), but not yet surfaced. Needed: a flag-detail
      **Monitoring** view (per-variation counts + total over a selectable window: 1h/24h/7d)
      and an **eval-count column** on the flag list (the latter needs a small bulk
      per-environment stats endpoint; the current one is per-flag). Optional: sparklines.
- [ ] Experimentation (A/B tests, metrics, statistical results) — deferred (large; builds
      on these counters + a metrics model)

### Phase 7 — Governance
- [x] **Approval workflows** — propose a flag change as a set of semantic
      instructions (a change request) that a reviewer must approve before it is
      applied. Backend `governance` service + `change_requests` table; management
      API create/list/approve/reject under a project; approving reuses the flag
      service's instruction path. UI: project **Approvals** screen (filter by
      status, approve/reject) + "Request change" dialog on the flag detail page.
      Audited as `change.requested` / `change.approved` / `change.rejected`.
- [x] **Scheduled changes** — schedule a set of semantic instructions to apply
      to a flag's environment config at a future time (migration 00015). A
      background scheduler in the `governance` service applies due changes on an
      interval (`SCHEDULED_CHANGE_INTERVAL`); pending ones can be cancelled.
      Management API create/list/cancel under a project. UI: "Schedule change"
      dialog + a scheduled-changes card on the flag detail page. Audited as
      `change.scheduled` / `change.schedule.cancelled`. (Flag *triggers* — inbound
      webhook URLs — still pending.)
- [ ] Flag lifecycle (temporary flags, stale detection, code references)

### Phase 8 — Platform
- [ ] Webhooks + integrations (Slack / Jira / Datadog / Terraform)
- [ ] SSO / SCIM, teams
- [x] Custom roles — create per-tenant permission-bundle roles (UI permission picker)
- [ ] Data export
- [x] **Web UI dashboard** — React + TypeScript SPA (`web/`) over the management API,
      covering the full surface: first-run setup wizard, login/JWT session, tenants →
      projects, an LD-style project sidebar with a project switcher, environment-aware flag
      list (inline per-env toggles + server-side search), flag detail (on/off, default rule,
      individual targets, clause-based targeting rules), create-flag; segments (create +
      detail with individual targets and a clause/rule editor); a Contexts inspector;
      environments (list + create); and a Settings area (SDK keys, general, projects, roles
      with a permission picker, members). Strictly layered (api → hook → container →
      component → ui, boundary-linted) with Playwright e2e throughout.
- [ ] CLI (management CLI still to write)

---

## Scaling / hardening (cross-cutting)

For high concurrent client counts (streaming + local cache is the scalable path;
per-call eval does not scale to hundreds of thousands):
- [x] **SDK-key in-memory cache** — removes the per-eval Postgres lookup (TTL cache,
      flush-on-revoke; `SDK_KEY_CACHE_TTL`, default 30s). Highest-leverage fix.
- [ ] SSE fan-out hardening: push diffs (not full snapshots), coalesce notify bursts,
      cap/shard connections per env (thundering-herd guard on frequent flag flips)
- [ ] Server-side connection limits + backpressure + graceful drain (for many SSE conns)
- [ ] Rate limiting on eval endpoints
- [ ] Shard the flag cache by tenant/env (memory grows with total flags across all tenants)
- [ ] Load test (k6/vegeta) to find the real per-replica ceiling

---

## Appendix A — Targeting operators (LaunchDarkly reference)

Clause = `{ contextKind, attribute, op, values[], negate }`. Match if the attribute
matches **any** value (OR); `negate` inverts. A missing attribute is always a
non-match (negate does not flip that).

| `op` | Semantics |
|---|---|
| `in` | Equals (type-sensitive) |
| `startsWith` / `endsWith` / `contains` | String prefix / suffix / substring |
| `matches` | Regex match |
| `lessThan` / `lessThanOrEqual` | Numeric `<` / `<=` |
| `greaterThan` / `greaterThanOrEqual` | Numeric `>` / `>=` |
| `before` / `after` | Timestamp (RFC3339 string or Unix millis) `<` / `>` |
| `semVerEqual` / `semVerLessThan` / `semVerGreaterThan` | Semantic-version compare |
| `segmentMatch` | Context is a member of any listed segment |

---

## Appendix B — Bucketing algorithm (LaunchDarkly reference)

LaunchDarkly's deterministic percentage bucketing (from `go-server-sdk-evaluation`):

```
input  = seed ? "<seed>" : "<key>.<salt>"           // flag key + flag salt
input += "." + bucketByValue                          // default bucketBy = context key
hash   = sha1(input)                                  // SHA-1 of the bytes
bucket = int(hex(hash)[0:15], 16) / 0xFFFFFFFFFFFFFFF  // float in [0, 1)
```

Variation selection: walk weighted variations, `sum += weight/100000`; first bucket
where `bucket < sum` wins; the **last** variation catches any remainder. A missing
`bucketBy` attribute → bucket 0 → first variation.

> Our current implementation uses `fnv32a("key:ctx") % 100`. Phase 1 should move to a
> SHA-1-based scheme (or a deliberately-chosen better hash) with 0–100000 weights and
> `bucketBy`, so rollouts are stable and finely divisible.

---

## Appendix C — LaunchDarkly data model (field reference)

**FeatureFlag:** `key`, `version`, `on`, `variations[]` (arbitrary JSON),
`fallthrough` (variation | rollout), `offVariation`, `prerequisites[]`, `targets[]`,
`contextTargets[]`, `rules[]`, `salt`, `clientSideAvailability`, `trackEvents`,
`debugEventsUntilDate`.

**Rule:** `{ id, clauses[], variation | rollout, trackEvents }` — first match wins.

**Rollout:** `{ kind: rollout|experiment, contextKind, bucketBy, seed,
variations: [{ variation, weight (0–100000), untracked }] }`.

**Segment:** `key`, `version`, `included[]`, `excluded[]`, `includedContexts[]`,
`excludedContexts[]`, `rules[]` (each `{ id, clauses[], weight?, bucketBy?,
rolloutContextKind? }`), `salt`, `unbounded` (big segment), `generation`.

**Prerequisite:** `{ key, variation }` — passes only if the prereq flag is `on` and
its result variation index equals `variation`.

**Context (multi-kind):** single-kind `{ kind, key, ...attributes, _meta: {
privateAttributes[] } }`; multi-kind `{ kind: "multi", "<kind>": { key, ... }, ... }`.
Default kind is `user`. Legacy user model (no `kind`, nested `custom{}`) is
auto-converted.

---

## Sources

- LaunchDarkly Docs — SDK concepts, service endpoints, contexts, events
- `launchdarkly/ld-relay` `docs/endpoints.md` (v8) — exact SDK-facing endpoint list
- `launchdarkly/go-server-sdk-evaluation` `ldmodel/*` + evaluator — data model &
  bucketing (authoritative Go source)
- `launchdarkly/sdk-test-harness` `mockld` — evalx / stream payload shapes
- LaunchDarkly REST API docs / generated API-client docs — management API shapes
