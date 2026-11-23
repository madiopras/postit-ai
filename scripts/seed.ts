try {
  process.loadEnvFile(".env");
} catch {
  // Tidak masalah jika .env tidak ada (misalnya di CI/Vercel)
}

/**
 * Seed 60 FAQ detail dan 16 SOP terstruktur untuk perusahaan Coffe Gaul
 * (PT Kopi Gaul Nusantara).
 *
 * Secara default script ini juga langsung mempublikasikan dan melakukan embedding
 * ke tabel `documents` agar langsung siap dipakai sebagai Knowledge Base AI.
 *
 * Opsi CLI:
 * - `--draft-only` : Hanya memasukkan data sebagai `draft` tanpa memanggil API embedding.
 * - `--reset`      : Menghapus data FAQ, SOP, SOP version, dan documents lama sebelum seed ulang.
 */

interface FaqSeedEntry {
  question: string;
  answer: string;
  category: string;
}

interface SopSeedEntry {
  title: string;
  category: string;
  requiresLogin: boolean;
  content: string;
}

const FAQ_SEED: FaqSeedEntry[] = [
  // ── 1. Umum & Profil Perusahaan ─────────────────────────
  {
    question: "Apa itu Coffe Gaul?",
    answer:
      "Coffe Gaul (dikelola oleh PT Kopi Gaul Nusantara) adalah jaringan kedai kopi specialty lokal Indonesia yang berdiri sejak 2019. Kami menyajikan kopi berbahan 100% biji kopi Arabika dan Robusta pilihan dari petani lokal Nusantara dengan ruang kerja modern, harga terjangkau, dan pelayanan cepat.",
    category: "Umum",
  },
  {
    question: "Di mana saja lokasi outlet Coffe Gaul?",
    answer:
      "Coffe Gaul mengoperasikan 18 outlet di 6 kota besar: Jakarta (SCBD Flagship, Kemang, Senopati, Menteng, Kelapa Gading), Bandung (Dago, Braga, Riau), Surabaya (Tunjungan Flagship, Gubeng, Citraland), Yogyakarta (Kaliurang, Prawirotaman), Bali (Canggu, Seminyak), dan Medan (Kesawan Flagship, Ring Road, Sun Plaza). Alamat detail dan tautan Google Maps tersedia di halaman Lokasi pada aplikasi atau website coffegaul.id.",
    category: "Umum",
  },
  {
    question: "Kapan jam operasional outlet dan customer service Coffe Gaul?",
    answer:
      "Jam operasional outlet reguler adalah Senin–Jumat pukul 07.00–22.00 WIB serta Sabtu–Minggu dan hari libur nasional pukul 08.00–23.00 WIB (untuk outlet Bali menyesuaikan WITA). Pesanan terakhir (last order) diterima 15 menit sebelum tutup. Layanan Customer Service aktif setiap hari pukul 08.00–21.00 WIB.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul menyediakan Wi-Fi gratis dan stopkontak?",
    answer:
      "Ya, seluruh outlet Coffe Gaul menyediakan Wi-Fi berkecepatan tinggi gratis (hingga 100 Mbps) serta stopkontak di lebih dari 70% meja pelanggan. Kata sandi Wi-Fi tercetak di bagian bawah struk pembelian dan diperbarui setiap hari pukul 07.00 WIB.",
    category: "Umum",
  },
  {
    question: "Bagaimana cara menghubungi customer service Coffe Gaul?",
    answer:
      "Anda dapat menghubungi Customer Service Coffe Gaul melalui: (1) WhatsApp resmi di 0812-8888-5674 (0812-8888-KOPI), (2) Email ke cs@coffegaul.id, (3) Live Chat di aplikasi Coffe Gaul, atau (4) Direct Message Instagram @coffegaul.id. SLA balasan pertama maksimal 15 menit pada jam operasional.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul menerima reservasi meja?",
    answer:
      "Ya, reservasi meja untuk rombongan 4–12 orang dapat dilakukan melalui aplikasi Coffe Gaul (menu Reservasi) atau menghubungi WhatsApp outlet minimal H-1 sebelum kunjungan. Meja reservasi ditahan maksimal 20 menit dari jadwal kedatangan.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul menyediakan ruang meeting?",
    answer:
      "Ya, ruang meeting privat tersedia di outlet flagship Jakarta (SCBD), Surabaya (Tunjungan), dan Medan (Kesawan) dengan kapasitas 8–15 orang. Fasilitas mencakup Smart TV 65 inci, papan tulis, colokan tiap kursi, dan Wi-Fi dedicated. Tarif mulai Rp150.000/jam atau paket minimum order F&B Rp400.000 untuk 2 jam.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul ramah hewan peliharaan (pet-friendly)?",
    answer:
      "Area outdoor di sebagian besar outlet Coffe Gaul bersifat pet-friendly (kecuali outlet di dalam mall yang mengikuti aturan pengelola gedung). Hewan peliharaan wajib menggunakan tali kekang (leash) atau pet stroller, tidak naik ke atas meja, dan pemilik bertanggung jawab atas kebersihan.",
    category: "Umum",
  },
  {
    question: "Apakah tersedia area smoking dan non-smoking di outlet?",
    answer:
      "Seluruh area indoor Coffe Gaul 100% bebas asap rokok dan vape demi kenyamanan bersama. Area khusus merokok (smoking area) disediakan di teras atau area outdoor yang terpisah dengan ventilasi terbuka.",
    category: "Umum",
  },
  {
    question: "Apakah semua menu Coffe Gaul bersertifikat Halal?",
    answer:
      "Ya, seluruh bahan baku minuman, sirup, susu, dan makanan di Coffe Gaul telah bersertifikat Halal MUI (No. ID31110004589120622) serta tidak menggunakan alkohol, rum, atau bahan turunan non-halal dalam proses pengolahan maupun penyajian.",
    category: "Umum",
  },
  {
    question: "Apakah Coffe Gaul memiliki program CSR dan ramah lingkungan?",
    answer:
      "Melalui program 'Gaul Peduli', kami menyisihkan Rp500 dari setiap penjualan kopi single origin untuk pelatihan barista gratis bagi pemuda prasejahtera dan pendampingan pascapanen petani kopi lokal. Selain itu, kami memakai gelas biodegradable berbahan PLA, sedotan kertas, dan memberikan diskon Rp3.000 bagi pelanggan yang membawa tumbler sendiri (BYOT).",
    category: "Umum",
  },
  {
    question: "Bagaimana cara menyampaikan kritik, saran, atau apresiasi barista?",
    answer:
      "Pelanggan dapat memindai QR Code 'Suara Gaul' di meja/kasir, mengisi formulir Feedback di aplikasi Coffe Gaul, atau mengirim email ke feedback@coffegaul.id. Setiap masukan yang menyertakan nomor struk akan dibaca langsung oleh tim Quality Assurance pusat.",
    category: "Umum",
  },

  // ── 2. Menu, Harga & Kustomisasi ────────────────────────
  {
    question: "Apa saja menu andalan (signature) di Coffe Gaul?",
    answer:
      "Menu andalan Coffe Gaul meliputi: (1) Es Kopi Susu Gula Aren Gaul — Rp24.000 (double ristretto + susu segar + gula aren organik), (2) Gaul Signature Latte — Rp28.000 (espresso house blend + creamy milk foam), (3) Kopi Susu Pandan Nusantara — Rp29.000, (4) V60 Manual Brew Single Origin — Rp32.000, (5) Uji Matcha Gaul — Rp32.000, dan (6) Butter Croissant Artisanal — Rp26.000.",
    category: "Menu",
  },
  {
    question: "Apakah Coffe Gaul menyediakan menu non-kopi?",
    answer:
      "Ya, tersedia beragam pilihan non-kopi seperti Belgian Dark Chocolate (Rp30.000), Uji Matcha Latte (Rp32.000), Hojicha Roasted Latte (Rp32.000), Lychee Peach Artisan Tea (Rp25.000), Berry Yogurt Smoothie (Rp34.000), dan Cold-Pressed Orange Carrot Juice (Rp28.000).",
    category: "Menu",
  },
  {
    question: "Apakah ada menu makanan berat dan pastry di Coffe Gaul?",
    answer:
      "Ya, outlet kami menyajikan menu fresh setiap hari: aneka pastry (Butter Croissant, Pain au Chocolat, Cinnamon Roll, Banana Bread mulai Rp22.000), light bites (Truffle Fries, Chicken Karaage, Grilled Cheese Sandwich mulai Rp32.000), serta makanan berat di outlet flagship & reguler (Beef Gyudon Rice Bowl, Chicken Sambal Matah Rice Bowl, Aglio Olio Pasta mulai Rp42.000).",
    category: "Menu",
  },
  {
    question: "Apakah Coffe Gaul menyediakan opsi menu vegan dan bebas laktosa?",
    answer:
      "Ya, seluruh minuman berbasis susu dapat diganti menggunakan Oat Milk (+Rp8.000), Almond Milk (+Rp8.000), atau Soy Milk (+Rp6.000). Kami juga menyediakan menu makanan nabati seperti Avocado Sourdough Toast, Mushroom Aglio Olio, dan Vegan Dark Chocolate Brownie.",
    category: "Menu",
  },
  {
    question: "Bagaimana cara mengetahui informasi alergen dan kalori pada menu?",
    answer:
      "Setiap menu pada buku menu fisik dan aplikasi Coffe Gaul dilengkapi ikon alergen (susu/dairy, kacang/nuts, gluten, kedelai, telur) serta estimasi kalori. Pelanggan dengan alergi berat wajib memberi tahu barista saat memesan agar peralatan (pitcher/shaker) disanitasi ulang sebelum digunakan.",
    category: "Menu",
  },
  {
    question: "Berapa kisaran harga minuman dan makanan di Coffe Gaul?",
    answer:
      "Harga minuman kopi hitam (Americano/Long Black) mulai Rp18.000, kopi susu signature Rp24.000–Rp34.000, manual brew & specialty seasonal Rp32.000–Rp45.000. Harga pastry mulai Rp22.000 dan makanan berat mulai Rp42.000–Rp58.000 (harga belum termasuk PB1 10%).",
    category: "Menu",
  },
  {
    question: "Pilihan ukuran gelas minuman apa saja yang tersedia?",
    answer:
      "Tersedia 3 ukuran minuman: Regular (240 ml / 8 oz — harga dasar), Large (360 ml / 12 oz — tambah Rp5.000), dan Extra Large (480 ml / 16 oz — tambah Rp10.000, khusus minuman dingin). Khusus menu espresso shot dan piccolo hanya tersedia ukuran standar.",
    category: "Menu",
  },
  {
    question: "Apakah tingkat kemanisan, es, dan shot espresso bisa dikustomisasi?",
    answer:
      "Ya, pelanggan bebas mengatur: (1) Level gula: No Sugar (0%), Less Sugar (50%), Normal (100%), Extra Sweet (125%); (2) Level es: Less Ice, Normal Ice, Extra Ice, atau No Ice (volume cairan tetap sesuai standar resep); (3) Extra Shot Espresso (+Rp6.000) atau ganti ke Decaf Espresso (+Rp5.000).",
    category: "Menu",
  },
  {
    question: "Apakah tersedia kopi tanpa kafein (Decaf)?",
    answer:
      "Ya, Coffe Gaul menyediakan biji kopi Swiss Water Process Decaf yang bebas bahan kimia dengan tambahan Rp5.000 pada setiap menu berbasis espresso.",
    category: "Menu",
  },
  {
    question: "Apakah pelanggan boleh membawa tumbler sendiri (BYOT)?",
    answer:
      "Sangat boleh! Pelanggan yang membawa tumbler pribadi bersih (kapasitas minimal sesuai ukuran pesanan) berhak mendapatkan potongan harga Rp3.000 per minuman. Promo BYOT dapat digabung dengan poin membership, namun tidak dapat digabung dengan voucher diskon persentase tertentu.",
    category: "Menu",
  },

  // ── 3. Pemesanan & Pengiriman ───────────────────────────
  {
    question: "Bagaimana cara memesan lewat aplikasi Coffe Gaul (Pick-Up & Delivery)?",
    answer:
      "Unduh aplikasi Coffe Gaul di Google Play Store atau Apple App Store → Daftar/Login akun → Pilih layanan 'Pick-Up' atau 'Delivery' → Pilih outlet terdekat → Tambahkan menu dan kustomisasi → Pilih metode pembayaran → Selesaikan transaksi. Untuk Pick-Up, tunjukkan kode order 4 digit di counter pengambilan tanpa perlu antre di kasir.",
    category: "Pemesanan",
  },
  {
    question: "Apakah Coffe Gaul tersedia di GoFood, GrabFood, dan ShopeeFood?",
    answer:
      "Ya, seluruh outlet Coffe Gaul tersedia resmi di GoFood, GrabFood, dan ShopeeFood dengan nama toko 'Coffe Gaul - [Nama Lokasi]'. Harga di platform pihak ketiga dapat berbeda sedikit mengikuti biaya layanan masing-masing platform.",
    category: "Pemesanan",
  },
  {
    question: "Berapa lama waktu tunggu pembuatan pesanan?",
    answer:
      "Standar SLA pembuatan pesanan di outlet adalah 4–7 menit untuk minuman espresso/non-kopi, 6–9 menit untuk manual brew (V60/Aeropress), dan 10–18 menit untuk makanan berat. Pada jam sibuk (08.00–10.00 dan 12.00–14.00) waktu tunggu dapat bertambah 3–5 menit.",
    category: "Pemesanan",
  },
  {
    question: "Berapa minimum order dan biaya pengiriman (ongkos kirim) delivery Coffe Gaul?",
    answer:
      "Minimum pemesanan delivery melalui aplikasi Coffe Gaul adalah Rp30.000 dengan radius maksimal 8 km dari outlet. Biaya pengiriman datar Rp10.000 untuk jarak 0–3 km, Rp15.000 untuk 3–6 km, dan Rp20.000 untuk 6–8 km. Gratis ongkos kirim berlaku untuk transaksi minimal Rp100.000 (atau Rp60.000 khusus member Gaul Gold).",
    category: "Pemesanan",
  },
  {
    question: "Apakah bisa pre-order pesanan dalam jumlah besar untuk rapat atau acara kantor?",
    answer:
      "Ya, pesanan grup (15–100 cup) dapat di-preorder minimal H-1 (atau H-2 untuk >50 cup) melalui WhatsApp 0812-8888-KOPI atau email order@coffegaul.id. Pembayaran DP minimal 50% saat konfirmasi dan pelunasan sebelum pengiriman. Tersedia paket Coffee Box (1L/2L) lengkap dengan gelas kertas, gula, dan pengaduk.",
    category: "Pemesanan",
  },
  {
    question: "Apakah pesanan yang sudah dibayar di aplikasi bisa diubah atau dibatalkan?",
    answer:
      "Pesanan di aplikasi hanya dapat dibatalkan selama status masih 'Menunggu Konfirmasi Outlet' (biasanya dalam 2 menit pertama). Jika status sudah berubah menjadi 'Sedang Diproses' oleh barista, pembatalan otomatis tidak tersedia; silakan hubungi outlet atau CS jika terjadi kesalahan input mendesak.",
    category: "Pemesanan",
  },

  // ── 4. Pembayaran & Faktur ──────────────────────────────
  {
    question: "Metode pembayaran apa saja yang diterima di Coffe Gaul?",
    answer:
      "Outlet Coffe Gaul menerima pembayaran Tunai (rupiah), QRIS (seluruh bank & e-wallet), Kartu Debit/Kredit berlogo Visa/Mastercard/GPN/JCB, GoPay, OVO, ShopeePay, Dana, serta Saldo Coffe Gaul (GaulPay) di aplikasi.",
    category: "Pembayaran",
  },
  {
    question: "Apakah ada biaya tambahan (surcharge) untuk pembayaran kartu atau QRIS?",
    answer:
      "Tidak ada. Coffe Gaul tidak mengenakan biaya tambahan (0% surcharge) untuk pembayaran menggunakan QRIS, e-wallet, kartu debit, maupun kartu kredit, tanpa syarat minimum transaksi.",
    category: "Pembayaran",
  },
  {
    question: "Bagaimana cara top-up saldo Coffe Gaul (GaulPay)?",
    answer:
      "Buka aplikasi Coffe Gaul → menu 'Saldo' → pilih 'Top-Up' → masukkan nominal (minimal Rp50.000, maksimal saldo Rp2.000.000) → pilih metode Virtual Account (BCA, Mandiri, BNI, BRI), QRIS, atau e-wallet → selesaikan pembayaran. Saldo masuk instan tanpa biaya admin jika melalui QRIS.",
    category: "Pembayaran",
  },
  {
    question: "Apakah Coffe Gaul dapat menerbitkan invoice resmi dan Faktur Pajak (PPN) untuk perusahaan?",
    answer:
      "Ya, untuk transaksi korporat, catering, atau pre-order minimal Rp500.000, tim Finance PT Kopi Gaul Nusantara dapat menerbitkan invoice resmi dan e-Faktur PPN. Kirimkan NPWP perusahaan, alamat penagihan, dan bukti transaksi ke finance@coffegaul.id maksimal 3 hari kerja setelah transaksi.",
    category: "Pembayaran",
  },

  // ── 5. Membership, Gaul Points & Promo ──────────────────
  {
    question: "Apa itu program loyalitas Gaul Points?",
    answer:
      "Gaul Points adalah program poin loyalitas resmi Coffe Gaul. Setiap transaksi kelipatan Rp10.000 (di outlet dengan scan QR member maupun di aplikasi) menghasilkan 1 Gaul Point. Poin dapat ditukar langsung dengan minuman gratis (mulai 20 poin), voucher potongan harga, pastry, atau merchandise eksklusif.",
    category: "Membership",
  },
  {
    question: "Bagaimana cara mendaftar membership Coffe Gaul?",
    answer:
      "Pendaftaran membership 100% gratis melalui aplikasi Coffe Gaul. Unduh aplikasi, masukkan nama lengkap, email aktif, tanggal lahir, dan verifikasi nomor WhatsApp/HP via OTP. Member baru langsung mendapatkan bonus selamat datang 10 Gaul Points dan voucher diskon 30% transaksi pertama.",
    category: "Membership",
  },
  {
    question: "Apa saja level (tier) membership Coffe Gaul dan keuntungannya?",
    answer:
      "Terdapat 3 tier membership berdasarkan akumulasi poin dalam 12 bulan: (1) Gaul Bronze (0–99 poin): 1 poin per Rp10.000, promo bulanan, voucher ulang tahun; (2) Gaul Silver (100–499 poin): 1,25x poin, gratis upgrade ukuran 2x/bulan, akses early seasonal menu; (3) Gaul Gold (500+ poin): 1,5x poin, gratis ongkir delivery min. Rp60.000, gratis 1 minuman pilihan tiap bulan, dan prioritas reservasi ruang meeting.",
    category: "Membership",
  },
  {
    question: "Apakah Gaul Points memiliki masa kedaluwarsa?",
    answer:
      "Ya, Gaul Points berlaku selama 12 bulan sejak tanggal perolehan poin (sistem rolling expiry). Pengingat poin yang akan hangus dikirim otomatis via notifikasi aplikasi dan email 30 hari serta 7 hari sebelum tanggal kedaluwarsa.",
    category: "Membership",
  },
  {
    question: "Promo apa saja yang tersedia untuk member Coffe Gaul?",
    answer:
      "Member mendapatkan promo rutin antara lain: 'Gaul Monday' (diskon 20% kopi susu tiap Senin pukul 07.00–11.00), 'Payday B1G1' setiap tanggal 25–28, diskon bundling kopi + pastry hemat Rp10.000, dan voucher kejutan khusus tier Silver & Gold di tab Voucher aplikasi.",
    category: "Membership",
  },
  {
    question: "Bagaimana cara klaim promo ulang tahun member Coffe Gaul?",
    answer:
      "Member yang telah melengkapi tanggal lahir minimal 7 hari sebelum hari ulang tahun akan menerima voucher 'Birthday Treat' berupa 1 minuman gratis ukuran Regular/Large (maksimal harga Rp40.000). Voucher muncul otomatis di aplikasi pada hari H dan berlaku hingga H+7 tanpa minimal pembelian.",
    category: "Membership",
  },
  {
    question: "Apakah Coffe Gaul memiliki program referral ajak teman?",
    answer:
      "Ya! Bagikan kode referral pribadi Anda di menu Profil → Ajak Teman. Saat teman mendaftar dan menyelesaikan transaksi pertama minimal Rp30.000, Anda dan teman Anda masing-masing otomatis mendapatkan voucher diskon Rp15.000 (maksimal 10 referral per bulan).",
    category: "Membership",
  },

  // ── 6. Produk Retail, Biji Kopi & Merchandise ───────────
  {
    question: "Apakah Coffe Gaul menjual biji kopi (roasted beans) dan bisa digilingkan?",
    answer:
      "Ya, kami menjual House Blend dan Single Origin Roasted Beans dalam kemasan 100g (mulai Rp45.000), 250g (mulai Rp95.000), dan 1kg (mulai Rp320.000). Pelanggan dapat memilih bentuk utuh (whole bean) atau minta digiling gratis sesuai metode seduh: Fine (Espresso), Medium-Fine (Moka Pot/Aeropress), Medium (V60/Pour Over), atau Coarse (French Press/Cold Brew).",
    category: "Produk",
  },
  {
    question: "Dari daerah mana saja asal biji kopi Coffe Gaul?",
    answer:
      "Coffe Gaul bermitra langsung (direct trade) dengan koperasi petani kopi di 6 daerah unggulan Indonesia: Aceh Gayo (floral & cokelat), Sumatra Mandailing (earthy & rempah), Java Preanger (karamel & teh hitam), Bali Kintamani (sitrus segar), Flores Bajawa (nutty & kakao), dan Toraja Sapan (manis gula merah & herbal).",
    category: "Produk",
  },
  {
    question: "Apakah Coffe Gaul menyediakan kopi ready-to-drink (botolan 1 liter)?",
    answer:
      "Ya, lini 'Gaul Bottle' tersedia dalam ukuran 250 ml (mulai Rp26.000) dan 1 Liter (mulai Rp85.000) dengan varian Es Kopi Susu Gula Aren, Gaul Latte, Americano Cold Brew, Matcha, dan Dark Chocolate. Simpan di kulkas suhu 2–4°C; daya tahan maksimal 4 hari untuk varian susu dan 7 hari untuk kopi hitam sejak tanggal produksi.",
    category: "Produk",
  },
  {
    question: "Apakah Coffe Gaul menjual merchandise resmi?",
    answer:
      "Ya, tersedia merchandise resmi Coffe Gaul di outlet dan official store Tokopedia/Shopee ('Coffe Gaul Official'): Insulated Stainless Tumbler 500ml (Rp185.000), Ceramic Mug (Rp95.000), Canvas Tote Bag (Rp85.000), Kaos Oversized (Rp165.000), serta dripper V60 dan server kaca.",
    category: "Produk",
  },
  {
    question: "Bagaimana layanan langganan kopi bulanan (Gaul Subscription)?",
    answer:
      "Gaul Subscription mengirimkan biji kopi fresh roast (maksimal 5 hari sejak tanggal sangrai) langsung ke rumah atau kantor Anda setiap bulan. Paket mulai Rp89.000/bulan untuk 250g atau Rp165.000/bulan untuk 500g sudah termasuk gratis ongkos kirim se-Pulau Jawa & Sumatra. Langganan bisa dijeda atau dibatalkan kapan saja via aplikasi.",
    category: "Produk",
  },
  {
    question: "Bagaimana kebijakan garansi produk merchandise dan alat seduh Coffe Gaul?",
    answer:
      "Merchandise resmi (tumbler, mug, alat seduh) dilindungi garansi penggantian unit baru selama 14 hari kalender sejak pembelian (atau 30 hari untuk cacat fungsi insulasi tumbler) jika ditemukan cacat pabrik atau kerusakan pengiriman, dengan syarat menyertakan struk pembelian dan video unboxing (untuk pembelian online).",
    category: "Produk",
  },

  // ── 7. Kebijakan Pelanggan & Refund ─────────────────────
  {
    question: "Bagaimana kebijakan refund (pengembalian dana) di Coffe Gaul?",
    answer:
      "Refund penuh atau sebagian dapat diajukan jika pesanan salah, tumpah/rusak parah saat diterima, terdapat benda asing, atau terjadi pembayaran ganda (double charge). Pengajuan maksimal 30 menit setelah pesanan diterima (atau 24 jam khusus kasus double charge) melalui kasir outlet atau CS WhatsApp dengan bukti struk & foto. Pengembalian dana ke Saldo GaulPay diproses instan (<1 jam), sedangkan ke rekening bank/kartu memakan waktu 3–5 hari kerja.",
    category: "Kebijakan",
  },
  {
    question: "Apakah minuman atau makanan bisa ditukar di outlet jika rasa tidak sesuai?",
    answer:
      "Ya, Coffe Gaul memberikan 'Garansi Rasa Gaul': jika rasa minuman terlalu pahit/manis, suhu tidak sesuai, atau salah resep, pelanggan dapat meminta pembuatan ulang (remake) atau penukaran menu gratis di kasir dalam 10 menit setelah pesanan diterima dengan menunjukkan struk dan minuman yang belum habis lebih dari sepertiga.",
    category: "Kebijakan",
  },
  {
    question: "Bagaimana jika barang pribadi tertinggal di outlet Coffe Gaul?",
    answer:
      "Barang tertinggal dicatat oleh Supervisor Outlet ke dalam buku Lost & Found dan disimpan aman di ruang staf selama maksimal 30 hari kalender. Hubungi CS WhatsApp 0812-8888-KOPI dengan menyebutkan lokasi outlet, waktu kunjungan, dan ciri barang. Pengambilan barang memerlukan verifikasi identitas (KTP/SIM).",
    category: "Kebijakan",
  },
  {
    question: "Bagaimana kebijakan privasi dan keamanan data pelanggan Coffe Gaul?",
    answer:
      "Coffe Gaul mematuhi UU Pelindungan Data Pribadi (UU PDP). Seluruh data akun dan transaksi pelanggan dienkripsi menggunakan standar AES-256 dan TLS 1.3, tidak pernah dijual ke pihak ketiga, dan hanya digunakan untuk pemrosesan pesanan, poin loyalitas, serta komunikasi promo jika pelanggan memberikan persetujuan (opt-in).",
    category: "Kebijakan",
  },

  // ── 8. Akun Aplikasi & Kendala Teknis ───────────────────
  {
    question: "Bagaimana cara reset password akun aplikasi Coffe Gaul?",
    answer:
      "Buka aplikasi Coffe Gaul → ketuk 'Masuk' → pilih 'Lupa Password?' → masukkan alamat email atau nomor HP terdaftar → masukkan kode OTP 6 digit yang dikirim (berlaku 5 menit) → buat kata sandi baru minimal 8 karakter yang mengandung huruf besar, huruf kecil, dan angka → simpan. Jika email/HP sudah tidak aktif, hubungi CS di cs@coffegaul.id untuk verifikasi manual.",
    category: "Akun",
  },
  {
    question: "Bagaimana cara mengubah nama, email, atau nomor HP di akun aplikasi?",
    answer:
      "Masuk ke aplikasi Coffe Gaul → tab 'Profil' → pilih 'Edit Profil' → ubah data yang diinginkan → lakukan verifikasi OTP jika mengganti email atau nomor HP → ketuk 'Simpan Perubahan'. Perubahan tanggal lahir hanya dapat dilakukan 1 kali atau melalui bantuan CS dengan foto KTP.",
    category: "Akun",
  },
  {
    question: "Mengapa kode OTP tidak masuk saat login atau mendaftar?",
    answer:
      "Pastikan nomor WhatsApp/SMS aktif, sinyal stabil, dan format nomor diawali +62/08 tanpa spasi. Tunggu 60 detik lalu tekan 'Kirim Ulang OTP' atau pilih kanal alternatif (WhatsApp / Email). Jika masih gagal setelah 3 kali percobaan, hubungi CS di 0812-8888-KOPI karena akun mungkin terkena pembatasan sementara (rate limit 15 menit).",
    category: "Akun",
  },
  {
    question: "Bagaimana cara menghapus akun Coffe Gaul secara permanen?",
    answer:
      "Ajukan penghapusan akun melalui menu Profil → Pengaturan Akun → Hapus Akun, atau kirim email dari alamat terdaftar ke cs@coffegaul.id dengan subjek 'Permintaan Hapus Akun'. Pastikan saldo GaulPay sudah Rp0 dan tidak ada pesanan aktif. Penghapusan data diproses maksimal 7 hari kerja sesuai UU PDP; poin dan voucher tersisa akan hangus permanen.",
    category: "Akun",
  },

  // ── 9. Karir & Rekrutmen ────────────────────────────────
  {
    question: "Bagaimana cara melamar kerja di Coffe Gaul?",
    answer:
      "Kirimkan CV terbaru (format PDF maks. 2 MB) dan surat lamaran melalui portal karir.coffegaul.id atau email karir@coffegaul.id dengan format subjek: [Posisi] - [Kota Penempatan] - [Nama Lengkap]. Rekrutmen resmi Coffe Gaul tidak pernah memungut biaya apa pun.",
    category: "Karir",
  },
  {
    question: "Posisi apa saja yang rutin dibuka di Coffe Gaul?",
    answer:
      "Untuk tim outlet: Barista (Full-time & Part-time), Cashier/Crew, Kitchen Crew, Head Barista, dan Store Supervisor. Untuk kantor pusat (HQ Jakarta & Regional Hub Medan/Surabaya): Quality Assurance, Supply Chain, Finance & Accounting, HRD, Digital Marketing, dan IT Support.",
    category: "Karir",
  },
  {
    question: "Apakah Coffe Gaul membuka program magang (internship)?",
    answer:
      "Ya, program 'Gaul Apprentice' terbuka bagi mahasiswa aktif semester 5 ke atas atau lulusan baru dengan durasi minimal 3 bulan (maksimal 6 bulan) di divisi Marketing, HR, Supply Chain, QA, dan Operasional. Peserta magang menerima uang saku bulanan, sertifikat resmi, dan peluang diangkat menjadi karyawan tetap.",
    category: "Karir",
  },
  {
    question: "Apakah pelamar posisi Barista wajib memiliki pengalaman sebelumnya?",
    answer:
      "Tidak wajib untuk posisi Junior Barista! Coffe Gaul menyediakan pelatihan terstruktur selama 14 hari di Coffe Gaul Training Academy (berbayar penuh sejak hari pertama) mencakup teori kopi, kalibrasi espresso, latte art, dan hospitality.",
    category: "Karir",
  },

  // ── 10. Kemitraan, Catering & B2B ───────────────────────
  {
    question: "Apakah Coffe Gaul membuka peluang franchise atau waralaba?",
    answer:
      "Saat ini seluruh outlet Coffe Gaul dikelola secara langsung oleh perusahaan (100% company-owned) demi menjaga standar kualitas kopi dan pelayanan. Kami belum membuka skema franchise pihak ketiga. Harap waspada terhadap pihak tidak resmi yang mengatasnamakan franchise Coffe Gaul.",
    category: "Kemitraan",
  },
  {
    question: "Apakah Coffe Gaul melayani coffee catering untuk pernikahan, seminar, atau acara kantor?",
    answer:
      "Ya! Layanan 'Gaul Coffee Cart' melayani coffee catering untuk pernikahan, konferensi, peluncuran produk, dan acara kantor mulai dari 50 cup (mulai Rp1.650.000) hingga 1.000+ cup. Paket sudah termasuk 2 barista profesional, mesin espresso portable/booth estetik, bahan baku lengkap, dan durasi layanan 4 jam. Booking minimal H-7 ke partnership@coffegaul.id atau WhatsApp 0812-8888-KOPI.",
    category: "Kemitraan",
  },
  {
    question: "Apakah Coffe Gaul menyediakan suplai biji kopi B2B untuk kantor, hotel, atau kafe lain?",
    answer:
      "Ya, divisi Roastery B2B PT Kopi Gaul Nusantara menyediakan pasokan biji kopi House Blend dan Single Origin secara rutin (minimal 10 kg/bulan) untuk pantry kantor, hotel, dan restoran, lengkap dengan opsi sewa/maintenance mesin kopi otomatis. Hubungi b2b@coffegaul.id untuk permintaan sampel gratis (cupping sample).",
    category: "Kemitraan",
  },
  {
    question: "Bagaimana cara mengajukan kolaborasi brand, komunitas, atau sponsorship event?",
    answer:
      "Kirimkan deck proposal lengkap (profil komunitas/acara, tanggal, lokasi, estimasi peserta, dan bentuk kerja sama yang diajukan) ke partnership@coffegaul.id minimal 21 hari sebelum tanggal acara. Tim Brand Partnership akan merespons dalam maksimal 5 hari kerja.",
    category: "Kemitraan",
  },
];

const SOP_SEED: SopSeedEntry[] = [
  // ── 1. SOP Pembukaan Outlet Harian (Publik) ─────────────
  {
    title: "SOP-OPS-001: SOP Pembukaan Outlet Harian Coffe Gaul",
    category: "Operasional",
    requiresLogin: false,
    content: `# SOP-OPS-001: Pembukaan Outlet Harian Coffe Gaul

## 1. Tujuan & Ruang Lingkup
Memastikan seluruh outlet Coffe Gaul siap beroperasi tepat waktu dengan standar kebersihan, kualitas mesin, ketersediaan stok, dan kesiapan kasir yang konsisten setiap hari. Berlaku bagi seluruh Store Supervisor, Barista Shift Pagi, dan Cashier Shift Pagi.

## 2. Penanggung Jawab (PIC)
- **Penanggung Jawab Utama:** Shift Leader / Store Supervisor Shift Pagi.
- **Pelaksana:** Barista Shift Pagi & Cashier Shift Pagi.

## 3. Prosedur Langkah-demi-Langkah (T-30 hingga Jam Buka)
1. **Kedatangan & Absensi (T-30 menit):** Seluruh kru shift pagi wajib hadir minimal 30 menit sebelum jam operasional (06.30 WIB hari kerja / 07.30 WIB akhir pekan), melakukan absensi biometrik/aplikasi HRIS, berganti seragam lengkap (kaos/kemeja Coffe Gaul, apron bersih, sepatu tertutup anti-slip, name tag), dan mencuci tangan 6 langkah.
2. **Keamanan & Utilitas (T-28 menit):** Nonaktifkan alarm keamanan, nyalakan panel listrik utama, AC (atur suhu ruang 23–24°C), pencahayaan indoor/signage, serta sistem audio dengan playlist resmi Coffe Gaul (volume 40–50%).
3. **Nyalakan Peralatan Bar (T-25 menit):** Nyalakan mesin espresso, water boiler, showcase pastry, dan oven/toaster. Pastikan tekanan boiler mesin espresso mencapai 1,0–1,2 bar dan suhu brew head stabil di 92–94°C (waktu pemanasan 15–20 menit).
4. **Kebersihan & Sanitasi Area (T-20 menit):** Periksa kembali area bar, meja pelanggan, kursi, kaca depan, area outdoor, dan toilet. Pastikan tidak ada debu, noda air, atau sampah tersisa dari shift sebelumnya. Siapkan kain lap terpisah berkode warna (biru untuk meja, kuning untuk bar, putih bersih khusus steam wand).
5. **Kalibrasi Espresso (Dial-In) (T-15 menit):** Lakukan flushing group head selama 5 detik, isi hopper dengan biji kopi sesuai label roast date (FIFO), lalu kalibrasi resep standar: dosis 18g, yield 36g (±2g), waktu ekstraksi 26–30 detik. Cicipi hasil ekstraksi dan catat parameter dial-in di *Opening Logbook*.
6. **Pengecekan Stok & Display (T-10 menit):** Verifikasi stok susu segar (suhu chiller 2–4°C), oat/almond milk, sirup, gula aren, es batu, gelas PLA semua ukuran, tutup gelas, dan sedotan. Tata pastry fresh ke dalam showcase lengkap dengan label harga dan alergen.
7. **Persiapan POS & Kas Awal (T-10 menit):** Nyalakan tablet POS, printer struk, mesin EDC, dan QRIS display. Buka sesi shift POS (*Open Shift*) dan hitung modal kas awal (petty float) standar sebesar **Rp500.000** dalam pecahan kecil bersama Shift Leader. Cek aktifkan aplikasi GoFood, GrabFood, ShopeeFood, dan aplikasi Coffe Gaul.
8. **Briefing 3 Menit & Buka Pintu (T-0):** Lakukan briefing singkat terkait target penjualan harian, promo aktif, dan menu kosong (86 list). Buka pintu outlet tepat pukul 07.00 WIB (atau 08.00 WIB akhir pekan) dan pasang papan "OPEN".

## 4. Standar Kualitas & KPI
- Outlet wajib buka tepat waktu (toleransi keterlambatan 0 menit).
- Parameter kalibrasi espresso wajib dicatat sebelum gelas pertama disajikan.
- Checklist pembukaan harian wajib disubmit di aplikasi Operasional maksimal 15 menit setelah jam buka.

## 5. Eskalasi
Jika mesin espresso gagal memanas, listrik padam, atau sistem POS error, Shift Leader wajib melapor ke Area Manager dan grup IT/Maintenance Support maksimal dalam 10 menit sebelum jam buka untuk mengaktifkan prosedur kontinjensi (penjualan manual / penutupan sementara aplikasi online).`,
  },

  // ── 2. SOP Penutupan Outlet Harian (Publik) ─────────────
  {
    title: "SOP-OPS-002: SOP Penutupan Outlet Harian Coffe Gaul",
    category: "Operasional",
    requiresLogin: false,
    content: `# SOP-OPS-002: Penutupan Outlet Harian Coffe Gaul

## 1. Tujuan & Ruang Lingkup
Menjamin proses penutupan outlet berjalan aman, higienis, bebas hama, dan akurat secara pencatatan keuangan maupun stok. Berlaku untuk seluruh tim Shift Malam.

## 2. Prosedur Langkah-demi-Langkah
1. **Last Order (T-15 menit sebelum tutup):** Matikan penerimaan pesanan online (GoFood/GrabFood/ShopeeFood/App) 20 menit sebelum tutup. Informasikan dengan sopan kepada pelanggan dine-in bahwa *last order* adalah 15 menit sebelum jam tutup.
2. **Pembersihan Mesin Espresso & Grinder (T-0):**
   - Lakukan *chemical backflush* pada seluruh group head menggunakan bubuk pembersih food-grade (3g per group) sebanyak 5 siklus, diikuti pembilasan air bersih minimal 10 siklus.
   - Rendam portafilter, filter basket, dan shower screen dalam larutan air hangat + pembersih selama 15 menit, lalu bilas dan keringkan.
   - Bersihkan steam wand, lap dengan kain khusus, dan purge uap.
   - Kosongkan sisa biji kopi di hopper ke wadah kedap udara berlabel tanggal, lalu sikat burr/chute grinder dari serbuk kopi.
3. **Pengelolaan Bahan Baku & Waste:**
   - Simpan susu terbuka (diberi label tanggal & jam buka, maksimal pakai 48 jam), sirup, dan saus ke dalam chiller suhu 2–4°C.
   - Catat sisa pastry dan bahan kedaluwarsa ke dalam *Daily Waste Log* (dilengkapi foto) sebelum dimusnahkan. Tidak diperbolehkan membawa pulang waste tanpa izin tertulis Store Supervisor.
4. **Sanitasi Bar, Dapur, & Area Pelanggan:** Cuci seluruh pitcher, shaker, gelas, dan peralatan makan dengan metode 3 bak (cuci – bilas – sanitasi). Kosongkan knock box, ikat rapat seluruh kantong sampah, buang ke TPS gedung/outlet, lalu sapu dan pel lantai dengan cairan disinfektan food-safe.
5. **Tutup Kas & Rekonsiliasi POS:**
   - Lakukan perhitungan fisik uang tunai oleh **2 orang** (Kasir + Shift Leader) dan cocokkan dengan laporan *Close Shift POS*.
   - Pisahkan modal awal Rp500.000 untuk shift pagi berikutnya, dan masukkan seluruh uang penjualan harian beserta struk settlement EDC ke dalam amplop setoran bersegel di brankas.
   - Kirim foto laporan Z-Report POS dan rekap penjualan ke grup Finance Outlet.
6. **Pengecekan Listrik & Penguncian:** Matikan mesin espresso, grinder, AC, audio, lampu utama, dan kompor/oven. **Pastikan chiller, freezer, CCTV, dan router Wi-Fi tetap menyala.** Kunci seluruh pintu akses, aktifkan alarm keamanan, dan lakukan dokumentasi foto gembok/panel listrik di grup Operasional.

## 3. Batas Waktu
Seluruh rangkaian penutupan diselesaikan maksimal **45 menit** setelah jam operasional berakhir.`,
  },

  // ── 3. SOP Penyajian Minuman Kopi & Kalibrasi (Publik) ──
  {
    title: "SOP-BAR-001: SOP Penyajian Minuman Kopi & Kalibrasi Espresso",
    category: "Barista",
    requiresLogin: false,
    content: `# SOP-BAR-001: Penyajian Minuman Kopi & Kalibrasi Espresso

## 1. Tujuan
Menjaga konsistensi rasa, aroma, suhu, dan tampilan setiap cangkir kopi di seluruh outlet Coffe Gaul sesuai standar *Specialty Coffee Association (SCA)* dan resep resmi perusahaan.

## 2. Standar Resep Dasar Espresso (House Blend Coffe Gaul)
- **Dosis Kopi (Dose):** 18,0 gram (±0,2g) untuk double shot basket.
- **Hasil Ekstraksi (Yield):** 36,0 gram (±2,0g) — rasio 1:2 (atau 28–30g untuk ristretto pada menu Es Kopi Susu Gula Aren).
- **Waktu Ekstraksi:** 26–30 detik pada suhu air 93°C dan tekanan pompa 9 bar.
- **Umur Sangrai (Roast Window):** Biji kopi digunakan pada hari ke-7 hingga maksimal hari ke-35 sejak tanggal sangrai (*roast date*).

## 3. Langkah Penyajian Minuman Berbasis Espresso
1. **Verifikasi Pesanan:** Baca tiket order dari layar KDS/POS secara teliti meliputi nama menu, ukuran (Regular 240ml / Large 360ml / XL 480ml), panas/dingin, jenis susu (fresh milk / oat / almond / soy), level gula, dan catatan alergi.
2. **Persiapan Shot:** Bersihkan portafilter dengan kain kering, giling kopi tepat sesuai dosis (timbang dengan timbangan digital akurasi 0,1g), ratakan dengan distributor, lalu lakukan *tamping* rata dan tegak lurus dengan tekanan konsisten ~15 kg.
3. **Flushing & Ekstraksi:** Flush group head 2 detik, kunci portafilter, dan mulai ekstraksi maksimal dalam 3 detik agar bubuk kopi tidak gosong (*scorching*).
4. **Steaming Susu (Minuman Panas):** Gunakan susu dingin (2–4°C) dari chiller. Purge steam wand sebelum dan sesudah steaming. Panaskan susu hingga suhu optimal **60–65°C** (maksimal 60°C untuk susu oat/almond/soy agar tidak pecah) dengan tekstur *microfoam* halus mengilap.
5. **Perakitan Minuman Dingin:** Takar sirup/gula aren menggunakan jigger terkalibrasi (bukan kira-kira), tuang susu sesuai takaran resep (130ml untuk Regular, 180ml untuk Large), tambahkan es batu kristal 100–120g, lalu tuangkan espresso segar di bagian atas.
6. **Finishing & Penyerahan:** Lakukan latte art standar (heart/tulip/rosetta) untuk minuman panas dine-in. Pasang tutup gelas rapat dan *sleeve* pelindung panas untuk takeaway. Panggil nama pelanggan dengan ramah, sebutkan nama menu beserta kustomisasinya, dan ucapkan *"Selamat menikmati kopi Anda di Coffe Gaul!"*.

## 4. Kalibrasi Ulang & Penolakan Shot
- Barista wajib mengecek ulang waktu ekstraksi setiap pergantian shift atau saat kelembapan udara berubah drastis.
- Shot dengan waktu ekstraksi <23 detik (under-extracted/asam tajam) atau >34 detik (over-extracted/pahit gosong) **wajib dibuang** dan dibuat ulang sebelum disajikan.`,
  },

  // ── 4. SOP Mesin Espresso & Grinder (Publik) ────────────
  {
    title: "SOP-BAR-002: SOP Pengoperasian dan Perawatan Mesin Espresso & Grinder",
    category: "Barista",
    requiresLogin: false,
    content: `# SOP-BAR-002: Pengoperasian & Perawatan Mesin Espresso & Grinder

## 1. Tujuan
Menjamin keamanan operator, keawetan peralatan bar bernilai tinggi, dan kualitas rasa kopi bebas residu minyak kopi tengik.

## 2. Pengoperasian Harian Mesin Espresso
1. **Pemeriksaan Air & Tekanan:** Pastikan keran suplai air dan filter *water softener* terbuka sebelum menyalakan mesin. Cek pressure gauge: tekanan boiler uap harus berada di **1,0–1,2 bar** dan tekanan pompa saat ekstraksi di **8,5–9,0 bar**.
2. **Kebiasaan Wajib Setiap Shot:**
   - Selalu lakukan *flush* group head selama 2 detik setelah melepas portafilter.
   - Lap ujung *steam wand* segera dengan kain lembap khusus dan *purge* uap 1–2 detik setelah setiap kali steaming susu agar lubang nozzle tidak tersumbat kerak susu.
   - Jangan pernah membiarkan portafilter kosong terlepas terlalu lama; pasang kembali di group head agar tetap hangat.

## 3. Jadwal Perawatan Berkala
- **Harian (Closing):** *Chemical backflush* dengan detergent food-grade, rendam portafilter & basket, bersihkan drip tray dan bodi mesin, sikat chute grinder.
- **Mingguan (Setiap Minggu Malam):** Lepas dan bersihkan *shower screen* serta *dispersion block*, cuci hopper grinder dengan air sabun hangat lalu keringkan total sebelum diisi biji kopi, dan bersihkan burr grinder menggunakan tablet pembersih khusus (*grindz*).
- **Bulanan (Tim Teknisi Pusat):** Pengujian kualitas TDS air (target 80–130 ppm), pengecekan gasket group head, kalibrasi tekanan pompa & PID suhu, serta pemeriksaan keausan burr grinder (penggantian burr setiap 400–500 kg pemakaian).

## 4. Penanganan Gangguan Darurat
- Jika muncul kebocoran air, bau terbakar, atau tekanan boiler melebihi 1,6 bar: segera matikan sakelar utama mesin, cabut/matikan MCB jalur mesin bar, pasang tanda "Dalam Perbaikan", dan laporkan tiket *Urgent* ke tim Maintenance Pusat (SLA teknisi maksimal 4 jam untuk kota besar).`,
  },

  // ── 5. SOP Penanganan Komplain Pelanggan (Publik) ───────
  {
    title: "SOP-CS-001: SOP Penanganan Komplain dan Keluhan Pelanggan",
    category: "Customer Service",
    requiresLogin: false,
    content: `# SOP-CS-001: Penanganan Komplain dan Keluhan Pelanggan

## 1. Tujuan & Prinsip Utama (Metode L-E-A-R-N)
Setiap keluhan pelanggan adalah kesempatan memperbaiki layanan dan mempertahankan loyalitas. Seluruh staf outlet dan CS wajib menerapkan metode **L-E-A-R-N**:
- **L — Listen (Dengarkan):** Dengarkan keluhan pelanggan secara aktif dengan kontak mata yang baik tanpa memotong pembicaraan atau bersikap defensif.
- **E — Empathize (Empati):** Tunjukkan pemahaman atas ketidaknyamanan yang dialami pelanggan.
- **A — Apologize (Minta Maaf):** Sampaikan permintaan maaf yang tulus atas nama Coffe Gaul tanpa menyalahkan rekan kerja, sistem, atau pelanggan.
- **R — Resolve (Solusi Cepat):** Berikan solusi langsung sesuai wewenang di tempat.
- **N — Notify & Follow-up (Catat & Tindak Lanjut):** Dokumentasikan insiden di sistem CRM dan pastikan pelanggan puas.

## 2. Kategori Komplain & Wewenang Solusi di Outlet
- **Tingkat 1 — Ringan (Rasa tidak sesuai, suhu kurang panas/dingin, salah topping, antrean agak lama):**
  - **Wewenang:** Barista / Kasir langsung membuat ulang (*remake*) minuman secara gratis dalam maksimal 5 menit atau menukar dengan menu setara.
- **Tingkat 2 — Menengah (Pesanan delivery tumpah/salah item, pelayanan staf kurang ramah, kendala voucher/pembayaran):**
  - **Wewenang:** Store Supervisor menawarkan remake/pengiriman ulang, refund penuh sesuai SOP Refund, serta kompensasi 1 voucher minuman gratis untuk kunjungan berikutnya.
- **Tingkat 3 — Berat / Kritis (Temuan benda asing di makanan/minuman, dugaan keracunan/alergi, insiden keselamatan fisik, atau komplain viral di media sosial):**
  - **Wewenang:** Store Supervisor wajib segera mengamankan bukti produk (jangan dibuang!), memberi pertolongan pertama bila diperlukan, dan melakukan **eskalasi maksimal dalam 30 menit** ke Area Manager, Head of QA, dan Corporate Communication.

## 3. SLA Pencatatan & Follow-Up
1. Seluruh komplain (online maupun offline) wajib dicatat di sistem CRM maksimal **1 jam** setelah kejadian (cantumkan waktu, outlet, nomor struk, kategori, dan solusi yang diberikan).
2. Jika tidak selesai di outlet, eskalasi ke Supervisor/CS Pusat wajib dilakukan maksimal **2 jam**.
3. Tim Customer Service wajib melakukan *follow-up* ramah kepada pelanggan (khusus Tingkat 2 & 3) dalam **1x24 jam** untuk memastikan masalah tuntas.`,
  },

  // ── 6. SOP Prosedur Refund & Penukaran (Publik) ─────────
  {
    title: "SOP-CS-002: SOP Prosedur Refund dan Penukaran Pesanan Pelanggan",
    category: "Customer Service",
    requiresLogin: false,
    content: `# SOP-CS-002: Prosedur Refund dan Penukaran Pesanan Pelanggan

## 1. Tujuan
Memberikan panduan yang transparan, cepat, dan terkendali untuk proses penukaran menu (*exchange*) dan pengembalian dana (*refund*) baik di outlet maupun transaksi aplikasi/delivery.

## 2. Kriteria yang Berhak Mendapatkan Refund atau Penukaran
1. Produk tidak sesuai pesanan (salah menu, salah ukuran, salah jenis susu, atau salah level gula).
2. Kualitas produk cacat (minuman basi/pecah, makanan dingin/mentah, kemasan delivery bocor parah >30% isi tumpah, atau terdapat kontaminasi).
3. Kesalahan penagihan (*double charge*) pada QRIS, kartu debit/kredit, atau aplikasi Coffe Gaul.
4. Pesanan aplikasi dibatalkan karena stok di outlet mendadak habis setelah pembayaran berhasil.

## 3. Batas Waktu Pengajuan
- **Penukaran di Outlet:** Maksimal **10 menit** setelah pesanan diserahkan, dengan menunjukkan struk fisik/digital dan sisa produk minimal 2/3 bagian.
- **Pengajuan Refund Kualitas/Salah Pesanan:** Maksimal **30 menit** setelah pesanan diterima (melalui outlet atau WhatsApp CS 0812-8888-KOPI disertai foto produk & nomor order).
- **Kasus Double Charge / Kegagalan Sistem Pembayaran:** Maksimal **1x24 jam** sejak waktu transaksi dengan melampirkan bukti mutasi/struk.

## 4. Alur Eksekusi & Otorisasi
1. **Verifikasi:** Kasir/CS memverifikasi nomor struk di POS, bukti foto/mutasi, serta alasan refund.
2. **Otorisasi:**
   - Refund hingga **Rp100.000:** Disetujui langsung oleh Store Supervisor menggunakan PIN otorisasi POS.
   - Refund **Rp100.001 – Rp500.000:** Disetujui oleh Area Manager / CS Team Lead.
   - Refund **> Rp500.000:** Disetujui oleh Finance Manager.
3. **Metode & SLA Pengembalian Dana:**
   - **Pembayaran Tunai di Outlet:** Dikembalikan tunai di tempat setelah pelanggan menandatangani formulir bukti refund POS.
   - **Saldo Coffe Gaul (GaulPay):** Dikembalikan instan ke saldo aplikasi maksimal **1 jam** setelah persetujuan.
   - **QRIS / Transfer Bank / Kartu Debit & Kredit:** Diproses oleh tim Finance pusat dalam **3–5 hari kerja** (penerima menerima notifikasi bukti transfer via email/WhatsApp).
   - **GoFood / GrabFood / ShopeeFood:** Diarahkan melalui pusat bantuan platform terkait dengan surat/kode konfirmasi dari outlet jika diperlukan.`,
  },

  // ── 7. SOP Penerimaan & Penyimpanan Bahan Baku (Publik) ─
  {
    title: "SOP-INV-001: SOP Penerimaan, Penyimpanan, dan Stock Opname Bahan Baku",
    category: "Inventaris",
    requiresLogin: false,
    content: `# SOP-INV-001: Penerimaan, Penyimpanan, dan Stock Opname Bahan Baku

## 1. Tujuan
Menjamin kesegaran bahan baku, mencegah kerusakan/kedaluwarsa, menjaga akurasi stok, serta mengendalikan biaya bahan pokok (*COGS*).

## 2. Prosedur Penerimaan Barang (Receiving)
1. Penerimaan barang dari Central Kitchen / Roastery / Supplier resmi hanya dilakukan pada jam non-sibuk (07.30–10.30 atau 14.00–16.30 WIB) dan didampingi minimal 1 orang Shift Leader.
2. Cocokkan jumlah, berat, dan spesifikasi barang fisik dengan dokumen **Purchase Order (PO)** dan Surat Jalan.
3. **Inspeksi Kualitas & Suhu:**
   - Susu segar, krim, dan bahan dingin wajib datang dengan suhu **2–4°C** (ukur dengan termometer inframerah/probe).
   - Bahan beku (frozen pastry/protein) wajib bersuhu **≤ -18°C** tanpa tanda pencairan ulang.
   - **Kriteria Penolakan:** Tolak barang yang kemasannya penyok/bocor, berbau tidak normal, atau sisa masa kedaluwarsanya kurang dari **30 hari** (atau kurang dari 7 hari khusus susu segar pasteurisasi).
4. Input penerimaan ke sistem inventaris ERP maksimal 2 jam setelah barang diterima dan lampirkan foto surat jalan bertanda tangan.

## 3. Standar Penyimpanan (FIFO & FEFO)
- Terapkan metode **FIFO (First In, First Out)** dan **FEFO (First Expired, First Out)** secara ketat: barang dengan tanggal kedaluwarsa terdekat selalu diletakkan di barisan paling depan.
- **Dry Storage (Suhu 18–25°C, kelembapan <60%):** Simpan biji kopi, sirup belum dibuka, bubuk matcha/cokelat, dan kemasan cup di atas rak minimal **15 cm dari lantai** dan 5 cm dari dinding.
- **Chiller (2–4°C):** Pisahkan rak bahan siap santap (atas) dari bahan mentah (bawah). Setiap kemasan yang sudah dibuka wajib diberi **stiker label daya tahan (shelf-life sticker)** berisi nama bahan, tanggal/jam buka, tanggal buang, dan inisial staf.
- **Bahan Kimia Pembersih:** Wajib disimpan di lemari tertutup terpisah jauh dari area bahan makanan/minuman.

## 4. Stock Opname (SO)
- **SO Harian:** Biji kopi, susu segar, pastry, dan cup semua ukuran dilakukan setiap penutupan shift malam.
- **SO Mingguan:** Seluruh bahan baku inti oleh Store Supervisor setiap hari Minggu malam.
- **SO Bulanan:** Audit penuh seluruh item bersama tim Finance/Inventory pusat setiap akhir bulan. Toleransi selisih stok (*variance*) maksimal **±1,5%**; selisih di atas ambang batas wajib dibuatkan Berita Acara Investigasi.`,
  },

  // ── 8. SOP Kebersihan & Hygiene (Publik) ────────────────
  {
    title: "SOP-QA-001: SOP Kebersihan, Sanitasi, dan Food Safety Outlet",
    category: "Kebersihan & QC",
    requiresLogin: false,
    content: `# SOP-QA-001: Kebersihan, Sanitasi, dan Food Safety Outlet

## 1. Tujuan
Menjaga standar kebersihan tingkat tinggi (*food safety*) di seluruh outlet Coffe Gaul guna melindungi kesehatan pelanggan dan mempertahankan skor audit higienitas minimal 90/100.

## 2. Higiene Personal Karyawan
1. Wajib mencuci tangan 6 langkah dengan sabun antiseptik selama minimal 20 detik sebelum memulai shift, setelah dari toilet, setelah menyentuh uang tunai/ponsel/sampah, dan setelah bersin/batuk.
2. Kuku harus pendek, bersih, dan tanpa cat kuku. Rambut panjang wajib diikat rapi dan memakai topi/hairnet di area dapur.
3. Tidak diperkenankan mengenakan perhiasan tangan (cincin berbatu, gelang longgar) saat meracik minuman/makanan.
4. Karyawan yang mengalami gejala diare, muntah, demam tinggi, atau luka terbuka bernanah **dilarang keras** menangani makanan/minuman dan wajib melapor ke Supervisor untuk pengalihan tugas atau istirahat medis.

## 3. Jadwal Pembersihan Operasional
- **Setiap Selesai Digunakan:** Lap permukaan meja dan kursi pelanggan menggunakan semprotan sanitizer food-safe; bersihkan tumpahan di area bar segera.
- **Setiap 1 Jam:** Cek dan bersihkan toilet (pastikan sabun, tisu, tempat sampah, lantai kering, dan pewangi tersedia), lalu paraf lembar *Toilet Checklist* di balik pintu.
- **Setiap 2 Jam:** Sapu dan mop lantai area dine-in dan bar (pasang tanda *Wet Floor* selama lantai basah).
- **Setiap 4 Jam:** Ganti air rendaman kain lap bar dengan larutan sanitizer baru (kadar klorin 50–100 ppm atau quat sanitizer sesuai takaran).
- **Harian (Closing):** Deep cleaning mesin, drainase floor trap, showcase, dan area cuci piring.

## 4. Pengendalian Hama (Pest Control) & Audit QC
- Tempat sampah wajib selalu bertutup dan dikosongkan saat terisi 75%.
- Treatment pest control dilakukan setiap 2 minggu sekali oleh vendor tersertifikasi di luar jam operasional.
- Tim Quality Assurance (QA) pusat melakukan inspeksi mendadak (*unannounced audit*) minimal 1 kali per bulan. Skor di bawah 80 mewajibkan tindakan perbaikan (*CAPA*) dalam 7 hari kalender.`,
  },

  // ── 9. SOP Onboarding Barista & Karyawan Baru (Publik) ──
  {
    title: "SOP-HR-001: SOP Onboarding dan Sertifikasi Barista & Karyawan Baru",
    category: "HR",
    requiresLogin: false,
    content: `# SOP-HR-001: Onboarding dan Sertifikasi Barista & Karyawan Baru

## 1. Tujuan
Memastikan setiap karyawan baru Coffe Gaul memahami budaya kerja perusahaan, menguasai keterampilan teknis sesuai jabatannya, dan siap melayani pelanggan dengan standar prima sebelum bertugas mandiri.

## 2. Pra-Hari Pertama (H-3)
- Tim HR mengirimkan *Welcome Kit* via email berisi surat penawaran/PKWT, buku panduan karyawan (*Employee Handbook*), jadwal pelatihan 14 hari, akun email/HRIS internal, serta panduan seragam.
- Store Supervisor menyiapkan loker, seragam (2 set), apron, dan name tag trainee.

## 3. Kurikulum Onboarding 14 Hari (Khusus Tim Outlet / Barista)
- **Hari 1–2 (Orientasi & Budaya — HQ / Online LMS):** Pengenalan sejarah & nilai inti Coffe Gaul (*Hangat, Cepat, Konsisten, Lokal Bangga*), struktur organisasi, kode etik, K3, Food Safety, dan SOP Pelayanan Pelanggan.
- **Hari 3–5 (Dasar Kopi & Peralatan — Training Academy):** Teori biji kopi Nusantara, kalibrasi grinder & espresso, teknik steaming susu & latte art dasar, serta pengoperasian & pembersihan mesin espresso.
- **Hari 6–8 (Resep & Sistem POS):** Menghafal dan mempraktikkan seluruh menu signature, non-kopi, kustomisasi alergen, serta simulasi transaksi POS, EDC, QRIS, dan penerimaan order online.
- **Hari 9–12 (On-the-Job Training / Shadowing di Outlet):** Praktik langsung di outlet penempatan dengan pendampingan ketat (*buddy system*) oleh Head Barista / Certified Trainer pada jam reguler dan jam sibuk.
- **Hari 13–14 (Evaluasi & Sertifikasi Internal):**
  - Ujian teori tertulis (nilai lulus minimal **80/100**).
  - Ujian praktik membuat 5 minuman acak dalam 10 menit (dinilai rasa, suhu, takaran, kerapian, dan kecepatan).
  - Roleplay penanganan komplain pelanggan.

## 4. Kelulusan & Masa Percobaan (Probation)
- Trainee yang lulus evaluasi mendapatkan **Sertifikat Barista Internal Coffe Gaul** dan resmi masuk jadwal shift reguler.
- Jika belum lulus, diberikan pelatihan remedial 5 hari dan 1 kesempatan ujian ulang.
- Evaluasi masa percobaan dilakukan pada akhir Bulan ke-1 dan Bulan ke-3 oleh Store Supervisor & HRBP sebelum pengangkatan status karyawan.`,
  },

  // ── 10. SOP Promosi & Diskon (Publik) ───────────────────
  {
    title: "SOP-MKT-001: SOP Pelaksanaan Promosi, Voucher, dan Diskon Outlet",
    category: "Marketing",
    requiresLogin: false,
    content: `# SOP-MKT-001: Pelaksanaan Promosi, Voucher, dan Diskon Outlet

## 1. Tujuan
Memastikan setiap program promosi, voucher, dan diskon berjalan akurat di sistem POS, tersosialisasi dengan baik kepada pelanggan, serta terukur efektivitas bisnisnya.

## 2. Perencanaan & Persetujuan
1. Seluruh program promosi (nasional maupun lokal outlet) wajib diajukan melalui *Promo Brief* dan mendapat persetujuan tertulis dari **Marketing Manager** dan **Finance Controller** (untuk verifikasi margin minimal) selambat-lambatnya H-7 sebelum tanggal tayang.
2. Promo taktis outlet (misalnya kolaborasi komunitas sekitar) wajib disetujui Area Manager dan tim Marketing minimal H-3.

## 3. Persiapan Teknis & Materi (H-2 hingga H-1)
- Tim IT/POS Support menginput konfigurasi kode promo, syarat & ketentuan, serta tanggal aktif/kedaluwarsa di sistem POS dan aplikasi Coffe Gaul minimal **H-1 pukul 15.00 WIB**, lalu melakukan uji transaksi (*test checkout*).
- Tim Marketing mendistribusikan *Promo Playbook* (FAQ promo, mekanisme kasir, dan ketentuan penggabungan diskon) ke seluruh grup Store Supervisor maksimal H-1.
- Outlet wajib memasang materi visual (tent card meja, wobbler kasir, standing banner) pada pagi hari H sebelum jam buka, dan **wajib mencabut seluruh materi maksimal 1 jam setelah periode promo berakhir**.

## 4. Eksekusi di Kasir & Aturan Penggabungan
- Kasir dan barista wajib menawarkan promo aktif yang relevan kepada pelanggan saat pemesanan (*suggestive selling*).
- Kecuali dinyatakan lain pada *Promo Playbook*, **voucher diskon persentase tidak dapat digabungkan dengan promo lain**, namun transaksi promo tetap berhak mengumpulkan Gaul Points dari nilai bayar bersih (*net payment*).
- Pemberian diskon manual tanpa kode promo sistem dilarang keras kecuali atas otorisasi PIN Store Supervisor untuk kompensasi komplain.

## 5. Evaluasi Pasca-Promo
Tim Marketing dan Finance menyusun laporan evaluasi (jumlah penukaran, peningkatan transaksi/AOV, dan ROI) maksimal **3 hari kerja** setelah periode promo berakhir.`,
  },

  // ── 11. SOP Delivery Online & Coffee Catering (Publik) ──
  {
    title: "SOP-OPS-003: SOP Pengelolaan Pesanan Online Delivery & Coffee Catering",
    category: "Operasional",
    requiresLogin: false,
    content: `# SOP-OPS-003: Pengelolaan Pesanan Online Delivery & Coffee Catering

## 1. Tujuan
Menjamin pesanan yang dikirim melalui kurir online maupun layanan *Gaul Coffee Cart* tiba dalam kondisi utuh, tidak tumpah, suhu terjaga, dan tepat waktu.

## 2. Standar Pengemasan Pesanan Online Delivery
1. **Konfirmasi Cepat:** Terima pesanan masuk dari aplikasi Coffe Gaul, GoFood, GrabFood, atau ShopeeFood maksimal dalam **2 menit**. Jika bahan habis, segera hubungi pelanggan untuk menawarkan substitusi sebelum membatalkan.
2. **Anti-Tumpah (Double Seal):**
   - Setiap gelas minuman dingin wajib ditutup dengan *cup sealer* plastik atau tutup rapat bersegel stiker pengaman (*tamper-evident seal*) Coffe Gaul di lubang sedotan.
   - Minuman panas wajib menggunakan tutup anti-tumpah + stiker segel + *cup sleeve*.
   - Gunakan *cup holder* karton untuk pesanan ≥2 minuman dan masukkan ke dalam kantong kertas/spunbond terpisah antara produk panas dan dingin.
3. **Verifikasi Sebelum Serah Terima Kurir:** Cocokkan jumlah item, sedotan/sendok, dan nama/kode order bersama driver, lalu tempelkan struk pesanan di bagian luar kantong.

## 3. Standar Layanan Coffee Catering (Gaul Coffee Cart)
1. **H-7 hingga H-2:** Tim Partnership mengonfirmasi jumlah cup (minimal 50 cup), pilihan menu, kebutuhan daya listrik lokasi (minimal 2.200–3.500 Watt untuk mesin espresso portable), dan menerima DP 50%.
2. **H-1:** Tim Operasional menyiapkan peralatan booth, bahan baku (dengan cadangan buffer 10%), es batu, gelas, dan melakukan uji nyala mesin. Pelunasan 50% diterima sebelum keberangkatan.
3. **Hari H:** Tim catering (minimal 2 barista) tiba di lokasi **90 menit sebelum acara dimulai** untuk loading, instalasi listrik, dan kalibrasi mesin.
4. **Penutupan Event:** Setelah durasi layanan (standar 4 jam) selesai atau kuota cup terpenuhi, tim melakukan serah terima berita acara dengan PIC acara, membersihkan area booth hingga bersih total, dan mengembalikan peralatan ke gudang pusat.`,
  },

  // ── 12. SOP Pengajuan Cuti & Shift (INTERNAL / LOGIN) ───
  {
    title: "SOP-HR-002: SOP Pengajuan Cuti, Izin, dan Pengaturan Shift Karyawan",
    category: "HR",
    requiresLogin: true,
    content: `# SOP-HR-002: Pengajuan Cuti, Izin, dan Pengaturan Shift Karyawan (Internal)

> **Klasifikasi Dokumen:** Internal Karyawan PT Kopi Gaul Nusantara (Memerlukan Login).

## 1. Tujuan & Ruang Lingkup
Mengatur hak cuti, prosedur pengajuan izin, serta mekanisme pertukaran shift seluruh karyawan tetap dan kontrak Coffe Gaul secara adil tanpa mengganggu operasional outlet maupun kantor pusat.

## 2. Jenis & Kuota Cuti Karyawan
1. **Cuti Tahunan:** Karyawan yang telah bekerja minimal 12 bulan berturut-turut berhak atas **12 hari kerja** cuti tahunan per tahun. Sisa cuti maksimal 4 hari dapat dialihkan (*carry over*) hingga Maret tahun berikutnya; selebihnya hangus.
2. **Cuti Sakit:** Diberikan sesuai surat keterangan dokter resmi (untuk sakit ≥2 hari berturut-turut wajib melampirkan surat dokter dan resep/bukti berobat di aplikasi HRIS maksimal H+1).
3. **Cuti Khusus (Dibayar Penuh, Tidak Memotong Cuti Tahunan):**
   - Karyawan menikah: 3 hari kerja.
   - Istri melahirkan / keguguran: 2 hari kerja.
   - Pernikahan/khitanan/baptisan anak: 2 hari kerja.
   - Anggota keluarga inti (orang tua, mertua, pasangan, anak) meninggal dunia: 2 hari kerja (1 hari untuk saudara kandung/serumah).
4. **Cuti Melahirkan:** 3 bulan kalender (1,5 bulan sebelum dan 1,5 bulan sesudah perkiraan lahir) sesuai UU Ketenagakerjaan.

## 3. Prosedur Pengajuan Cuti
1. Karyawan memeriksa sisa kuota cuti dan jadwal operasional tim di portal **HRIS Coffe Gaul**.
2. Ajukan permohonan cuti melalui aplikasi HRIS dengan batas waktu pengajuan:
   - Cuti 1–2 hari: Minimal **H-7** sebelum tanggal cuti.
   - Cuti ≥3 hari berturut-turut: Minimal **H-14** sebelum tanggal cuti (dan tidak diperbolehkan mengambil cuti massal pada *peak season* Lebaran/Natal/Tahun Baru tanpa izin khusus Area Manager).
3. **Alur Persetujuan (Approval):**
   - Tim Outlet: Disetujui oleh **Store Supervisor** (dan diketahui Area Manager jika >3 hari).
   - Tim HQ: Disetujui oleh **Kepala Divisi / Manager** langsung.
   - SLA persetujuan maksimal **2 hari kerja** sejak pengajuan masuk.
4. Setelah disetujui di HRIS, karyawan wajib memastikan serah terima tugas (*handover*) kepada rekan pengganti sebelum mulai cuti.

## 4. Prosedur Tukar Shift (Outlet)
- Jadwal shift mingguan diterbitkan Store Supervisor setiap hari **Jumat pukul 15.00 WIB** untuk minggu berikutnya.
- Pertukaran shift antar kru dengan level kompetensi setara (misal Barista dengan Barista) wajib diajukan di HRIS maksimal **H-1 pukul 18.00 WIB** dan disetujui Store Supervisor.
- Ketidakhadiran tanpa pemberitahuan (*mangkir*) dikenakan potongan proporsional dan Surat Peringatan sesuai Peraturan Perusahaan.`,
  },

  // ── 13. SOP Reimbursement & Klaim Biaya (INTERNAL / LOGIN)
  {
    title: "SOP-FIN-001: SOP Pengajuan Reimbursement dan Klaim Biaya Operasional",
    category: "Finance",
    requiresLogin: true,
    content: `# SOP-FIN-001: Pengajuan Reimbursement dan Klaim Biaya Operasional (Internal)

> **Klasifikasi Dokumen:** Internal Karyawan PT Kopi Gaul Nusantara (Memerlukan Login).

## 1. Tujuan & Ruang Lingkup
Mengatur tata cara pengajuan, verifikasi, persetujuan, dan pencairan penggantian biaya (*reimbursement*) yang dikeluarkan karyawan untuk kepentingan dinas atau operasional darurat Coffe Gaul.

## 2. Jenis Biaya yang Dapat Diklaim (Eligible Expenses)
1. **Belanja Operasional Darurat Outlet:** Pembelian mendesak es batu, susu, air galon, atau perlengkapan kebersihan jika kiriman pusat terlambat (maksimal **Rp300.000/transaksi** tanpa PO, wajib izin Store Supervisor/Area Manager terlebih dahulu).
2. **Transportasi Dinas & Kunjungan Outlet:** Taksi online/BBM/tol/parkir untuk kunjungan antar outlet, rapat klien B2B, atau survei event (tarif BBM Rp2.500/km untuk mobil atau Rp1.000/km untuk motor, atau sesuai struk transportasi online).
3. **Perjalanan Dinas Luar Kota:** Tiket pesawat/kereta kelas ekonomi, hotel maksimal **Rp650.000/malam** (Staff/Supervisor) atau **Rp1.000.000/malam** (Manager), serta uang makan harian maksimal **Rp150.000/hari**.
4. **Biaya Entertainment / Meeting Klien B2B:** Maksimal Rp500.000/pertemuan dengan persetujuan awal Head of Sales/Partnership dan mencantumkan nama klien serta tujuan rapat.

## 3. Syarat Bukti & Batas Pengajuan
- Wajib melampirkan **foto nota/struk asli yang jelas** (terlihat nama toko, tanggal, rincian item, dan total nominal). Struk buram, nota tulis tangan tanpa stempel toko, atau bukti transfer tanpa rincian pembelian akan ditolak.
- Pengajuan dilakukan melalui portal **Finance HRIS** maksimal **7 hari kalender** sejak tanggal transaksi (dan paling lambat tanggal 28 setiap bulannya agar masuk siklus tutup buku bulan berjalan). Klaim melewati 30 hari tidak dapat diproses.

## 4. Alur Persetujuan & Jadwal Pencairan (SLA)
1. **Level 1 (Atasan Langsung / Store Supervisor / Manager):** Memeriksa kesesuaian kebutuhan dinas (SLA 2 hari kerja).
2. **Level 2 (Tim Finance Verifier):** Memeriksa keabsahan nota, kepatuhan plafon, dan kode anggaran/cost center (SLA 2 hari kerja).
3. **Level 3 (Finance Manager):** Otorisasi final untuk klaim di atas **Rp1.000.000**.
4. **Pencairan Dana:** Pembayaran reimbursement ditransfer ke rekening payroll karyawan setiap hari **Selasa dan Jumat** (maksimal **5 hari kerja** setelah status *Approved by Finance*).

## 5. Larangan & Sanksi
Pemalsuan nota, mark-up nominal, klaim ganda (*double claim*), atau klaim pengeluaran pribadi merupakan pelanggaran berat yang dapat dikenakan sanksi hingga Pemutusan Hubungan Kerja (PHK).`,
  },

  // ── 14. SOP Keamanan Kas & Setoran Harian (INTERNAL / LOGIN)
  {
    title: "SOP-FIN-002: SOP Keamanan Kas, Brankas, dan Setoran Harian Outlet",
    category: "Finance",
    requiresLogin: true,
    content: `# SOP-FIN-002: Keamanan Kas, Brankas, dan Setoran Harian Outlet (Internal)

> **Klasifikasi Dokumen:** Internal Keuangan & Operasional PT Kopi Gaul Nusantara (Memerlukan Login).

## 1. Tujuan
Melindungi aset kas tunai outlet dari risiko kesalahan hitung, kehilangan, maupun penyalahgunaan, serta memastikan seluruh penerimaan harian tercatat akurat di rekening perusahaan.

## 2. Pengelolaan Laci Kas (Cash Drawer) Selama Operasional
1. Modal kas awal (*petty float*) ditetapkan tepat **Rp500.000** per mesin POS.
2. Laci kas wajib selalu dalam keadaan terkunci saat tidak ada transaksi tunai. Hanya kasir bertugas dan Shift Leader yang berwenang mengakses laci kas.
3. **Cash Drop:** Apabila akumulasi uang tunai di laci kas melebihi **Rp2.500.000** di tengah jam operasional, Kasir bersama Shift Leader wajib melakukan *cash drop* ke brankas outlet (dicatat pada log *Cash Drop* dan ditandatangani berdua).

## 3. Penutupan Kas & Penanganan Selisih
1. Setiap penutupan shift malam, uang tunai wajib dihitung bersama oleh **2 orang** (Kasir + Shift Leader) di area yang tercakup kamera CCTV.
2. Cocokkan jumlah fisik dengan laporan *Z-Report POS*.
3. **Toleransi Selisih:**
   - Selisih lebih (*overage*) wajib tetap disetorkan seluruhnya ke perusahaan dan dicatat di laporan kas.
   - Selisih kurang (*shortage*) hingga Rp10.000 dicatat pada log selisih; selisih **> Rp10.000** wajib segera dilaporkan kepada Area Manager dan Finance Outlet disertai Berita Acara kronologi di hari yang sama.

## 4. Penyimpanan Brankas & Setoran Bank
1. Uang hasil penjualan harian dimasukkan ke amplop setoran bersegel lengkap dengan slip ringkasan tanggal, nama outlet, dan nominal, lalu disimpan di dalam **brankas tertanam** sebelum outlet dikunci. Kombinasi brankas hanya diketahui Store Supervisor dan Area Manager serta wajib diganti setiap 3 bulan atau saat terjadi mutasi Supervisor.
2. **Setoran Tunai ke Bank:** Dilakukan oleh Store Supervisor (atau menggunakan layanan *Cash-in-Transit* untuk outlet flagship) setiap hari kerja (Senin–Jumat) maksimal pukul **14.00 WIB** ke rekening resmi PT Kopi Gaul Nusantara (penjualan Jumat–Minggu disetorkan pada hari Senin pagi).
3. Foto bukti setor bank (slip teller/CDM) wajib diunggah ke sistem Finance maksimal **2 jam** setelah penyetoran. Tim Finance pusat melakukan rekonsiliasi penuh setiap hari Rabu.`,
  },

  // ── 15. SOP Keamanan Akun POS & IT Internal (INTERNAL / LOGIN)
  {
    title: "SOP-IT-001: SOP Keamanan Akun POS, Reset Password Internal, dan Backup Data",
    category: "IT & Sistem",
    requiresLogin: true,
    content: `# SOP-IT-001: Keamanan Akun POS, Reset Password Internal, dan Backup Data (Internal)

> **Klasifikasi Dokumen:** Internal IT & Karyawan PT Kopi Gaul Nusantara (Memerlukan Login).

## 1. Tujuan
Menjaga keamanan akses sistem internal Coffe Gaul (POS Outlet, Dashboard Admin PostIt AI, ERP Inventaris, dan HRIS) serta memastikan ketersediaan cadangan data (*backup*) yang andal.

## 2. Kebijakan Akun & Kata Sandi Internal
1. Setiap karyawan wajib menggunakan akun pribadi masing-masing; **berbagi username, password, atau PIN otorisasi POS dilarang keras**.
2. Kata sandi akun internal minimal **12 karakter** berisi kombinasi huruf besar, huruf kecil, angka, dan simbol, serta wajib diganti berkala setiap 90 hari (khusus akun Admin/Super Admin wajib mengaktifkan 2FA jika tersedia).
3. **Reset Password Karyawan Internal:**
   - Karyawan melapor melalui tiket *IT Helpdesk* atau WhatsApp resmi IT Support dengan verifikasi Nomor Induk Karyawan (NIK) dan konfirmasi Store Supervisor/Manager.
   - Tim IT melakukan reset kata sandi sementara dalam SLA **30 menit** (untuk gangguan POS outlet prioritas tinggi) atau **2 jam** (akun HQ/HRIS).
   - Karyawan wajib langsung mengganti kata sandi sementara pada login pertama.
4. **Offboarding:** Saat karyawan resign atau diberhentikan, HR wajib mengirim notifikasi ke IT maksimal H-0 pukul 17.00 WIB agar seluruh akses POS, email, dan dashboard dinonaktifkan pada hari yang sama.

## 3. Kebijakan Backup Data & Pemulihan (Disaster Recovery)
1. **Backup Database Harian Otomatis:** Seluruh database operasional (POS, ERP, CRM, dan Knowledge Base PostIt AI) di-backup otomatis setiap hari pukul **02.00 WIB** menggunakan snapshot terenkripsi AES-256 ke penyimpanan cloud terpisah (*off-site*).
2. **Retensi Backup:** Backup harian disimpan selama **30 hari**, backup mingguan selama **12 minggu**, dan backup bulanan selama **12 bulan**.
3. **Uji Pemulihan (Restore Drill):** Tim IT wajib melakukan simulasi *restore* database pada lingkungan staging setiap 3 bulan sekali untuk memverifikasi integritas backup (target RTO ≤ 2 jam, RPO ≤ 24 jam).`,
  },

  // ── 16. SOP Audit Mutu, K3 & Tanggap Darurat (INTERNAL / LOGIN)
  {
    title: "SOP-QA-002: SOP Audit Mutu Outlet, Penanganan Insiden K3, dan Tanggap Darurat",
    category: "Kebersihan & QC",
    requiresLogin: true,
    content: `# SOP-QA-002: Audit Mutu Outlet, Penanganan Insiden K3, dan Tanggap Darurat (Internal)

> **Klasifikasi Dokumen:** Internal Operasional & QC PT Kopi Gaul Nusantara (Memerlukan Login).

## 1. Tujuan
Melindungi keselamatan karyawan dan pelanggan dari risiko kecelakaan kerja (luka bakar, tersengat listrik, terpeleset, kebakaran) serta menjamin kualitas operasional melalui audit mutu terstruktur.

## 2. Pencegahan & Penanganan Insiden K3 di Outlet
1. **Peralatan Keselamatan Wajib:** Setiap outlet wajib memiliki kotak P3K lengkap (dicek bulanan), minimal 2 unit APAR tipe CO2/Dry Chemical yang masih aktif dan terinspeksi, serta *wet floor sign*.
2. **Luka Bakar Ringan (Uap/Air Panas Mesin Espresso):** Segera alirkan air dingin mengalir (bukan es batu/pasta gigi) pada area luka selama 10–15 menit, tutup dengan kasa steril dari kotak P3K, dan bawa ke klinik terdekat jika kulit melepuh >5 cm.
3. **Tersengat Listrik / Korsleting:** Jangan sentuh korban langsung bila masih terhubung arus. Segera matikan sakelar utama (MCB) panel listrik, hubungi layanan medis darurat (119), dan amankan area.
4. **Kebakaran Ringan:** Bunyikan peringatan, evakuasi seluruh pelanggan melalui pintu keluar terdekat, gunakan APAR dengan teknik **P-A-S-S** (*Pull pin, Aim base, Squeeze lever, Sweep side-to-side*). Jika api membesar dalam 30 detik, segera evakuasi total dan hubungi Pemadam Kebakaran (113).
5. **Pelaporan Insiden:** Setiap kecelakaan kerja wajib dilaporkan ke HRD dan Area Manager maksimal **2 jam** pascakejadian melalui *Incident Report Form* (beserta dokumentasi medis untuk klaim BPJS Ketenagakerjaan).

## 3. Program Audit Mutu Bulanan (QSC Audit)
Tim Quality Assurance pusat menilai 3 pilar utama setiap bulan (skor maksimal 100):
- **Quality (40%):** Kalibrasi rasa kopi (*mystery tasting*), suhu susu, kesegaran pastry, dan kepatuhan shelf-life/FIFO.
- **Service (30%):** Kecepatan SLA penyajian, keramahan sapaan, akurasi pesanan, dan kerapian seragam.
- **Cleanliness & Safety (30%):** Higienitas bar, toilet, chiller, pest control, dan kelengkapan K3/APAR.

Outlet dengan skor **≥ 92** selama 3 bulan berturut-turut berhak menerima insentif *Best Outlet Award*, sedangkan skor **< 80** masuk program pendampingan intensif (*re-audit* dalam 14 hari).`,
  },
];

async function seedContent() {
  const args = new Set(process.argv.slice(2));
  const draftOnly = args.has("--draft-only");
  const shouldReset = args.has("--reset");

  try {
    // Dynamic import AFTER process.loadEnvFile(".env") so DATABASE_URL and AI env vars
    // are guaranteed to be present before lib/db.ts initializes the Postgres pool.
    const [{ eq }, { db }, { documents, faqs, sops, sopVersions, users }, { syncFaqRecord }, { publishSopVersion }] =
      await Promise.all([
        import("drizzle-orm"),
        import("../lib/db"),
        import("../lib/schema"),
        import("../lib/vector-sync"),
        import("../lib/sop-versioning"),
      ]);

    console.log("🌱 Starting Coffe Gaul comprehensive knowledge seed...");

    if (shouldReset) {
      console.log("🧹 --reset flag detected: clearing existing documents, sop_versions, sops, and faqs...");
      await db.delete(documents);
      await db.delete(sopVersions);
      await db.delete(sops);
      await db.delete(faqs);
    } else {
      const existingFaqs = await db.query.faqs.findFirst();
      const existingSops = await db.query.sops.findFirst();

      if (existingFaqs || existingSops) {
        console.log("✅ FAQ/SOP already present — nothing seeded.");
        console.log("   Pass --reset to replace existing FAQ/SOP data.");
        process.exit(0);
      }
    }

    const seedOwner = await db.query.users.findFirst({
      where: eq(users.role, "super_admin"),
    });
    if (!seedOwner) {
      throw new Error(
        "A super_admin account is required before seeding SOPs. Run seed:admin first.",
      );
    }

    // ── 1. Seed FAQs ──────────────────────────────────────
    console.log(`\n📚 Seeding ${FAQ_SEED.length} FAQ Coffe Gaul...`);
    const insertedFaqs: Array<{ id: string; question: string; answer: string }> = [];
    for (const entry of FAQ_SEED) {
      const [faq] = await db
        .insert(faqs)
        .values({ ...entry, status: "draft" })
        .returning({ id: faqs.id, question: faqs.question, answer: faqs.answer });
      insertedFaqs.push(faq);
    }
    console.log(`   ✓ Inserted ${insertedFaqs.length} FAQ rows.`);

    // ── 2. Seed SOPs & Version 1 ──────────────────────────
    console.log(`\n📋 Seeding ${SOP_SEED.length} SOP Coffe Gaul...`);
    const insertedSops: Array<{ sopId: string; versionId: string; title: string; requiresLogin: boolean }> = [];
    for (const entry of SOP_SEED) {
      const [sop] = await db
        .insert(sops)
        .values({
          title: entry.title,
          content: entry.content,
          category: entry.category,
          requiresLogin: entry.requiresLogin,
          status: "draft",
        })
        .returning();

      const [version] = await db
        .insert(sopVersions)
        .values({
          sopId: sop.id,
          versionNumber: 1,
          title: sop.title,
          content: sop.content,
          indexingStatus: "draft",
          createdBy: seedOwner.id,
        })
        .returning();

      insertedSops.push({
        sopId: sop.id,
        versionId: version.id,
        title: sop.title,
        requiresLogin: sop.requiresLogin,
      });
    }
    console.log(
      `   ✓ Inserted ${insertedSops.length} SOP rows (${insertedSops.filter((s) => !s.requiresLogin).length} public, ${insertedSops.filter((s) => s.requiresLogin).length} login-required).`,
    );

    if (draftOnly) {
      console.log(
        `\n✅ Seed done (draft-only) — ${insertedFaqs.length} FAQ & ${insertedSops.length} SOP Coffe Gaul inserted.`,
      );
      process.exit(0);
    }

    // ── 3. Publish & Embed FAQs into Vector Knowledge Base ──
    console.log(`\n⚡ Publishing & embedding ${insertedFaqs.length} FAQ into AI Knowledge Base...`);
    let faqPublished = 0;
    let faqErrors = 0;
    for (let i = 0; i < insertedFaqs.length; i += 1) {
      const faq = insertedFaqs[i];
      const result = await syncFaqRecord(faq.id, faq.question, faq.answer);
      if (result === "published") {
        faqPublished += 1;
      } else {
        faqErrors += 1;
        console.warn(`   ✗ Failed to embed FAQ: ${faq.question}`);
      }
      if ((i + 1) % 10 === 0 || i === insertedFaqs.length - 1) {
        console.log(`   ... FAQ progress: ${i + 1}/${insertedFaqs.length} (${faqPublished} published, ${faqErrors} error)`);
      }
    }

    // ── 4. Publish & Embed SOPs into Vector Knowledge Base ──
    console.log(`\n⚡ Publishing & embedding ${insertedSops.length} SOP into AI Knowledge Base...`);
    let sopPublished = 0;
    let sopErrors = 0;
    for (let i = 0; i < insertedSops.length; i += 1) {
      const sop = insertedSops[i];
      const result = await publishSopVersion(sop.sopId, sop.versionId);
      if (result === "published") {
        sopPublished += 1;
        console.log(
          `   ✓ [${i + 1}/${insertedSops.length}] ${sop.title}${sop.requiresLogin ? " [Login Required]" : ""}`,
        );
      } else {
        sopErrors += 1;
        console.warn(`   ✗ [${i + 1}/${insertedSops.length}] Failed: ${sop.title}`);
      }
    }

    console.log("\n✅ Coffe Gaul Knowledge Base seed complete!");
    console.log(`   FAQs : ${faqPublished}/${insertedFaqs.length} published (${faqErrors} error)`);
    console.log(`   SOPs : ${sopPublished}/${insertedSops.length} published (${sopErrors} error)`);

    process.exit(faqErrors > 0 || sopErrors > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedContent();
