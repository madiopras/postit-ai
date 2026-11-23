"use client";

import { PostItLogo } from "@/components/brand/postit-logo";
import {
  ArrowUpRight,
  CalendarDays,
  FileQuestion,
  KeyRound,
  LockKeyhole,
  Receipt,
} from "lucide-react";

export const CHAT_SUGGESTIONS = [
  {
    icon: KeyRound,
    text: "Bagaimana cara reset password?",
    desc: "Langkah pemulihan akun & keamanan",
  },
  {
    icon: CalendarDays,
    text: "Bagaimana prosedur pengajuan cuti?",
    desc: "Alur persetujuan & kuota tahunan",
  },
  {
    icon: Receipt,
    text: "Apa prosedur reimbursement?",
    desc: "Klaim biaya dinas & bukti nota",
  },
  {
    icon: FileQuestion,
    text: "Bagaimana menangani komplain pelanggan?",
    desc: "SOP respon & eskalasi keluhan",
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
    <section className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-1 py-6 text-center md:py-10">
      {/* Subtle Utarasu Ulos weave halo behind hero */}
      <div
        className="utarasu-ulos-weave pointer-events-none absolute left-1/2 top-1/2 -z-0 h-72 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_72%)]"
        aria-hidden="true"
      />

      {/* Mascot Emblem */}
      <div className="relative z-10 mb-5 flex items-center justify-center">
        <div
          className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl dark:bg-primary/20"
          aria-hidden="true"
        />
        <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-[22px] border border-base-300 bg-base-100 shadow-md ring-4 ring-primary/5">
          <PostItLogo size={46} className="size-11.5" priority />
          <span
            className="utarasu-ulos-bar absolute inset-x-0 bottom-0 h-[3px]"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Greeting & Subtitle */}
      <div className="relative z-10 space-y-2.5">
        <div className="inline-flex items-center gap-2 rounded-full border border-base-300/90 bg-base-200/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-base-content/75">
          <span
            className="size-1.5 rounded-full bg-accent"
            aria-hidden="true"
          />
          <span>PostIt AI</span>
          <span className="text-base-content/30">·</span>
          <span className="text-primary">utaraSU</span>
        </div>

        <h2 className="text-balance text-2xl font-bold tracking-tight text-base-content sm:text-3xl md:text-[2.125rem] md:leading-tight">
          {greetingName
            ? `Halo, ${greetingName}.`
            : "Apa yang ingin Anda cari hari ini?"}
        </h2>

        <p className="mx-auto max-w-lg text-pretty text-sm leading-relaxed text-base-content/65">
          Tanyakan prosedur operasional, kebijakan internal, atau FAQ perusahaan
          dan dapatkan jawaban cepat lengkap dengan sumber referensinya.
        </p>
      </div>

      {/* Prompt Starters Grid — visible on mobile & desktop */}
      <div className="relative z-10 mt-7 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-3">
        {CHAT_SUGGESTIONS.map(({ icon: Icon, text, desc }) => (
          <button
            key={text}
            type="button"
            onClick={() => onSelectSuggestion(text)}
            className="group flex items-start gap-3 rounded-2xl border border-base-300/85 bg-base-200/50 p-3.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-base-100 hover:shadow-md hover:shadow-primary/5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-base-300/80 bg-base-100 text-primary transition-colors group-hover:border-primary/30 group-hover:bg-primary group-hover:text-primary-content">
              <Icon className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[13px] font-semibold leading-snug text-base-content transition-colors group-hover:text-primary">
                  {text}
                </span>
                <ArrowUpRight
                  className="mt-0.5 size-3.5 shrink-0 text-base-content/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </div>
              <span className="mt-0.5 block truncate text-xs text-base-content/55">
                {desc}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* SOP Access Info Pill */}
      <div className="relative z-10 mt-6 inline-flex max-w-full items-center gap-2 rounded-full border border-base-300/75 bg-base-200/55 px-3.5 py-1.5 text-xs text-base-content/65 sm:mt-7">
        <LockKeyhole
          className="size-3.5 shrink-0 text-primary/80"
          aria-hidden="true"
        />
        <span className="truncate">
          Sebagian SOP internal memerlukan login untuk membuka dokumen.
        </span>
      </div>
    </section>
  );
}
