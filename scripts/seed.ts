try {
  process.loadEnvFile(".env");
} catch {
  // Tidak masalah jika .env tidak ada (misalnya di Vercel)
}

import { db } from "../lib/db";
import { faqs, sops, sopVersions, users } from "../lib/schema";
import { eq } from "drizzle-orm";

/**
 * Seed 50 FAQ and 10 SOP for Coffe Gaul.
 *
 * Rows are inserted directly into the database as `draft` so the script works
 * on first deploy (no embedding endpoint required). Content can be published
 * and embedded later from the dashboard.
 *
 * Follows the same env-loading pattern as seed-admin.ts so it runs reliably
 * on Vercel (process.loadEnvFile with try/catch instead of tsx --env-file).
 */

const FAQ_SEED: Array<{ question: string; answer: string; category: string }> = [
  // ── Umum ──────────────────────────────────────────────
  {
    question: "Apa itu Coffe Gaul?",
    answer:
      "Coffe Gaul adalah perusahaan kopi lokal yang menyajikan kopi specialty dari berbagai daerah di Indonesia dengan konsep modern dan kekinian.",
    category: "Umum",
  },
  {
    question: "Di mana lokasi outlet Coffe Gaul?",
    answer:
      "Coffe Gaul memiliki outlet di Jakarta, Bandung, Surabaya, Yogyakarta, Bali, dan Medan. Alamat lengkap tersedia di halaman Lokasi pada website kami.",
    category: "Umum",
  },
  {
    question: "Kapan jam operasional Coffe Gaul?",
    answer:
      "Senin–Jumat 07.00–22.00 WIB, Sabtu–Minggu & hari libur 08.00–23.00 WIB.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul menyediakan Wi-Fi gratis?",
    answer:
      "Ya, semua outlet Coffe Gaul menyediakan Wi-Fi gratis berkecepatan tinggi untuk pelanggan.",
    category: "Umum",
  },
  {
    question: "Bagaimana cara menghubungi customer service Coffe Gaul?",
    answer:
      "Melalui WhatsApp di 0812-8888-KOPI, email cs@coffegaul.id, atau DM Instagram @coffegaul.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul menerima reservasi tempat?",
    answer:
      "Ya, reservasi dapat dilakukan via aplikasi Coffe Gaul atau menghubungi outlet terkait minimal 1 hari sebelumnya.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul menyediakan ruang meeting?",
    answer:
      "Outlet flagship di Jakarta dan Surabaya menyediakan ruang meeting berkapasitas 8–15 orang dengan tarif mulai Rp150.000/jam termasuk kopi.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul ramah hewan peliharaan?",
    answer:
      "Area outdoor di sebagian besar outlet bersifat pet-friendly. Hewan wajib menggunakan tali dan pemilik bertanggung jawab atas kebersihan.",
    category: "Umum",
  },
  // ── Menu & Produk ────────────────────────────────────
  {
    question: "Apa menu andalan Coffe Gaul?",
    answer:
      "Menu andalan kami meliputi Gaul Latte, Es Kopi Susu Gula Aren, V60 Single Origin, Matcha Gaul, dan Croissant Butter.",
    category: "Menu",
  },
  {
    question: "Apakah Coffe Gaul menyediakan menu non-kopi?",
    answer:
      "Ya, kami menyediakan cokelat, matcha, teh, jus buah segar, serta aneka smoothie.",
    category: "Menu",
  },
  {
    question: "Apakah ada menu makanan di Coffe Gaul?",
    answer:
      "Kami menyediakan pastry, sandwich, rice bowl, pasta, dan dessert yang diolah fresh setiap hari.",
    category: "Menu",
  },
  {
    question: "Apakah Coffe Gaul punya opsi menu vegan?",
    answer:
      "Ya, tersedia susu oat dan susu almond sebagai pengganti susu sapi, serta beberapa menu makanan berbasis nabati.",
    category: "Menu",
  },
  {
    question: "Bagaimana cara melihat daftar alergen pada menu?",
    answer:
      "Informasi alergen tertera di menu fisik dan aplikasi. Pelanggan juga dapat bertanya langsung kepada barista.",
    category: "Menu",
  },
  {
    question: "Apakah Coffe Gaul menjual biji kopi?",
    answer:
      "Ya, kami menjual biji kopi single origin dan house blend dalam kemasan 100g, 250g, dan 1kg.",
    category: "Menu",
  },
  {
    question: "Berapa kisaran harga minuman di Coffe Gaul?",
    answer:
      "Harga minuman mulai dari Rp18.000 untuk kopi hitam hingga Rp45.000 untuk menu specialty.",
    category: "Menu",
  },
  {
    question: "Apakah ukuran minuman bisa disesuaikan?",
    answer:
      "Tersedia ukuran Regular (240ml), Large (360ml), dan Extra Large (480ml) dengan tambahan harga Rp5.000–Rp10.000.",
    category: "Menu",
  },
  {
    question: "Apakah level gula bisa diatur?",
    answer:
      "Ya, pelanggan dapat memilih level gula: tanpa gula, less sugar, normal, atau extra sweet.",
    category: "Menu",
  },
  // ── Pemesanan ────────────────────────────────────────
  {
    question: "Bagaimana cara memesan via aplikasi Coffe Gaul?",
    answer:
      "Download aplikasi Coffe Gaul di Play Store/App Store → daftar akun → pilih outlet → pilih menu → bayar → ambil pesanan.",
    category: "Pemesanan",
  },
  {
    question: "Apakah Coffe Gaul tersedia di GoFood dan GrabFood?",
    answer:
      "Ya, Coffe Gaul tersedia di GoFood, GrabFood, dan ShopeeFood untuk layanan delivery.",
    category: "Pemesanan",
  },
  {
    question: "Berapa lama waktu tunggu pesanan?",
    answer:
      "Waktu rata-rata pembuatan minuman 5–10 menit, makanan 10–20 menit tergantung menu.",
    category: "Pemesanan",
  },
  {
    question: "Apakah bisa pre-order untuk acara kantor?",
    answer:
      "Ya, pre-order untuk kebutuhan meeting atau acara kantor minimal 2 hari sebelumnya melalui WhatsApp atau email.",
    category: "Pemesanan",
  },
  {
    question: "Apakah ada minimum order untuk delivery?",
    answer:
      "Minimum order delivery melalui aplikasi Coffe Gaul adalah Rp30.000. Melalui platform pihak ketiga mengikuti kebijakan masing-masing.",
    category: "Pemesanan",
  },
  // ── Pembayaran ───────────────────────────────────────
  {
    question: "Metode pembayaran apa saja yang diterima?",
    answer:
      "Kami menerima tunai, QRIS, kartu debit/kredit, GoPay, OVO, ShopeePay, dan saldo Coffe Gaul.",
    category: "Pembayaran",
  },
  {
    question: "Apakah ada biaya tambahan untuk pembayaran non-tunai?",
    answer:
      "Tidak, semua metode pembayaran dikenakan harga yang sama tanpa biaya tambahan.",
    category: "Pembayaran",
  },
  {
    question: "Bagaimana cara top-up saldo Coffe Gaul?",
    answer:
      "Top-up bisa dilakukan via aplikasi Coffe Gaul dengan transfer bank, QRIS, atau e-wallet mulai dari Rp50.000.",
    category: "Pembayaran",
  },
  // ── Membership & Promo ───────────────────────────────
  {
    question: "Apa itu Gaul Points?",
    answer:
      "Gaul Points adalah program loyalitas Coffe Gaul. Setiap pembelian Rp10.000 mendapatkan 1 poin yang bisa ditukar minuman atau merchandise.",
    category: "Membership",
  },
  {
    question: "Bagaimana cara mendaftar membership Coffe Gaul?",
    answer:
      "Daftar gratis melalui aplikasi Coffe Gaul. Masukkan data diri dan verifikasi nomor HP untuk langsung mendapat 10 Gaul Points.",
    category: "Membership",
  },
  {
    question: "Apa saja level membership yang tersedia?",
    answer:
      "Terdapat 3 level: Gaul Bronze (0–99 poin), Gaul Silver (100–499 poin), dan Gaul Gold (500+ poin) dengan benefit yang meningkat.",
    category: "Membership",
  },
  {
    question: "Apakah Gaul Points bisa hangus?",
    answer:
      "Gaul Points berlaku selama 12 bulan sejak tanggal perolehan. Poin yang tidak digunakan akan hangus otomatis.",
    category: "Membership",
  },
  {
    question: "Apakah ada promo khusus untuk member?",
    answer:
      "Ya, member mendapat promo eksklusif setiap bulan seperti buy 1 get 1, diskon 20%, dan akses early menu baru.",
    category: "Membership",
  },
  {
    question: "Apakah ada promo ulang tahun?",
    answer:
      "Member yang berulang tahun mendapat 1 minuman gratis (maks Rp40.000) yang bisa ditukar dalam 7 hari sejak tanggal lahir.",
    category: "Membership",
  },
  // ── Karir ────────────────────────────────────────────
  {
    question: "Bagaimana cara melamar kerja di Coffe Gaul?",
    answer:
      "Kirim CV dan surat lamaran ke karir@coffegaul.id atau melalui halaman Karir di website kami.",
    category: "Karir",
  },
  {
    question: "Posisi apa saja yang biasanya dibuka?",
    answer:
      "Posisi yang sering dibuka antara lain Barista, Kasir, Kitchen Crew, Supervisor Outlet, dan Marketing Digital.",
    category: "Karir",
  },
  {
    question: "Apakah Coffe Gaul menerima magang?",
    answer:
      "Ya, kami membuka program magang untuk mahasiswa semester 5+ dengan durasi minimal 3 bulan.",
    category: "Karir",
  },
  // ── Kemitraan ────────────────────────────────────────
  {
    question: "Apakah Coffe Gaul membuka peluang franchise?",
    answer:
      "Saat ini Coffe Gaul belum membuka franchise, namun kami membuka kemitraan untuk catering kopi di event dan kantor.",
    category: "Kemitraan",
  },
  {
    question: "Bagaimana cara mengajukan kerja sama event?",
    answer:
      "Kirim proposal ke partnership@coffegaul.id dengan detail acara, lokasi, estimasi tamu, dan tanggal pelaksanaan.",
    category: "Kemitraan",
  },
  {
    question: "Apakah Coffe Gaul melayani coffee catering?",
    answer:
      "Ya, kami melayani coffee catering untuk pernikahan, seminar, dan event korporat mulai dari 50 cup.",
    category: "Kemitraan",
  },
  // ── Kebijakan ────────────────────────────────────────
  {
    question: "Bagaimana kebijakan refund Coffe Gaul?",
    answer:
      "Refund dapat diajukan jika pesanan salah atau tidak sesuai, dalam waktu 30 menit setelah penerimaan. Hubungi CS kami.",
    category: "Kebijakan",
  },
  {
    question: "Apakah bisa tukar menu jika tidak sesuai?",
    answer:
      "Ya, penukaran menu bisa dilakukan di outlet dalam 10 menit setelah pesanan diterima dengan menunjukkan struk.",
    category: "Kebijakan",
  },
  {
    question: "Bagaimana kebijakan privasi data pelanggan?",
    answer:
      "Data pelanggan disimpan secara terenkripsi dan tidak dibagikan ke pihak ketiga tanpa persetujuan. Detail ada di halaman Kebijakan Privasi.",
    category: "Kebijakan",
  },
  // ── Akun ─────────────────────────────────────────────
  {
    question: "Bagaimana cara reset password akun Coffe Gaul?",
    answer:
      "Buka aplikasi → klik Lupa Password → masukkan email/nomor HP terdaftar → ikuti link reset yang dikirim.",
    category: "Akun",
  },
  {
    question: "Bagaimana cara mengubah data profil di aplikasi?",
    answer:
      "Masuk ke menu Profil → Edit Profil → ubah nama, email, atau nomor HP → simpan perubahan.",
    category: "Akun",
  },
  {
    question: "Bagaimana cara menghapus akun Coffe Gaul?",
    answer:
      "Kirim permintaan hapus akun ke cs@coffegaul.id dari email terdaftar. Proses memakan waktu 7 hari kerja.",
    category: "Akun",
  },
  // ── Produk Retail ────────────────────────────────────
  {
    question: "Apakah Coffe Gaul menjual merchandise?",
    answer:
      "Ya, kami menjual tumbler, tote bag, kaos, dan mug edisi terbatas di outlet dan toko online kami.",
    category: "Produk",
  },
  {
    question: "Apakah ada produk kopi ready-to-drink?",
    answer:
      "Ya, Coffe Gaul memiliki lini Es Kopi Botolan dalam kemasan 250ml dan 1 liter yang tersedia di outlet dan e-commerce.",
    category: "Produk",
  },
  {
    question: "Dari mana asal biji kopi Coffe Gaul?",
    answer:
      "Biji kopi kami bersumber langsung dari petani di Aceh Gayo, Toraja, Flores, Bali Kintamani, dan Java Preanger.",
    category: "Produk",
  },
  // ── Lainnya ──────────────────────────────────────────
  {
    question: "Apakah Coffe Gaul punya program CSR?",
    answer:
      'Ya, melalui program "Gaul Peduli" kami memberikan pelatihan barista gratis untuk pemuda kurang mampu dan mendukung petani kopi lokal.',
    category: "Umum",
  },
  {
    question: "Apakah kemasan Coffe Gaul ramah lingkungan?",
    answer:
      "Kami menggunakan cup berbahan PLA (biodegradable) dan sedotan kertas. Pelanggan yang membawa tumbler sendiri mendapat diskon Rp3.000.",
    category: "Umum",
  },
  {
    question: "Bagaimana cara memberikan feedback atau saran?",
    answer:
      "Isi form Feedback di aplikasi, scan QR di meja outlet, atau kirim email ke feedback@coffegaul.id.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul menyediakan kopi untuk subscription bulanan?",
    answer:
      "Ya, layanan Gaul Subscription mengirim 250g biji kopi pilihan setiap bulan mulai Rp89.000/bulan dengan gratis ongkir.",
    category: "Produk",
  },
];

const SOP_SEED: Array<{ title: string; content: string; category: string }> = [
  {
    title: "SOP Pembukaan Outlet Harian",
    content:
      "1. Datang 30 menit sebelum jam buka. 2. Periksa kebersihan area dan peralatan. 3. Nyalakan mesin espresso dan grinder, lakukan flushing. 4. Cek stok bahan baku (susu, sirup, biji kopi, cup). 5. Siapkan kas register dengan uang kembalian standar Rp500.000. 6. Buka pintu outlet tepat sesuai jam operasional.",
    category: "Operasional",
  },
  {
    title: "SOP Penutupan Outlet Harian",
    content:
      "1. Hentikan penerimaan order 15 menit sebelum tutup. 2. Bersihkan mesin espresso, steam wand, dan grinder. 3. Buang ampas kopi dan bersihkan knock box. 4. Hitung kas dan cocokkan dengan laporan POS. 5. Simpan bahan baku yang mudah rusak ke dalam chiller. 6. Matikan semua peralatan listrik kecuali chiller. 7. Kunci outlet dan aktifkan alarm keamanan.",
    category: "Operasional",
  },
  {
    title: "SOP Penyajian Minuman Kopi",
    content:
      '1. Cuci tangan dan gunakan apron bersih. 2. Baca order dari POS dan siapkan cup sesuai ukuran. 3. Timbang biji kopi sesuai resep (18g untuk single shot). 4. Grind dan tamp dengan tekanan 15kg. 5. Ekstraksi espresso 25–30 detik. 6. Steaming susu hingga suhu 60–65°C. 7. Latte art sesuai standar. 8. Serahkan minuman kepada pelanggan dan ucapkan "Selamat menikmati!".',
    category: "Barista",
  },
  {
    title: "SOP Penanganan Keluhan Pelanggan",
    content:
      "1. Dengarkan keluhan pelanggan dengan empati tanpa menyela. 2. Minta maaf atas ketidaknyamanan. 3. Tawarkan solusi: buat ulang minuman, tukar menu, atau refund. 4. Catat keluhan di sistem CRM dalam 1 jam. 5. Jika keluhan tidak dapat diselesaikan di outlet, eskalasi ke Supervisor dalam 2 jam. 6. Follow up pelanggan dalam 1x24 jam untuk memastikan kepuasan.",
    category: "Customer Service",
  },
  {
    title: "SOP Penerimaan dan Penyimpanan Bahan Baku",
    content:
      "1. Terima kiriman dari supplier dan periksa kelengkapan sesuai PO. 2. Cek tanggal kadaluarsa semua bahan. 3. Tolak bahan yang rusak atau mendekati kadaluarsa kurang dari 30 hari. 4. Simpan biji kopi di tempat kering dan sejuk (maks 25°C). 5. Simpan susu dan bahan segar di chiller (2–4°C). 6. Catat penerimaan di sistem inventaris. 7. Terapkan metode FIFO (First In First Out).",
    category: "Inventaris",
  },
  {
    title: "SOP Kebersihan dan Hygiene Outlet",
    content:
      "1. Seluruh staf wajib cuci tangan sebelum shift dan setelah dari toilet. 2. Meja pelanggan dibersihkan setiap selesai digunakan. 3. Lantai di-mop setiap 2 jam selama jam operasional. 4. Toilet diperiksa dan dibersihkan setiap 1 jam. 5. Peralatan bar dicuci dan disanitasi setiap penutupan. 6. Audit kebersihan bulanan oleh tim QC pusat.",
    category: "Kebersihan",
  },
  {
    title: "SOP Onboarding Barista Baru",
    content:
      "1. HR kirim email welcome kit berisi jadwal training dan handbook Coffe Gaul. 2. Hari 1–2: pengenalan perusahaan, nilai-nilai, dan SOP dasar. 3. Hari 3–5: training praktek mesin espresso, grinder, dan latte art bersama Head Barista. 4. Hari 6–7: praktek langsung melayani pelanggan dengan pendampingan. 5. Evaluasi di akhir minggu pertama. 6. Sertifikasi internal setelah lulus evaluasi.",
    category: "HR",
  },
  {
    title: "SOP Penggunaan Mesin Espresso",
    content:
      "1. Nyalakan mesin dan tunggu hingga suhu stabil (15–20 menit). 2. Lakukan backflush dengan air bersih sebelum pemakaian pertama. 3. Pastikan tekanan boiler berada di 1.0–1.2 bar. 4. Gunakan portafilter yang sudah dihangatkan. 5. Setelah setiap shot, flush group head selama 2 detik. 6. Bersihkan steam wand segera setelah setiap penggunaan. 7. Lakukan backflush dengan deterjen khusus setiap penutupan.",
    category: "Barista",
  },
  {
    title: "SOP Promosi dan Diskon",
    content:
      "1. Semua promosi harus disetujui oleh Marketing Manager sebelum dipublikasikan. 2. Input kode promo di sistem POS minimal 1 hari sebelum periode promo. 3. Pasang materi promosi (poster, tent card) di outlet pada hari H. 4. Barista wajib menginformasikan promo yang berlaku kepada pelanggan. 5. Evaluasi efektivitas promo dalam 3 hari setelah periode berakhir. 6. Laporan hasil promo dikirim ke Marketing Manager dan Finance.",
    category: "Marketing",
  },
  {
    title: "SOP Keamanan Kas dan Setoran Harian",
    content:
      "1. Kas register dihitung oleh 2 orang (kasir dan supervisor) setiap penutupan. 2. Selisih kas lebih dari Rp10.000 wajib dilaporkan dan dicatat. 3. Uang tunai disimpan di brankas outlet setelah penutupan. 4. Setoran ke bank dilakukan setiap hari kerja sebelum pukul 14.00 WIB. 5. Bukti setoran difoto dan diunggah ke sistem Finance. 6. Rekonsiliasi kas dilakukan mingguan oleh Finance pusat.",
    category: "Finance",
  },
];

async function seedContent() {
  try {
    console.log("🌱 Starting Coffe Gaul content seed...");

    const existingFaqs = await db.query.faqs.findFirst();
    const existingSops = await db.query.sops.findFirst();

    if (existingFaqs || existingSops) {
      console.log("✅ FAQ/SOP already present — nothing seeded.");
      console.log("   Clear the faqs and sops tables first to re-seed.");
      process.exit(0);
    }

    // ── Seed FAQ ──────────────────────────────────────────
    console.log(`🌱 Seeding ${FAQ_SEED.length} FAQ...`);
    for (const entry of FAQ_SEED) {
      const [faq] = await db
        .insert(faqs)
        .values({ ...entry, status: "draft" })
        .returning();
      console.log(`   ✓ ${faq.question}`);
    }

    // ── Seed SOP ──────────────────────────────────────────
    console.log(`🌱 Seeding ${SOP_SEED.length} SOP...`);
    const seedOwner = await db.query.users.findFirst({
      where: eq(users.role, "super_admin"),
    });
    if (!seedOwner) {
      throw new Error(
        "A super_admin account is required before seeding SOPs. Run seed:admin first.",
      );
    }

    for (const entry of SOP_SEED) {
      const [sop] = await db
        .insert(sops)
        .values({ ...entry, status: "draft" })
        .returning();

      await db.insert(sopVersions).values({
        sopId: sop.id,
        versionNumber: 1,
        title: sop.title,
        content: sop.content,
        createdBy: seedOwner.id,
      });

      console.log(`   ✓ ${sop.title}`);
    }

    console.log("✅ Seed done — 50 FAQ & 10 SOP Coffe Gaul inserted (draft).");
    console.log("   Publish them from the dashboard to embed and activate.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedContent();
