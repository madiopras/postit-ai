import { Bot } from 'lucide-react';

export default function Loading() {
  return (
    <main
      className="ui-surface flex min-h-screen min-h-dvh items-center justify-center bg-bg-secondary text-fg-primary"
      aria-label="Memuat PostIt AI"
    >
      <div className="flex flex-col items-center gap-4" role="status">
        <div className="flex size-14 animate-pulse items-center justify-center rounded-ui-xl bg-brand-solid text-fg-on-brand shadow-ui-sm">
          <Bot className="size-7" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-fg-tertiary">Memuat PostIt AI...</p>
      </div>
    </main>
  );
}
