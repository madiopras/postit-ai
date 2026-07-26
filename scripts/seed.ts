import { db } from '../lib/db';
import { faqs, sops } from '../lib/schema';
import { syncFaqToFaq, syncSopToVectors } from '../lib/vector-sync';

/**
 * Seed sample FAQ and SOP content.
 *
 * Rows go into `faqs` / `sops` and reach the vector store through the same
 * sync functions the API uses, so the seeded data is chunked, embedded and
 * marked `published` exactly like content created from the dashboard.
 *
 * The previous version inserted straight into `documents` with no embedding
 * and the default `draft` status, which meant searchSimilarDocuments (it
 * filters on status = 'published') could never return any of it.
 *
 * Requires a reachable embedding endpoint — see ROUTER_BASE_URL in .env.
 */

const FAQ_SEED = [
  {
    question: 'Bagaimana cara reset password?',
    answer:
      'Buka halaman login → klik Forgot Password → masukkan email → ikuti link reset yang dikirim.',
    category: 'Akun',
  },
  {
    question: 'Kapan jam operasional customer service?',
    answer:
      'Senin-Jumat 08.00-17.00 WIB. Sabtu 08.00-12.00. Minggu & hari libur tutup.',
    category: 'Umum',
  },
  {
    question: 'Berapa biaya pengiriman?',
    answer:
      'Gratis ongkir untuk order di atas Rp150.000. Di bawah itu dikenakan Rp15.000.',
    category: 'Pengiriman',
  },
  {
    question: 'Metode pembayaran apa saja yang diterima?',
    answer: 'Kami menerima transfer bank, QRIS, dan kartu kredit via Midtrans.',
    category: 'Pembayaran',
  },
  {
    question: 'Bagaimana ketentuan garansi produk?',
    answer:
      'Semua produk bergaransi resmi 1 tahun. Kerusakan akibat pemakaian normal ditanggung.',
    category: 'Produk',
  },
];

const SOP_SEED = [
  {
    title: 'Proses onboarding karyawan baru',
    content:
      '1. HR kirim email welcome. 2. IT setup akun & laptop. 3. Manager assign buddy. 4. Training 3 hari pertama.',
    category: 'HR',
  },
  {
    title: 'Prosedur refund',
    content:
      '1. Customer ajukan via form. 2. CS verifikasi order. 3. Finance proses dalam 3 hari kerja. 4. Uang masuk rekening.',
    category: 'Finance',
  },
  {
    title: 'Penanganan komplain',
    content:
      '1. Terima komplain. 2. Log di Zendesk. 3. Escalation ke supervisor jika lebih dari 24 jam. 4. Follow up hingga selesai.',
    category: 'Customer Service',
  },
  {
    title: 'Backup database harian',
    content:
      'Cron job setiap 02.00 WIB. Backup disimpan di S3 bucket 30 hari. Test restore dilakukan tiap bulan.',
    category: 'IT',
  },
  {
    title: 'Deployment production',
    content:
      '1. Merge ke main. 2. Run CI. 3. Tag version. 4. Deploy via ArgoCD. 5. Monitor error rate 30 menit.',
    category: 'IT',
  },
];

async function main() {
  const existingFaqs = await db.query.faqs.findFirst();
  const existingSops = await db.query.sops.findFirst();

  if (existingFaqs || existingSops) {
    console.log('✅ FAQ/SOP already present — nothing seeded.');
    console.log('   Clear the faqs and sops tables first to re-seed.');
    return;
  }

  console.log(`🌱 Seeding ${FAQ_SEED.length} FAQ...`);
  for (const entry of FAQ_SEED) {
    const [faq] = await db
      .insert(faqs)
      .values({ ...entry, status: 'published' })
      .returning();

    await syncFaqToFaq(faq.id, faq.question, faq.answer, 'published');
    console.log(`   ✓ ${faq.question}`);
  }

  console.log(`🌱 Seeding ${SOP_SEED.length} SOP...`);
  for (const entry of SOP_SEED) {
    const [sop] = await db
      .insert(sops)
      .values({ ...entry, status: 'published' })
      .returning();

    await syncSopToVectors(sop.id, sop.title, sop.content, 'published');
    console.log(`   ✓ ${sop.title}`);
  }

  console.log('✅ Seed done — content embedded and published.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seed failed:', error instanceof Error ? error.message : error);
    console.error('   An embedding endpoint must be reachable — check ROUTER_BASE_URL in .env');
    process.exit(1);
  });
