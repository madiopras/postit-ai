# PostIt AI (by utaraSU)

**PostIt AI** adalah aplikasi asisten pengetahuan (RAG) berbasis **Next.js, PostgreSQL, dan PGVector** untuk menjawab pertanyaan seputar **FAQ dan SOP perusahaan** secara cepat, akurat, dan dilengkapi sitasi sumber.

Fitur utama:
- **Chat AI Publik & Internal:** Bisa langsung digunakan tanpa login untuk FAQ & SOP publik, serta otomatis melindungi SOP internal (`requiresLogin`) hingga pengguna login.
- **Manajemen Knowledge Base:** Kelola FAQ, SOP berversi (*versioning* & *rollback*), serta indexing lampiran dokumen (PDF, DOCX, XLSX, PPTX, TXT/MD).
- **Konfigurasi AI Fleksibel:** Pengaturan model embedding & LLM, persona, aturan respons, kamus istilah, dan parameter retrieval langsung dari dashboard.
- **Kontrol Akses & Audit:** Manajemen Pengguna, Admin/Super Admin, dan Audit Log keamanan.

---

## Panduan Cepat (Quick Start)

### 1. Prasyarat

Pastikan perangkat/server Anda sudah memiliki:
- **Node.js 22+** dan **npm**
- **Docker** dan **Docker Compose v2** (pastikan Docker daemon sudah menyala)
- **OpenSSL** & **GNU Make**
- **Endpoint AI OpenAI-compatible** (misalnya OpenRouter, OpenAI, Gemini via proxy/router, atau local router) untuk embedding dan chat completion

### 2. Siapkan File `.env`

Jika belum memiliki `.env`, buat otomatis dari template beserta secret acak:

```bash
make env-init
```

Lalu buka `.env` dan isi bagian endpoint AI Anda:

```env
ROUTER_BASE_URL=https://endpoint-ai-anda/v1
ROUTER_API_KEY=isi-api-key-anda
EMBEDDING_MODEL=openrouter/openai/text-embedding-3-small
LLM_MODEL=nama-model-chat-anda
```

> **Catatan:** Jika Anda sudah menyiapkan file `.env` sendiri, `make env-init` dan `make setup` tidak akan menimpanya.

### 3. Setup Pertama Kali

Jalankan satu perintah berikut (ganti password dengan password kuat minimal **12 karakter**):

```bash
make setup ADMIN_PASSWORD='GantiPasswordKuat12!'
```

Perintah `make setup` otomatis menjalankan seluruh tahap ini secara berurutan:
1. Memeriksa ketersediaan tool wajib (`node`, `npm`, `docker`, `docker compose`, `openssl`).
2. Menginstal dependensi (`npm ci`).
3. Membuat `.env` dari `.env.example` jika belum ada (sekaligus membuat `JWT_SECRET` dan `CONFIG_ENCRYPTION_KEY` acak).
4. Menyalakan container **PostgreSQL + PGVector** (`docker compose up -d postgres`).
5. Menunggu database siap menerima koneksi.
6. Menerapkan seluruh migrasi schema database (`npm run db:migrate`).
7. Membuat akun **Super Admin** pertama (username default: `admin`, password tidak pernah dicetak di log terminal).

Ingin username selain `admin`? Tambahkan `ADMIN_USERNAME`:

```bash
make setup ADMIN_USERNAME='superadmin' ADMIN_PASSWORD='GantiPasswordKuat12!'
```

### 4. Isi Contoh Knowledge Base (Opsional)

Untuk langsung mencoba AI dengan data contoh lengkap perusahaan (**61 FAQ + 16 SOP Coffe Gaul**, terdiri dari 11 SOP publik & 5 SOP internal berproteksi login):

```bash
# Memasukkan data, mempublikasikan, sekaligus meng-embed ke PGVector (butuh endpoint AI aktif)
make seed
```

Jika endpoint AI belum dikonfigurasi tetapi Anda ingin melihat isi data contoh di dashboard terlebih dahulu:

```bash
# Memasukkan data sebagai draft saja (tanpa memanggil API embedding)
make seed-draft
```

### 5. Jalankan Aplikasi

**Mode Development (Lokal):**

```bash
make start
```

Atau jika PostgreSQL sudah menyala:

```bash
make dev
```

**Mode Production (Docker Full-Stack):**

```bash
make docker-up
```

---

## Akses Aplikasi

Setelah berjalan, buka di browser:

| Halaman | URL Default | Kegunaan |
|---|---|---|
| **Chat AI** | `http://localhost:3000` | Halaman utama percakapan (publik & akun login) |
| **Login** | `http://localhost:3000/login` | Masuk untuk mengakses SOP internal & dashboard |
| **Admin Dashboard** | `http://localhost:3000/dashboard` | Kelola FAQ, SOP, Dokumen, User/Admin, AI Config, Audit Log |
| **Health Check** | `http://localhost:3000/api/health` | Status kesiapan aplikasi & koneksi PostgreSQL (`200 OK`) |

> **Tips:** Jika port `3000` sedang digunakan aplikasi lain saat menjalankan `make dev`, Next.js otomatis berpindah ke `http://localhost:3001`. Cek status dengan `make status`.

---

## Konfigurasi Environment (`.env`)

Template resmi tersedia di [`.env.example`](.env.example).

| Variable | Wajib | Kegunaan |
|---|---|---|
| `DATABASE_URL` | Ya | URL koneksi PostgreSQL aplikasi dan migrasi |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Ya | Kredensial provisioning container PostgreSQL di `docker-compose.yml` |
| `JWT_SECRET` | Ya | Secret penandatanganan token sesi login |
| `CONFIG_ENCRYPTION_KEY` | Ya | Kunci enkripsi AES-256-GCM untuk API key yang disimpan lewat dashboard |
| `ROUTER_BASE_URL`, `ROUTER_API_KEY` | Ya (untuk AI) | Endpoint dan API key OpenAI-compatible (`/embeddings` & `/chat/completions`) |
| `EMBEDDING_MODEL` | Ya (untuk AI) | Model embedding 1536 dimensi (model modern seperti OpenAI v3 & Gemini otomatis dikirim parameter `dimensions: 1536`) |
| `LLM_MODEL` | Ya (untuk AI) | Model chat completion yang dipakai menjawab pertanyaan |

> **Penting:** Jangan pernah commit `.env`. Simpan salinan `CONFIG_ENCRYPTION_KEY` di secret manager; kehilangan key ini membuat API key AI yang tersimpan di database tidak dapat didekripsi (harus diinput ulang di `/dashboard/config`).

---

## Daftar Perintah Make

Jalankan `make help` kapan saja untuk melihat seluruh perintah yang tersedia.

### Setup & Harian
```bash
make help                                       # Tampilkan daftar perintah
make setup ADMIN_PASSWORD='PasswordKuat12!'     # Setup awal lengkap dari nol
make start                                      # Nyalakan DB + jalankan dev server
make dev                                        # Jalankan Next.js dev server saja
make status                                     # Cek status container & health check
```

### Database & Knowledge Base
```bash
make db-up                                      # Nyalakan PostgreSQL/PGVector
make db-wait                                    # Tunggu PostgreSQL siap
make db-down                                    # Hentikan container database
make migrate                                    # Terapkan migrasi database
make seed-admin ADMIN_PASSWORD='PasswordKuat12!'# Buat akun Super Admin
make seed                                       # Seed, publish & embed 61 FAQ + 16 SOP contoh
make seed-draft                                 # Seed contoh sebagai draft (tanpa API AI)
make seed-reset                                 # Reset & seed ulang data contoh
```

### Docker Production
```bash
make docker-up                                  # Migrate + build & jalankan app + DB di Docker
make docker-down                                # Hentikan seluruh container (termasuk app)
make docker-logs                                # Pantau log aplikasi Docker
```

### Validasi & Pengujian
```bash
make lint                                       # ESLint
make typecheck                                  # TypeScript type check
make test                                       # Unit & integration tests (Vitest)
make test-e2e                                   # Browser E2E tests (Playwright lokal)
make test-e2e-docker                            # E2E tests via image Playwright resmi
make eval-retrieval                             # Evaluasi akurasi retrieval
make build                                      # Build produksi Next.js
make validate                                   # Jalankan seluruh pemeriksaan sekaligus
```

> **Aturan Schema:** Migrasi adalah satu-satunya sumber kebenaran schema database. Selalu gunakan `make migrate` atau `npm run db:migrate`; hindari `db:push` pada environment produksi.

---

## Testing

Menjalankan unit & integration tests dengan environment `.env`:

```bash
set -a
. ./.env
set +a
npm test
```

Browser E2E pertama kali memerlukan Chromium:

```bash
npx playwright install chromium
make test-e2e
```

Atau jalankan tanpa memasang library browser di host menggunakan Docker:

```bash
make test-e2e-docker
```

Evaluasi kualitas retrieval dijelaskan lebih rinci di [`evaluations/README.md`](evaluations/README.md).

---

## Deployment Production

Langkah cepat menjalankan container produksi lokal/server:

```bash
make docker-up
curl --fail http://localhost:3000/api/health
```

Urutan deployment production yang disarankan:
1. Backup database terlebih dahulu.
2. Sediakan seluruh environment production melalui secret manager.
3. Jalankan migrasi (`npm run db:migrate`) sebagai one-off job sebelum traffic dialihkan.
4. Build image dari commit yang sama (`docker compose --profile app build`).
5. Deploy aplikasi dan verifikasi `GET /api/health` mengembalikan `200 OK`.
6. Lakukan smoke test: login admin, chat publik, akses SOP internal (`requiresLogin`), dan dashboard.
7. Jangan pernah menghapus atau mengubah file migrasi yang sudah diterapkan.

### Checklist Keamanan Production
- Ganti seluruh kredensial development (`POSTGRES_PASSWORD`, `JWT_SECRET`, `CONFIG_ENCRYPTION_KEY`, password admin).
- Gunakan HTTPS di balik reverse proxy tepercaya (Nginx/Caddy/Cloudflare).
- Batasi akses port PostgreSQL (`5432`) agar tidak terbuka ke internet publik.
- Pastikan model embedding menghasilkan tepat `1536` dimensi.
- Jalankan audit dependensi produksi (`npm audit --omit=dev`) sebelum rilis.
- Untuk deployment multi-instance, pindahkan rate limiter dan cache konfigurasi dari in-memory process ke shared store (Redis).

---

## Arsitektur Singkat

```text
Pertanyaan pengguna
  -> embedding (1536 dimensi)
  -> filter status published, versi SOP aktif, & hak akses (publik vs login)
  -> PGVector cosine similarity + PostgreSQL full-text search
  -> Reciprocal Rank Fusion (RRF) & retrieval ranking
  -> system prompt + AI persona / rules / dictionary
  -> LLM streaming response
  -> sitasi sumber & penyimpanan riwayat percakapan
```

SOP dengan status `requiresLogin = true` difilter di level query sebelum konteks dikirim ke LLM, sehingga konten internal tidak pernah bocor ke sesi visitor anonim. Dokumentasi scope indexing lampiran tersedia di [`docs/enhancement/go2/stage-8-attachment-indexing.md`](docs/enhancement/go2/stage-8-attachment-indexing.md).

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Docker gagal terhubung (`docker.sock`) | Pastikan Docker Desktop / `dockerd` sudah berjalan, lalu cek `docker compose ps`. |
| Port `3000` sudah dipakai aplikasi lain | Next.js dev server otomatis memakai port `3001` (`http://localhost:3001`), atau hentikan proses lain di port `3000`. |
| `make seed-admin` ditolak | Pastikan `ADMIN_PASSWORD` minimal 12 karakter, contoh: `make seed-admin ADMIN_PASSWORD='PasswordKuat12!'`. |
| Database belum siap / migrasi gagal | Jalankan `make db-up && make db-wait`, periksa kecocokan `DATABASE_URL` dengan `POSTGRES_*` di `.env`, lalu `make migrate`. |
| Chat tidak menjawab / `make seed` gagal embed | Pastikan `ROUTER_BASE_URL`, `ROUTER_API_KEY`, `EMBEDDING_MODEL`, dan `LLM_MODEL` aktif di `.env` atau `/dashboard/config`. |
| Login ke `/dashboard` gagal | Pastikan akun Super Admin sudah dibuat via `make seed-admin` dan status akun `active`. |
| Dokumen tidak muncul saat dicari AI | Pastikan status FAQ/SOP sudah `published` (bukan `draft`), tidak terblokir `requiresLogin`, dan similarity threshold di `/dashboard/config` tidak terlalu tinggi. |
| Playwright gagal mencari browser | Jalankan `npx playwright install chromium` atau gunakan `make test-e2e-docker`. |
