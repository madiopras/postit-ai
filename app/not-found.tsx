import { ArrowLeft, FileQuestion } from 'lucide-react';
import { ButtonLink } from '@/components/untitled/base/buttons/button';

export default function NotFound() {
  return (
    <main className="ui-surface flex min-h-screen min-h-dvh items-center justify-center bg-bg-secondary p-6 text-fg-primary">
      <div className="w-full max-w-md rounded-ui-xl border border-border-secondary bg-bg-primary p-8 text-center shadow-ui-lg">
        <div className="mx-auto flex size-14 items-center justify-center rounded-ui-xl bg-brand-subtle text-brand-text">
          <FileQuestion className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-5 font-mono text-sm font-semibold text-brand-text">404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-fg-primary">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm leading-6 text-fg-tertiary">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan.
        </p>
        <ButtonLink
          href="/"
          variant="primary"
          iconLeading={<ArrowLeft />}
          className="mt-6"
        >
          Kembali ke chat
        </ButtonLink>
      </div>
    </main>
  );
}
