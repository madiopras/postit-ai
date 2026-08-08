import { ArrowLeft, FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen min-h-dvh items-center justify-center bg-base-200/50 p-6 text-base-content">
      <div className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-8 text-center shadow-lg">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileQuestion className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-5 font-mono text-sm font-bold text-primary">404</p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-base-content">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm leading-6 text-base-content/70">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="btn btn-primary btn-sm mt-6 gap-2"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke chat</span>
        </Link>
      </div>
    </main>
  );
}
