'use client';

import { useEffect, useId, useState } from 'react';
import { BookOpen, ChevronDown, FileText, HelpCircle, X } from 'lucide-react';
import type { SourceCitation } from '@/lib/chat-client';
import { cn } from '@/lib/utils';

export function SourceList({ sources }: { sources: SourceCitation[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);
  const panelId = useId();

  if (sources.length === 0) return null;

  return (
    <div className="mt-3.5">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="inline-flex h-8 items-center gap-2 rounded-full border border-base-300 bg-base-200/65 px-3 text-xs font-medium text-base-content/80 transition-colors hover:border-primary/40 hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <BookOpen className="size-3.5 text-primary" aria-hidden="true" />
        <span>Lihat {sources.length} sumber</span>
        <ChevronDown
          className={cn(
            'size-3.5 text-base-content/50 transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div id={panelId} className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {sources.map((source) => {
            const isFaq = source.type === 'faq';
            return (
              <button
                type="button"
                key={`${source.type}-${source.id}-${source.chunkIndex ?? 0}`}
                onClick={() => setSelectedSource(source)}
                className="group flex flex-col items-start rounded-2xl border border-base-300/85 bg-base-200/45 p-3 text-left transition-all duration-150 hover:border-primary/40 hover:bg-base-100 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  {isFaq ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      <HelpCircle className="size-2.5" aria-hidden="true" />
                      FAQ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                      <FileText className="size-2.5" aria-hidden="true" />
                      SOP
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-base-content/50">
                    {Math.round(Math.max(0, Math.min(1, source.score)) * 100)}% relevan
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-1 text-xs font-semibold text-base-content transition-colors group-hover:text-primary">
                  {source.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-base-content/65">
                  {source.content}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <SourceDetailModal source={selectedSource} onClose={() => setSelectedSource(null)} />
    </div>
  );
}

function SourceDetailModal({
  source,
  onClose,
}: {
  source: SourceCitation | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!source) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [source, onClose]);

  if (!source) return null;

  return (
    <dialog
      className="modal modal-open"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-box w-[min(92vw,36rem)] overflow-hidden rounded-2xl border border-base-300 bg-base-100 p-0 shadow-2xl">
        <div className="utarasu-ulos-bar h-[2px] w-full" aria-hidden="true" />
        <div className="border-b border-base-300/80 bg-base-200/50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    source.type === 'faq'
                      ? 'bg-primary/12 text-primary'
                      : 'bg-accent/12 text-accent'
                  )}
                >
                  {source.type}
                </span>
                <span className="text-xs font-medium text-base-content/55">
                  {Math.round(Math.max(0, Math.min(1, source.score)) * 100)}% relevansi
                </span>
              </div>
              <h3 className="mt-2 text-base font-bold leading-snug text-base-content">
                {source.title}
              </h3>
              <p className="mt-0.5 text-xs text-base-content/60">
                Pratinjau kutipan sumber yang digunakan untuk menyusun jawaban.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:bg-base-300/60 hover:text-base-content"
              aria-label="Tutup pratinjau sumber"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="utarasu-scroll max-h-[56vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-base-300/80 bg-base-200/40 p-4 text-xs leading-relaxed text-base-content/85">
            {source.content}
          </div>
        </div>

        <div className="flex justify-end border-t border-base-300/80 bg-base-200/30 px-5 py-3">
          <button
            type="button"
            className="btn btn-primary btn-sm rounded-xl px-4"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
