# Tahap 8 — Attachment Extraction and Knowledge Base Indexing

## Status

Plan disetujui untuk implementasi.

Dokumen ini mencatat scope dan keputusan implementasi untuk memperluas attachment
SOP agar isinya diekstrak, di-chunk, di-embed, dan digunakan oleh Knowledge Base.

## Scope Format

Format yang termasuk Tahap 8:

- TXT (UTF-8)
- CSV (UTF-8)
- PDF yang memiliki text layer
- DOCX
- XLSX
- PPTX

Format yang **tidak termasuk** Tahap 8:

- DOC legacy
- XLS legacy
- PPT legacy
- PDF hasil scan yang memerlukan OCR

Format legacy dan OCR tidak perlu ditampilkan sebagai format extraction yang
didukung, tidak perlu diberi alur `unsupported`, dan tidak perlu dibuatkan parser
atau dependency pada tahap ini. Dukungan tersebut merupakan pengembangan masa
depan yang terpisah.

## Behaviour yang Diharapkan

1. Attachment divalidasi dan diekstrak saat diunggah ke draft versi SOP.
2. Status dan hasil extraction disimpan pada attachment.
3. Admin dapat melihat status extraction dan menjalankan extraction ulang jika
   terjadi kegagalan.
4. Publish hanya dapat mengaktifkan versi yang seluruh attachment-nya berhasil
   diekstrak.
5. SOP body dan setiap attachment di-chunk secara terpisah agar sumber citation
   tetap dapat dibedakan.
6. Hanya chunk dari versi SOP published yang dapat digunakan oleh retrieval.
7. Rollback mengaktifkan kembali SOP body dan attachment chunks milik versi lama.
8. Kegagalan parsing atau embedding tidak boleh mengubah versi dan vector publik
   yang sebelumnya aktif.
9. Aturan `requiresLogin` berlaku untuk SOP body maupun seluruh attachment-nya.

## Pendekatan Arsitektur

Pipeline:

```text
Upload draft attachment
  -> validasi ukuran, filename, extension, dan signature
  -> ekstraksi teks dan struktur
  -> simpan extraction status, text, metadata, checksum, dan parser version

Publish SOP version
  -> validasi semua attachment berstatus ready
  -> chunk SOP body
  -> chunk attachment dengan batas page/sheet/slide
  -> embed semua chunk
  -> atomically replace active vectors dan publishedVersionId
```

Ekstraksi dilakukan saat upload agar kegagalan diketahui sebelum publish.
Publish tetap memverifikasi checksum, status, dan parser version sebelum indexing.

## Perubahan Database yang Direncanakan

Tambahan pada `sop_attachments`:

- `extraction_status`: `pending | ready | error`
- `extracted_text`
- `extraction_error`
- `extracted_at`
- `parser_version`
- `extracted_character_count`
- `extraction_metadata` JSONB

Tambahan pada `documents`:

- `sop_attachment_id`, nullable foreign key ke `sop_attachments`

Metadata chunk attachment memuat informasi relevan:

- `sourceKind: "attachment"`
- `attachmentId`
- `filename`
- `mediaType`
- `pageNumber`, jika PDF
- `sheetName`, jika XLSX
- `slideNumber`, jika PPTX
- section/chunk position

Migrasi hanya menambahkan schema dan status awal. Migrasi tidak boleh mengubah
published version maupun vector aktif.

## Parser yang Direncanakan

- TXT/CSV: parser native dengan validasi UTF-8.
- PDF text layer: PDF.js.
- DOCX: Mammoth raw-text extraction.
- XLSX: parser ZIP/XML read-only terkontrol.
- PPTX: parser ZIP/XML read-only terkontrol untuk mengambil teks berdasarkan
  urutan slide.

Versi, lisensi, Node.js compatibility, transitive dependency, dan security
advisory harus diperiksa sebelum dependency dipasang.

Catatan implementasi: ExcelJS sempat dipertimbangkan, tetapi tidak digunakan
karena audit dependency menemukan advisory high pada rantai transitive komponen
archive. XLSX dan PPTX menggunakan `fflate` setelah central-directory preflight;
parser tidak menjalankan formula, macro, relationship eksternal, atau embedded
object.

## Batas Keamanan dan Resource

- Pertahankan batas upload 10 MB.
- Batasi jumlah karakter hasil ekstraksi.
- Batasi page, sheet, row, slide, archive entry, dan ukuran dekompresi.
- Tolak file corrupt, encrypted/password-protected, atau tanpa teks yang dapat
  digunakan.
- Jangan mengeksekusi formula, macro, hyperlink, embedded object, atau script.
- Jangan mengirim raw binary maupun extraction error internal ke client.
- Verifikasi checksum sebelum memakai hasil extraction lama.
- Parser version digunakan untuk menandai hasil extraction yang perlu diproses
  ulang setelah parser berubah.

## Urutan Implementasi

1. Tambahkan schema extraction dan attachment identity pada document chunks.
2. Generate, review, dan terapkan migrasi development.
3. Buat interface parser dan normalisasi hasil extraction.
4. Implementasikan TXT/CSV.
5. Implementasikan PDF text layer.
6. Implementasikan DOCX.
7. Implementasikan XLSX.
8. Implementasikan PPTX.
9. Tambahkan resource limits dan safe error mapping.
10. Integrasikan extraction ke upload dan endpoint retry.
11. Perluas chunking agar mempertahankan source boundaries.
12. Perluas atomic publish untuk SOP body dan attachment chunks.
13. Perbarui retrieval/citation metadata dan dashboard status.
14. Tambahkan parser, API, integration, retrieval, rollback, dan security tests.
15. Jalankan full validation dan review git diff.

## Risiko dan Edge Cases

- ZIP bomb pada DOCX/XLSX/PPTX.
- PDF encrypted atau tanpa text layer.
- Attachment valid tetapi menghasilkan teks kosong.
- Spreadsheet sangat besar, hidden sheet, formula, atau merged cell.
- PowerPoint yang seluruh informasinya berupa gambar.
- Unicode, RTL, control characters, dan whitespace berlebihan.
- Checksum berubah setelah extraction.
- Parser berhasil tetapi embedding gagal.
- Concurrent publish.
- Duplicate content antara SOP body dan attachment.
- Filename atau citation metadata SOP restricted bocor ke anonymous user.

## Strategi Testing

### Unit

- Fixture TXT, CSV, text PDF, DOCX, XLSX, dan PPTX.
- Corrupt/signature mismatch.
- Empty extraction.
- Encrypted PDF.
- ZIP/decompression limit.
- Character/page/sheet/row/slide limit.
- Unicode dan whitespace normalization.

### Integration

- Upload menghasilkan extraction `ready`.
- Parser failure menghasilkan error aman dan memblokir publish.
- Retry extraction.
- Draft baru menyalin attachment beserta hasil extraction yang masih valid.
- Publish menghasilkan body chunks dan attachment chunks.
- Semua attachment chunks memiliki `sopVersionId` dan `sopAttachmentId`.
- Embedding failure mempertahankan published pointer dan vectors lama.
- Rollback mengaktifkan kembali attachment chunks versi lama.
- Restricted attachment tidak pernah keluar dari anonymous retrieval.

## Validation Commands

```bash
npm run db:generate
npm run db:migrate
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
git status --short
git diff
```

## Definition of Done

- Seluruh format dalam scope dapat diekstrak dan diindeks.
- Status dan safe error extraction terlihat di dashboard.
- Admin dapat retry extraction.
- Citation membedakan SOP body dan attachment serta lokasi sumbernya.
- Publish dan rollback tetap atomik.
- Parsing atau embedding failure tidak merusak versi publik aktif.
- Attachment restricted tidak bocor kepada anonymous user.
- Tidak ada dukungan semu untuk legacy Office atau OCR.
- Migrasi, regression tests, lint, typecheck, tests, build, dan diff check lulus.
