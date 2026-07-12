# --- Build stage ---
FROM golang:1.26 AS build

WORKDIR /src

# Cache dependencies first.
COPY go.mod go.sum* ./
RUN go mod download

# Build a static binary so it runs on a scratch/distroless base.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server ./cmd/server

# --- Runtime stage ---
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app
COPY --from=build /out/server /app/server
# Migrations are handy to ship for reference / init jobs.
COPY --from=build /src/migrations /app/migrations

USER nonroot:nonroot
EXPOSE 8080

ENTRYPOINT ["/app/server"]
