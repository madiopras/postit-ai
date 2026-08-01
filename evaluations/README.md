# Retrieval Evaluation Datasets

`retrieval-seed-v1.json` adalah benchmark untuk knowledge yang dibuat oleh
`scripts/seed.ts`. Jalankan setelah seed tersebut tersedia dan seluruh dokumen
berstatus published/indexed:

```bash
make eval-retrieval
```

Untuk environment dengan knowledge berbeda, salin dataset dan sesuaikan cases:

```bash
npm run eval:retrieval -- evaluations/retrieval-production-v1.json
```

Runner melakukan preflight terhadap judul dan tipe dokumen ter-index sebelum
memanggil embedding endpoint. Dataset yang tidak cocok akan gagal cepat agar
hasil benchmark tidak menyesatkan dan tidak membuang biaya provider.

## Aturan dataset

- Gunakan ID kasus yang unik dan stabil.
- Jangan menyimpan credential, PII, embedding, atau isi SOP restricted.
- `titleIncludes` adalah label expected-document, bukan isi jawaban.
- Tandai `authenticated: true` hanya pada runner yang memakai environment dengan
  kebijakan akses pengujian yang telah disetujui.
- Jangan menurunkan threshold hanya untuk membuat build hijau; simpan perubahan
  threshold bersama alasan dan baseline pembanding.
- Version-kan dataset ketika knowledge atau expected behaviour berubah.

Evaluasi live tidak menjadi bagian dari `npm test`, karena membutuhkan database,
knowledge fixture, dan embedding endpoint. Validasi schema, perhitungan metrik,
redaction hasil, serta preflight coverage tetap dijalankan pada unit tests.
