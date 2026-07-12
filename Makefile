.PHONY: help tidy run build test vet fmt up down logs migrate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

tidy: ## Resolve and pin dependencies
	go mod tidy

run: ## Run the server locally (needs Postgres + Redis; see `make up`)
	go run ./cmd/server

build: ## Build the server binary into ./bin
	go build -o bin/server ./cmd/server

test: ## Run tests
	go test ./...

vet: ## Static analysis
	go vet ./...

fmt: ## Format code
	gofmt -w .

up: ## Start the full local stack (Postgres, Redis, 2 app replicas)
	docker compose up --build

down: ## Stop the stack and remove volumes
	docker compose down -v

logs: ## Tail app logs
	docker compose logs -f app app2

openapi: ## Regenerate docs/openapi.yaml from the code (huma-generated)
	go run ./cmd/server openapi > docs/openapi.yaml

web-install: ## Install frontend deps (web/)
	cd web && pnpm install

web-dev: ## Run the frontend dev server (web/)
	cd web && pnpm dev

web-build: ## Build the frontend for production (web/)
	cd web && pnpm build

migrate: ## Apply goose migrations to a running local Postgres
	go run ./cmd/server migrate up

migrate-status: ## Show migration status
	go run ./cmd/server migrate status

migrate-down: ## Roll back the most recent migration
	go run ./cmd/server migrate down
