# Chat Retrieval Enhancement — Tahap 1–4

## Tujuan

Meningkatkan kemampuan Chat PostIT AI dalam menemukan dan menjawab informasi
yang tersedia pada FAQ dan SOP, termasuk ketika pengguna berpindah topik di
dalam percakapan yang sama. Seluruh tahap wajib mempertahankan filter akses SOP,
published-version boundary, response rules, citation, dan history ownership.

Target kualitas bukan menjamin model menjawab setiap kalimat tanpa syarat,
melainkan memastikan dokumen yang benar dapat ditemukan jika kontennya sudah
dipublikasikan, berhasil di-index, dan dapat diakses oleh pengguna.

## Kondisi saat ini

- History resmi diambil dari database setelah ownership `chatId` diverifikasi.
- Maksimal enam pesan history dikirim ke LLM.
- Generation history dibatasi 8.000 karakter.
- Contextual retrieval query dibatasi 4.000 karakter.
- History yang mengutip SOP restricted dibuang untuk visitor anonim.
- Setiap pertanyaan dengan history langsung dicampur menjadi satu contextual
  query.

Kelemahan terakhir menyebabkan topik lama dapat mendominasi embedding ketika
pengguna berpindah dari SOP ke FAQ atau sebaliknya.

## Tahap 1 — Topic-switch-safe retrieval

### Perilaku

1. Cari menggunakan pertanyaan terbaru saja.
2. Jika ditemukan knowledge yang dapat diakses, gunakan hasil standalone.
3. Jika tidak ditemukan hasil dan tidak ada restricted match, bentuk contextual
   query dari history terpercaya dan ulangi retrieval.
4. Jika standalone menemukan restricted SOP untuk visitor anonim, tampilkan
   login guidance tanpa menjalankan contextual fallback.
5. Kirim history terbatas ke LLM, tetapi tegaskan bahwa history bukan sumber
   fakta dan pertanyaan terbaru harus diprioritaskan.

### Scope

- Tidak mengubah frontend atau kontrak SSE.
- Tidak mengubah schema atau migration.
- Tidak menambah dependency atau panggilan LLM.
- Embedding kedua hanya terjadi ketika standalone retrieval tidak menemukan
  jawaban yang dapat digunakan.

### Acceptance criteria

- Pertanyaan mandiri setelah topik SOP dapat menemukan FAQ.
- Pertanyaan mandiri setelah topik FAQ dapat menemukan SOP.
- Pertanyaan ambigu tetap dapat memakai contextual fallback.
- Restricted SOP tidak bocor melalui salah satu jalur.
- Citation dan response dictionary tetap bekerja.

## Tahap 2 — Retrieval observability

**Status: diimplementasikan.** Diagnostics dikirim sebagai structured runtime
log (`chat.retrieval`) dan tidak disimpan di database aplikasi. Retention,
redaction tambahan, dan akses operator mengikuti konfigurasi log platform saat
deployment.

Tambahkan diagnostics terstruktur dan aman untuk:

- mode retrieval (`standalone` atau `contextual`);
- jumlah kandidat dan dokumen yang dipilih;
- jenis sumber;
- top similarity score dan threshold aktif;
- latency embedding/retrieval;
- alasan fallback.

Diagnostics tidak boleh mencatat API key, embedding vector, isi SOP restricted,
atau history percakapan mentah. Perubahan dari runtime log ke penyimpanan khusus
beserta retention policy harus disetujui sebelum implementasi lanjutan.

Implementasi saat ini juga tidak mencatat query, document/source ID, user ID,
visitor ID, provider detail, atau exception message. Setiap event menggunakan
request ID acak yang tidak diturunkan dari identitas pengguna.

## Tahap 3 — Evaluation dataset

**Status: diimplementasikan.** Dataset seed versioned, schema validation,
preflight knowledge coverage, live runner, metrik, threshold gate, dan unit
tests tersedia. Evaluation live sengaja berada di luar `npm test` karena
membutuhkan embedding endpoint dan knowledge fixture yang cocok.

### Baseline environment 2026-08-01

Database development yang diverifikasi tidak menggunakan knowledge dari
`scripts/seed.ts`; karena itu `retrieval-seed-v1.json` gagal pada preflight
coverage dan tidak dianggap sebagai pengukuran kualitas yang sah. Runner
melaporkan expected knowledge yang tidak tersedia lalu berhenti sebelum
embedding. Dataset environment-specific harus disusun bersama pemilik knowledge
sebelum threshold retrieval production dapat dikalibrasi.

Buat evaluation set yang dapat dijalankan berulang untuk:

- FAQ dan SOP langsung;
- sinonim dan variasi bahasa;
- follow-up FAQ dan SOP;
- perpindahan FAQ → SOP dan SOP → FAQ;
- pertanyaan ambigu;
- pertanyaan di luar knowledge base;
- SOP restricted sebagai visitor dan pengguna terautentikasi.

Metrik minimum:

- expected document masuk top-k;
- source type yang benar;
- fallback correctness;
- tidak ada restricted-source leakage;
- mode standalone/contextual yang diharapkan.

Dataset tidak boleh memuat credential atau data restricted ke artifact yang
tidak memiliki kontrol akses setara.

## Tahap 4 — Hybrid retrieval

**Status: diimplementasikan.** Pengujian percakapan lintas sumber pada knowledge
FAQ aktual menunjukkan kebutuhan menemukan istilah persis selain kedekatan
semantik. Data SOP aktual belum tersedia; coverage SOP dijaga oleh fixture dan
regression test sampai data tersebut ditambahkan.

Retrieval sekarang menggabungkan:

- semantic vector search PGVector;
- PostgreSQL full-text search dengan konfigurasi language-neutral `simple`;
- normalisasi lexical deterministik yang membuang kata percakapan umum,
  mempertahankan istilah domain/kode, menghapus duplikat, dan membatasi 12 term;
- kandidat lexical cocok dengan sedikitnya satu term yang dinormalisasi, lalu
  `ts_rank` dan fusion menentukan urutannya;
- Reciprocal Rank Fusion (konstanta 60) dan deduplication berdasarkan document
  ID, tanpa menyamakan skala cosine similarity dengan `ts_rank`;
- access filter sebelum kandidat keluar dari database.

`retrievalSimilarityThreshold` tetap menjadi ambang jalur semantic. Dokumen yang
memiliki istilah persis dapat masuk melalui jalur lexical walaupun cosine score
di bawah ambang. `retrievalTopK`, source priority, selection rule, dan maksimal
context tetap diterapkan setelah fusion.

Migration `0016_luxuriant_the_stranger.sql` menambah GIN expression index yang
sesuai persis dengan ekspresi full-text query. Filter status, published SOP
version, dan `requires_login` diterapkan dalam CTE `accessible` sebelum ranking;
deteksi SOP restricted juga mencakup kecocokan lexical tetapi hanya mengambil
ID, bukan isi dokumen.

Tidak ada dependency baru, perubahan API/SSE, atau perubahan data knowledge.
LLM query rewriting dan conversation summary tetap di luar scope sampai data
evaluasi membuktikan kebutuhannya.

## Urutan validasi setiap tahap

```bash
npm run lint
npm run typecheck
set -a
. ./.env
set +a
npm test
make test-e2e-docker
npm run build
git diff --check
```

## Definition of done keseluruhan

- Topic switch dan follow-up menghasilkan source yang tepat pada evaluation set.
- Semua jalur retrieval menerapkan authentication dan document access policy.
- Kegagalan retrieval dapat didiagnosis tanpa membuka data sensitif.
- Threshold, top-k, dan chunking dikalibrasi dari hasil evaluasi, bukan asumsi.
- Hybrid retrieval hanya ditambahkan bila terbukti meningkatkan hasil.
- Seluruh regression tests, lint, typecheck, E2E, dan production build lulus.
