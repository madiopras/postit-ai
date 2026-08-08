"use client";

import { PostItLogo } from "@/components/brand/postit-logo";
import {
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
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-3 py-10 text-center md:-translate-y-2 md:py-14">
      <div className="relative mb-6 flex items-center justify-center">
        <div
          className="bg-primary/15 absolute -inset-3 rounded-full blur-2xl"
          aria-hidden="true"
        />
        <div className="bg-base-100/85 border-base-300/60 relative flex size-16 items-center justify-center overflow-hidden rounded-[1.5rem] border shadow-[0_18px_50px_-28px_rgba(15,23,42,0.55)] ring-1 ring-black/5 backdrop-blur-2xl">
          <PostItLogo size={36} className="size-9" />
        </div>
        {/* <div className="absolute -bottom-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
          Siap membantu
        </div> */}
      </div>

      <div className="space-y-2">
        <div className="badge badge-primary badge-soft border border-primary/20 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.22em]">
          Asisten internal
        </div>
        <h2 className="text-base-content text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
          {greetingName
            ? `Halo, ${greetingName}`
            : "Apa yang ingin Anda cari hari ini?"}
        </h2>
        <p className="text-base-content/70 mx-auto max-w-lg text-sm leading-relaxed md:text-base">
          Temukan panduan cepat dari FAQ perusahaan, kebijakan operasional, dan
          SOP internal dengan tampilan yang lebih fokus dan nyaman dibaca.
        </p>
      </div>

      <div className="mt-8 hidden w-full max-w-2xl grid-cols-1 gap-3 sm:grid sm:grid-cols-2">
        {CHAT_SUGGESTIONS.map(({ icon: Icon, text, desc }) => (
          <button
            key={text}
            onClick={() => onSelectSuggestion(text)}
            className="group flex flex-row items-center gap-3.5 rounded-2xl border border-base-300/60 bg-base-100/75 p-3.5 text-left shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-base-100 hover:shadow-md hover:shadow-primary/5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="bg-base-200/80 text-base-content/70 group-hover:bg-primary group-hover:text-primary-content flex size-10 shrink-0 items-center justify-center rounded-2xl border border-base-300/60 shadow-xs transition-colors">
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-base-content group-hover:text-primary block text-sm font-semibold transition-colors">
                {text}
              </span>
              <span className="text-base-content/60 mt-0.5 block truncate text-xs">
                {desc}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-base-100/75 border-base-300/60 text-base-content/70 mt-8 inline-flex max-w-md items-center gap-2 rounded-full border px-3.5 py-2 text-left text-xs shadow-sm backdrop-blur-xl">
        <LockKeyhole
          className="size-3.5 shrink-0 opacity-70"
          aria-hidden="true"
        />
        <span className="truncate">
          Sebagian SOP internal memerlukan login untuk akses dokumen.
        </span>
      </div>
    </section>
  );
}
