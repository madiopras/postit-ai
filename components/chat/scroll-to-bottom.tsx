'use client';

import { ArrowDown } from 'lucide-react';

export function ScrollToBottom({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex size-9 items-center justify-center rounded-full border border-base-300 bg-base-100/95 text-base-content shadow-md backdrop-blur-md transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label="Ke pesan terbaru"
      title="Ke pesan terbaru"
    >
      <ArrowDown className="size-4" aria-hidden="true" />
      <span className="sr-only">Ke pesan terbaru</span>
    </button>
  );
}
