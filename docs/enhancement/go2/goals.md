# Tujuan Pengembangan Chat PostIT AI

## 1. Kondisi Saat Ini (As-Is)

Saat ini **Chat PostIT AI** dapat digunakan tanpa login untuk mengakses seluruh informasi yang tersedia, baik **FAQ** maupun **SOP**.

---

# 2. Kondisi yang Diharapkan (To-Be)

## A. Perubahan Mekanisme Akses Chat PostIT AI

- Pengguna dapat menggunakan **Chat PostIT AI tanpa login** untuk mengakses seluruh informasi **FAQ**.
- Untuk informasi **SOP**, hak akses ditentukan berdasarkan konfigurasi pada masing-masing dokumen SOP.
  - Jika SOP **tidak memerlukan login**, maka pengguna dapat langsung mengakses isi SOP.
  - Jika SOP **memerlukan login**, maka sistem tidak menampilkan isi SOP kepada pengguna yang belum login dan memberikan arahan untuk melakukan login melalui tombol atau navigasi menuju halaman login.

---

## B. Pengembangan Modul SOP

Menu **SOP** dikembangkan dengan fitur-fitur berikut:

### 1. Pengaturan Hak Akses

Setiap SOP memiliki pengaturan (toggle) untuk menentukan apakah dokumen:

- Memerlukan login.
- Dapat diakses tanpa login.

### 2. Attachment Dokumen

Sistem mendukung lampiran dokumen SOP dalam berbagai format yang umum digunakan perusahaan, seperti:

- PDF (.pdf)
- Microsoft Word (.docx)
- Microsoft Excel (.xlsx)
- Microsoft PowerPoint (.pptx)
- Format dokumen lainnya sesuai kebutuhan perusahaan.

### 3. Versioning SOP

Sistem mendukung pengelolaan beberapa versi untuk setiap SOP.

Fitur yang tersedia meliputi:

- Menyimpan riwayat seluruh versi SOP.
- Menentukan versi SOP yang dipublikasikan.
- Menentukan versi SOP yang dapat diakses oleh pengguna.
- Mengembalikan (rollback) ke versi sebelumnya apabila diperlukan.

---

## C. Admin Management

Tambahkan modul **Admin Management** dengan dua tingkat hak akses:

### Super Admin

Memiliki hak akses penuh terhadap seluruh fitur sistem, termasuk konfigurasi AI.

### Admin

Memiliki hak akses untuk mengelola data operasional, namun **tidak memiliki akses** ke menu **AI Configuration**.

---

## D. User Management

Tambahkan modul **User Management** dengan ketentuan sebagai berikut:

- Tidak tersedia fitur registrasi mandiri (self-registration).
- Seluruh akun pengguna dibuat oleh Administrator.
- Administrator dapat:
  - Menambah pengguna.
  - Mengubah data pengguna.
  - Mengaktifkan atau menonaktifkan akun.
  - Memblokir pengguna yang terbukti menyalahgunakan fitur Chat PostIT AI.

- Pengguna yang diblokir tidak dapat mengakses sistem maupun menggunakan layanan Chat PostIT AI.

---

# E. AI Configuration

Menu **AI Configuration** dikembangkan sebagai pusat konfigurasi layanan AI yang digunakan oleh Chat PostIT AI.

Menu ini **hanya dapat diakses oleh Super Admin**.

## 1. Model Configuration

Super Admin dapat mengatur model AI yang digunakan oleh sistem.

### Embedding Model

Parameter yang dapat dikonfigurasi:

- Base URL
- API Key
- Model Name

### Large Language Model (LLM)

Parameter yang dapat dikonfigurasi:

- Base URL
- API Key
- Model Name

Perubahan konfigurasi model akan berlaku untuk seluruh proses:

- Embedding dokumen.
- Retrieval Knowledge Base.
- Generasi jawaban AI.

---

## 2. AI Behaviour

Super Admin dapat mengatur perilaku AI dalam memberikan jawaban, meliputi:

- Persona atau peran AI.
- Gaya bahasa (Formal, Profesional, Ramah, dan lainnya).
- Tingkat detail jawaban (Singkat, Sedang, Detail).
- Bahasa yang digunakan AI.
- Penggunaan emoji (Aktif/Tidak Aktif).

Seluruh konfigurasi tersebut digunakan sebagai **System Prompt** pada setiap permintaan ke Large Language Model (LLM).

---

## 3. Response Rules

Super Admin dapat menentukan aturan yang wajib dipatuhi oleh AI, antara lain:

- AI hanya boleh memberikan jawaban berdasarkan informasi yang tersedia pada Knowledge Base.
- AI tidak diperbolehkan membuat informasi di luar data yang tersedia (No Hallucination Policy).
- Jika informasi tidak ditemukan, AI harus menampilkan pesan fallback yang telah ditentukan.
- AI tidak boleh menampilkan isi SOP yang memerlukan autentikasi kepada pengguna yang belum login.
- AI harus mematuhi seluruh aturan akses dokumen yang berlaku pada sistem.

---

## 4. Response Dictionary

Super Admin dapat mengelola daftar kata atau frasa yang digunakan AI.

Konfigurasi meliputi:

### Forbidden Words

Daftar kata atau frasa yang tidak boleh digunakan dalam jawaban AI.

### Required Words

Daftar kata atau frasa yang wajib digunakan pada kondisi tertentu.

Pengaturan ini bertujuan menjaga konsistensi gaya komunikasi AI sesuai standar perusahaan.

---

## 5. Retrieval Configuration

Super Admin dapat mengatur proses pencarian informasi sebelum jawaban dihasilkan oleh AI.

Parameter yang dapat dikonfigurasi antara lain:

- Jumlah dokumen yang diambil dari Vector Database (Top K).
- Similarity Threshold.
- Prioritas sumber informasi (FAQ atau SOP).
- Aturan pemilihan dokumen yang digunakan sebagai konteks.
- Batas maksimum jumlah konteks yang dikirim ke LLM.

Konfigurasi ini bertujuan meningkatkan akurasi dan relevansi jawaban AI.

---

## 6. Hak Akses

### Super Admin

Memiliki hak untuk:

- Melihat seluruh konfigurasi AI.
- Menambah konfigurasi.
- Mengubah konfigurasi.
- Menghapus konfigurasi.

### Admin

Tidak memiliki akses terhadap menu **AI Configuration**.

---

# F. Perubahan Mekanisme Chat PostIT AI

Mekanisme Chat PostIT AI diperbarui sehingga proses pencarian informasi dan penyusunan jawaban dilakukan melalui tahapan berikut:

1. Pengguna mengirimkan pertanyaan melalui Chat PostIT AI.
2. Sistem melakukan proses **Embedding** terhadap pertanyaan pengguna.
3. Sistem melakukan pencarian informasi pada **Vector Database (PGVector)** berdasarkan hasil embedding.
4. Sistem mengambil dokumen yang paling relevan sesuai konfigurasi **Retrieval Configuration**.
5. Sistem memverifikasi hak akses terhadap seluruh dokumen yang ditemukan, khususnya dokumen SOP yang memerlukan autentikasi.
6. Hanya dokumen yang dapat diakses oleh pengguna yang digunakan sebagai konteks jawaban.
7. Sistem mengirimkan konteks hasil pencarian beserta konfigurasi pada menu **AI Configuration** ke Large Language Model (LLM).
8. AI menghasilkan jawaban berdasarkan konteks yang diterima dan aturan yang telah ditentukan.
9. Apabila tidak ditemukan informasi yang relevan, AI menampilkan pesan bahwa informasi belum tersedia serta mengarahkan pengguna untuk menghubungi administrator atau pihak terkait apabila diperlukan.
