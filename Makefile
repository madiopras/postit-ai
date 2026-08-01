SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help check-tools install env-init db-up db-wait migrate seed-admin seed setup dev \
	lint typecheck test test-e2e test-e2e-docker eval-retrieval build validate db-down

help:
	@echo "PostIt AI development commands"
	@echo "  make setup ADMIN_PASSWORD='strong-password'  First-time setup"
	@echo "  make dev                               Start development server"
	@echo "  make migrate                           Apply pending migrations"
	@echo "  make seed                              Seed sample FAQ/SOP (needs AI endpoint)"
	@echo "  make test-e2e                          Run browser E2E tests"
	@echo "  make test-e2e-docker                   Run E2E in official browser image"
	@echo "  make eval-retrieval                    Evaluate retrieval against seed knowledge"
	@echo "  make validate                          Lint, typecheck, tests, E2E, build"

check-tools:
	@command -v node >/dev/null || { echo "Node.js is required"; exit 1; }
	@command -v npm >/dev/null || { echo "npm is required"; exit 1; }
	@command -v docker >/dev/null || { echo "Docker is required"; exit 1; }
	@docker compose version >/dev/null || { echo "Docker Compose is required"; exit 1; }
	@command -v openssl >/dev/null || { echo "OpenSSL is required"; exit 1; }

install:
	npm ci

env-init:
	node scripts/init-env.mjs

db-up:
	docker compose up -d postgres

db-wait:
	@echo "Waiting for PostgreSQL..."
	@for attempt in {1..30}; do \
		if docker compose exec -T postgres sh -c 'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' >/dev/null 2>&1; then \
			echo "PostgreSQL is ready"; \
			exit 0; \
		fi; \
		sleep 2; \
	done; \
	echo "PostgreSQL did not become ready"; \
	exit 1

migrate:
	npm run db:migrate

seed-admin:
	@if [ -z "$(ADMIN_PASSWORD)" ] || [ "$${#ADMIN_PASSWORD}" -lt 12 ]; then \
		echo "ADMIN_PASSWORD with at least 12 characters is required"; \
		echo "Example: make setup ADMIN_PASSWORD='your-strong-password'"; \
		exit 1; \
	fi
	ADMIN_USERNAME="$(or $(ADMIN_USERNAME),admin)" ADMIN_PASSWORD="$(ADMIN_PASSWORD)" npm run seed:admin

seed:
	npm run seed

setup: check-tools install env-init db-up db-wait migrate seed-admin
	@echo "First-time setup complete. Run: make dev"
	@echo "Sample knowledge data is optional: make seed"

dev:
	npm run dev

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm test

test-e2e:
	npx playwright test

test-e2e-docker:
	docker run --rm --network host \
		--user "$$(id -u):$$(id -g)" \
		-e HOME=/tmp \
		--env-file .env \
		-v "$(CURDIR):/work" -w /work \
		mcr.microsoft.com/playwright:v1.62.0-noble npm run test:e2e

eval-retrieval:
	npm run eval:retrieval

build:
	npm run build

validate: lint typecheck test test-e2e-docker build

db-down:
	docker compose down
