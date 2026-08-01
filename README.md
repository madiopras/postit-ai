# PostIt AI

PostIt AI adalah aplikasi RAG berbasis Next.js, PostgreSQL, dan PGVector untuk
chat atas FAQ dan SOP perusahaan. Aplikasi menyediakan akses chat publik,
kontrol akses SOP, versioning dan attachment indexing, Admin/User Management,
AI Configuration, serta audit log.

## First setup

Prasyarat:

- Node.js 22
- npm
- Docker dengan Docker Compose
- OpenSSL
- endpoint OpenAI-compatible untuk embedding dan chat jika ingin menjalankan
  indexing atau chat AI

Jalankan:

```bash
make setup ADMIN_PASSWORD='gunakan-password-kuat-minimal-12-karakter'
make dev
```

`make setup` menjalankan alur berikut secara berurutan:

1. memeriksa tool wajib;
2. menjalankan `npm ci`;
3. membuat `.env` dari `.env.example` jika belum tersedia;
4. membuat `JWT_SECRET` dan `CONFIG_ENCRYPTION_KEY` lokal secara acak;
5. menyalakan PostgreSQL/PGVector;
6. menunggu database siap;
7. menerapkan seluruh migration;
8. membuat akun Super Admin pertama.

Password Super Admin tidak disimpan atau dicetak oleh Makefile. Username
default adalah `admin`; ubah dengan:

```bash
make setup ADMIN_USERNAME='superadmin' ADMIN_PASSWORD='password-kuat-anda'
```

Sample FAQ/SOP bersifat opsional karena memanggil embedding endpoint:

```bash
make seed
```

## Environment

`.env.example` adalah template resmi. Variabel utama:

| Variable | Kegunaan |
|---|---|
| `DATABASE_URL` | Koneksi PostgreSQL aplikasi dan migration |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Provisioning container database |
| `JWT_SECRET` | Penandatanganan session |
| `CONFIG_ENCRYPTION_KEY` | Enkripsi API key dalam database |
| `ROUTER_BASE_URL`, `ROUTER_API_KEY` | Endpoint dan credential OpenAI-compatible |
| `EMBEDDING_MODEL` | Model embedding 1536 dimensi |
| `LLM_MODEL` | Model chat completion |

Jangan commit `.env`. Backup `CONFIG_ENCRYPTION_KEY` melalui secret manager;
kehilangan key tersebut membuat credential AI tersimpan tidak dapat didekripsi.

## Perintah Make

```bash
make help
make dev
make migrate
make seed
make lint
make typecheck
make test
make test-e2e
make build
make validate
make db-down
```

Migration tetap menjadi sumber kebenaran schema. Gunakan `make migrate` atau
`npm run db:migrate`; jangan gunakan `db:push` untuk deployment.

## Testing

Unit dan integration tests:

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

Jika host tidak memiliki library browser, gunakan runner resmi tanpa memasang
package OS:

```bash
make test-e2e-docker
```

Evaluasi kualitas retrieval terhadap knowledge seed:

```bash
make eval-retrieval
```

Runner memerlukan knowledge dari `scripts/seed.ts` yang sudah ter-index. Untuk
knowledge environment lain, gunakan dataset yang sesuai seperti dijelaskan di
[`evaluations/README.md`](evaluations/README.md).

E2E memulai development server secara otomatis dan memverifikasi:

- chat dapat dibuka tanpa login;
- dashboard mengarahkan visitor anonim ke login;
- readiness endpoint sehat dan tidak membuka detail internal.

## Deployment

Build aplikasi:

```bash
npm run db:migrate
docker compose --profile app up --build -d
curl --fail http://localhost:3000/api/health
```

Urutan deployment yang disarankan:

1. backup database;
2. sediakan environment production melalui secret manager;
3. jalankan migration sebagai one-off job;
4. build image dari commit yang sama;
5. deploy aplikasi;
6. tunggu `/api/health` mengembalikan `200`;
7. lakukan smoke test login, chat publik, SOP restricted, dan dashboard;
8. rollback image jika health/smoke test gagal. Migration tidak boleh dihapus
   atau diubah setelah pernah diterapkan.

Image production menggunakan Next.js standalone output dan berjalan sebagai
non-root user. `.env`, `.git`, test output, dan dependency lokal tidak masuk
build context.

### Production checklist

- Ganti seluruh credential development.
- Gunakan HTTPS dan reverse proxy tepercaya.
- Batasi akses PostgreSQL hanya dari jaringan aplikasi.
- Jalankan migration sebelum traffic dialihkan.
- Verifikasi akun Super Admin aktif dan password default tidak digunakan.
- Verifikasi konfigurasi embedding menghasilkan tepat 1536 dimensi.
- Verifikasi backup dan restore database.
- Pantau HTTP 5xx, latency AI provider, penggunaan token, audit-log failure,
  kapasitas database, dan status extraction/indexing.
- Untuk lebih dari satu instance, pindahkan rate limiter dan cache konfigurasi
  dari memory process ke shared store.

Audit dependency production harus bersih sebelum release:

```bash
npm audit --omit=dev
```

Audit lengkap masih dapat melaporkan advisory pada tool development
ESLint/Drizzle yang tidak memiliki upgrade kompatibel menurut npm. Tool tersebut
tidak disalin ke image standalone runtime; jangan menerima saran downgrade mayor
otomatis tanpa pengujian migration dan lint.

## Arsitektur singkat

```text
Pertanyaan pengguna
  -> embedding
  -> filter status, published version, dan hak akses
  -> PGVector + PostgreSQL full-text search
  -> reciprocal rank fusion
  -> retrieval ranking/configuration
  -> system prompt + behaviour/rules/dictionary
  -> LLM streaming
  -> citation dan persistence
```

SOP restricted difilter sebelum context dibentuk. Attachment hanya masuk
knowledge base setelah extraction berhasil dan versi SOP dipublikasikan.

## Troubleshooting

| Masalah | Pemeriksaan |
|---|---|
| Database belum siap | `docker compose ps` dan `make db-wait` |
| Migration gagal | periksa `DATABASE_URL`, lalu `npm run db:migrate` |
| Login gagal setelah setup | pastikan `ADMIN_PASSWORD` minimal 12 karakter dan akun aktif |
| Chat tidak menghasilkan jawaban | periksa AI Configuration atau `ROUTER_*` |
| Dokumen tidak ditemukan retrieval | periksa status publish/indexing dan similarity threshold |
| Playwright tidak menemukan browser | `npx playwright install chromium` |

Keputusan scope attachment Tahap 8—termasuk format legacy Office dan OCR yang
ditunda—didokumentasikan di
[`docs/enhancement/go2/stage-8-attachment-indexing.md`](docs/enhancement/go2/stage-8-attachment-indexing.md).
