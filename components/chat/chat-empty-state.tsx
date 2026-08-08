'use client';

import {
  CalendarDays,
  FileQuestion,
  KeyRound,
  LockKeyhole,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/untitled/base/buttons/button';

export const CHAT_SUGGESTIONS = [
  {
    icon: KeyRound,
    text: 'Bagaimana cara reset password?',
    desc: 'Langkah pemulihan akun & keamanan',
  },
  {
    icon: CalendarDays,
    text: 'Bagaimana prosedur pengajuan cuti?',
    desc: 'Alur persetujuan & kuota tahunan',
  },
  {
    icon: Receipt,
    text: 'Apa prosedur reimbursement?',
    desc: 'Klaim biaya dinas & bukti nota',
  },
  {
    icon: FileQuestion,
    text: 'Bagaimana menangani komplain pelanggan?',
    desc: 'SOP respon & eskalasi keluhan',
  },
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
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-2 py-8 text-center md:-translate-y-3 md:py-12">
      {/* Brand Hero Glow Badge */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="absolute -inset-1.5 rounded-full bg-brand-subtle/70 blur-md" aria-hidden="true" />
        <div className="relative flex size-13 items-center justify-center rounded-2xl border border-border-brand/40 bg-bg-primary text-brand-text shadow-ui-sm">
          <Sparkles className="size-6 text-brand-text" aria-hidden="true" />
        </div>
      </div>

      {/* Greeting & Headline */}
      <h2 className="text-2xl font-semibold tracking-tight text-fg-primary md:text-3xl lg:text-4xl">
        {greetingName ? `Halo, ${greetingName}` : 'Apa yang ingin Anda cari hari ini?'}
      </h2>
      <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-fg-tertiary md:text-base">
        Temukan panduan cepat dari FAQ perusahaan, kebijakan operasional, dan panduan SOP internal.
      </p>

      {/* Suggestion Cards Grid */}
      <div className="mt-8 hidden w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid sm:grid-cols-2">
        {CHAT_SUGGESTIONS.map(({ icon: Icon, text, desc }) => (
          <Button
            key={text}
            variant="secondary"
            size="lg"
            onPress={() => onSelectSuggestion(text)}
            className="group relative flex h-auto min-h-14 w-full flex-row items-center justify-start gap-3.5 rounded-ui-xl border border-border-secondary/80 bg-bg-primary px-4 py-3.5 text-left shadow-ui-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border-brand/60 hover:bg-bg-secondary hover:shadow-ui-sm active:translate-y-0"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-fg-tertiary transition-colors group-hover:bg-brand-subtle group-hover:text-brand-text">
              <Icon className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-fg-primary group-hover:text-brand-text">
                {text}
              </span>
              <span className="mt-0.5 block truncate text-xs text-fg-quaternary">
                {desc}
              </span>
            </div>
          </Button>
        ))}
      </div>

      {/* SOP Protection Notice Pill */}
      <div className="mt-8 inline-flex max-w-md items-center gap-2 rounded-full border border-border-secondary/60 bg-bg-secondary/70 px-3.5 py-1.5 text-left text-xs text-fg-tertiary shadow-ui-xs backdrop-blur-xs">
        <LockKeyhole className="size-3.5 shrink-0 text-fg-quaternary" aria-hidden="true" />
        <span className="truncate">Sebagian SOP internal memerlukan login untuk akses dokumen.</span>
      </div>
    </section>
  );
}
