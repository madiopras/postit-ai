SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help check-tools install env-init db-up db-wait db-down migrate \
	seed-admin seed seed-draft seed-reset setup start dev status \
	docker-up docker-down docker-logs \
	lint typecheck test test-e2e test-e2e-docker eval-retrieval build validate

help:
	@echo ""
	@echo "PostIt AI (by utaraSU) — Panduan Perintah Make"
	@echo "=============================================="
	@echo ""
	@echo "Setup Awal & Harian (Mode Development):"
	@echo "  make setup ADMIN_PASSWORD='password-kuat-12+'  Setup penuh pertama kali (install, .env, DB, migrate, admin)"
	@echo "  make start                                     Nyalakan PostgreSQL, tunggu siap, lalu jalankan dev server"
	@echo "  make dev                                       Jalankan Next.js dev server saja (http://localhost:3000)"
	@echo "  make status                                    Cek status container Docker & health check aplikasi"
	@echo ""
	@echo "Database & Knowledge Base:"
	@echo "  make db-up                                     Nyalakan container PostgreSQL/PGVector"
	@echo "  make db-wait                                   Tunggu PostgreSQL siap menerima koneksi"
	@echo "  make db-down                                   Hentikan container Docker Compose"
	@echo "  make migrate                                   Terapkan migrasi database terbaru"
	@echo "  make seed-admin ADMIN_PASSWORD='password-12+'  Buat akun Super Admin (opsional: ADMIN_USERNAME='admin')"
	@echo "  make seed                                      Isi, publish & embed 61 FAQ + 16 SOP contoh (butuh API AI)"
	@echo "  make seed-draft                                Isi 61 FAQ + 16 SOP contoh sebagai draft (tanpa API AI)"
	@echo "  make seed-reset                                Reset lalu isi ulang, publish & embed data contoh"
	@echo ""
	@echo "Mode Production (Docker Full-Stack):"
	@echo "  make docker-up                                 Jalankan migrasi lalu build & start app + DB di Docker"
	@echo "  make docker-down                               Hentikan seluruh service Docker (termasuk app)"
	@echo "  make docker-logs                               Lihat log container aplikasi secara live"
	@echo ""
	@echo "Validasi & Pengujian:"
	@echo "  make lint                                      Jalankan ESLint"
	@echo "  make typecheck                                 Jalankan TypeScript type check"
	@echo "  make test                                      Jalankan unit & integration tests (Vitest)"
	@echo "  make test-e2e                                  Jalankan browser E2E tests (Playwright lokal)"
	@echo "  make test-e2e-docker                           Jalankan E2E tests di image Playwright resmi"
	@echo "  make eval-retrieval                            Evaluasi akurasi retrieval terhadap knowledge seed"
	@echo "  make build                                     Build bundle produksi Next.js"
	@echo "  make validate                                  Jalankan lint, typecheck, test, E2E Docker, dan build"
	@echo ""

check-tools:
	@command -v node >/dev/null || { echo "❌ Node.js belum terpasang (butuh v22+)"; exit 1; }
	@command -v npm >/dev/null || { echo "❌ npm belum terpasang"; exit 1; }
	@command -v docker >/dev/null || { echo "❌ Docker belum terpasang"; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose v2 belum tersedia"; exit 1; }
	@command -v openssl >/dev/null || { echo "❌ OpenSSL belum terpasang"; exit 1; }
	@echo "✅ Semua prasyarat tersedia (node $$(node -v), npm $$(npm -v))"

install:
	npm ci

env-init:
	node scripts/init-env.mjs

db-up:
	docker compose up -d postgres

db-wait:
	@echo "⏳ Menunggu PostgreSQL siap..."
	@for attempt in {1..30}; do \
		if docker compose exec -T postgres sh -c 'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' >/dev/null 2>&1; then \
			echo "✅ PostgreSQL siap digunakan"; \
			exit 0; \
		fi; \
		sleep 2; \
	done; \
	echo "❌ PostgreSQL tidak kunjung siap. Cek dengan: docker compose logs postgres"; \
	exit 1

migrate:
	npm run db:migrate

seed-admin:
	@if [ -z "$(ADMIN_PASSWORD)" ] || [ "$${#ADMIN_PASSWORD}" -lt 12 ]; then \
		echo "❌ ADMIN_PASSWORD minimal 12 karakter wajib diisi."; \
		echo "   Contoh: make seed-admin ADMIN_PASSWORD='PasswordKuat123!'"; \
		exit 1; \
	fi
	@ADMIN_USERNAME="$(or $(ADMIN_USERNAME),admin)" ADMIN_PASSWORD="$(ADMIN_PASSWORD)" npm run seed:admin

seed:
	npm run seed

seed-draft:
	npm run seed -- --draft-only

seed-reset:
	npm run seed -- --reset

setup: check-tools install env-init db-up db-wait migrate seed-admin
	@echo ""
	@echo "✅ Setup awal PostIt AI selesai!"
	@echo "   1. Pastikan ROUTER_BASE_URL, ROUTER_API_KEY, EMBEDDING_MODEL, dan LLM_MODEL di .env sudah diisi."
	@echo "   2. (Opsional) Isi & embed contoh Knowledge Base: make seed"
	@echo "   3. Jalankan aplikasi: make start"

start: db-up db-wait dev

dev:
	npm run dev

status:
	@echo "=== Docker Containers ==="
	@docker compose ps
	@echo ""
	@echo "=== App Health Check ==="
	@if curl -fsS http://127.0.0.1:3000/api/health 2>/dev/null; then \
		echo " (port 3000)"; \
	elif curl -fsS http://127.0.0.1:3001/api/health 2>/dev/null; then \
		echo " (port 3001)"; \
	else \
		echo "Aplikasi belum berjalan di port 3000/3001"; \
	fi

docker-up: db-up db-wait migrate
	docker compose --profile app up --build -d
	@echo "✅ Aplikasi berjalan di http://localhost:3000 (cek log: make docker-logs)"

docker-down:
	docker compose --profile app down

docker-logs:
	docker compose --profile app logs -f app

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
