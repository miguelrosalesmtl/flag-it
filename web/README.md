# web — Frontend

The feature-flag platform UI. Part of the monorepo (the Go backend lives at the
repo root).

## Talking to the API
- Base URL: `http://localhost:8080`, everything under `/api/v1`.
- Auth: `POST /auth/login` → `{ token }`; send `Authorization: Bearer <token>` on
  every other request. 401 → re-login, 403 → missing permission.
- Addressing: tenant by **slug**, project by **key**
  (e.g. `/api/v1/tenants/acme/projects/web/flags`).
- SDK-key endpoints (`/eval`, `/eval/all`, `/events`, `/eval/stream`) use the
  `X-SDK-Key` header instead of JWT.

## Typed client
Generate types/client from the backend's OpenAPI spec (kept in sync as endpoints
are added):

```bash
# types only
npx openapi-typescript ../docs/openapi.yaml -o src/api/types.ts
# or a full client: npx orval / openapi-generator against ../docs/openapi.yaml
```

Interactive API reference: run the backend and open `http://localhost:8080/docs`.

## CORS
The backend allows browser origins via `CORS_ALLOWED_ORIGINS` (default `*` in dev).
