'use client';

import { Bot, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/untitled/base/buttons/button';

export const CHAT_SUGGESTIONS = [
  'Bagaimana cara reset password?',
  'Bagaimana prosedur pengajuan cuti?',
  'Apa prosedur reimbursement?',
  'Bagaimana menangani komplain pelanggan?',
] as const;

export function ChatEmptyState({
  onSelectSuggestion,
  displayName,
}: {
  onSelectSuggestion: (suggestion: string) => void;
  displayName?: string;
}) {
  const greetingName = displayName?.trim().slice(0, 60);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-1 py-10 text-center md:-translate-y-4">
      <div className="mb-5 flex size-14 items-center justify-center rounded-ui-xl bg-brand-subtle text-brand-text">
        <Bot className="size-7" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-fg-primary md:text-3xl">
        Apa yang ingin Anda cari hari ini?
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-fg-tertiary md:text-base">
        {greetingName && <>Halo, {greetingName}. </>}
        Temukan jawaban dari FAQ perusahaan dan panduan SOP yang tersedia untuk Anda.
      </p>

      <div className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {CHAT_SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            variant="secondary"
            size="lg"
            onPress={() => onSelectSuggestion(suggestion)}
            className="h-auto min-h-12 justify-start whitespace-normal px-4 py-3 text-left"
          >
            {suggestion}
          </Button>
        ))}
      </div>

      <div className="mt-6 flex max-w-xl items-start gap-2 rounded-ui-md bg-bg-secondary px-3 py-2.5 text-left text-xs leading-5 text-fg-tertiary">
        <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Sebagian informasi SOP memerlukan login untuk melindungi akses internal.</p>
      </div>
    </section>
  );
}
