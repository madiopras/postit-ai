'use client';

import { ArrowDown } from 'lucide-react';

export function ScrollToBottom({ onPress }: { onPress: () => void }) {
  return (
    <div className="tooltip tooltip-left" data-tip="Ke pesan terbaru">
      <button
        type="button"
        onClick={onPress}
        className="btn btn-circle btn-sm size-11 border border-base-300/60 bg-base-100/85 text-base-content shadow-[0_14px_40px_-22px_rgba(15,23,42,0.65)] ring-1 ring-black/5 backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-base-100 hover:shadow-[0_18px_50px_-24px_rgba(15,23,42,0.7)] active:translate-y-0"
        aria-label="Ke pesan terbaru"
      >
        <ArrowDown className="size-4.5" aria-hidden="true" />
        <span className="sr-only">Ke pesan terbaru</span>
      </button>
    </div>
  );
}
