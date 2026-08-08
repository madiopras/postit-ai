'use client';

import { useId, useState } from 'react';
import { BookOpen, ChevronDown, FileText, HelpCircle, X } from 'lucide-react';
import type { SourceCitation } from '@/lib/chat-client';
import { cn } from '@/lib/utils';

export function SourceList({ sources }: { sources: SourceCitation[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);
  const panelId = useId();

  if (sources.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-base-300/60 bg-base-100/60 p-2.5 shadow-xs backdrop-blur-md">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="btn btn-ghost btn-xs h-9 rounded-full border border-base-300/70 bg-base-100/70 px-3 text-base-content/80 shadow-sm transition-all hover:border-primary/30 hover:bg-base-100 hover:text-base-content"
      >
        <BookOpen className="size-3.5 text-primary" aria-hidden="true" />
        <span>{sources.length} Sumber referensi</span>
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div id={panelId} className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {sources.map((source) => {
            const isFaq = source.type === 'faq';
            return (
              <button
                type="button"
                key={`${source.type}-${source.id}-${source.chunkIndex ?? 0}`}
                onClick={() => setSelectedSource(source)}
                className="group flex flex-col items-start rounded-2xl border border-base-300/60 bg-base-100/70 p-3 text-left shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-base-100 hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isFaq ? (
                      <span className="badge badge-primary badge-soft badge-xs gap-1 font-semibold">
                        <HelpCircle className="size-2.5" aria-hidden="true" />
                        FAQ
                      </span>
                    ) : (
                      <span className="badge badge-warning badge-soft badge-xs gap-1 font-semibold">
                        <FileText className="size-2.5" aria-hidden="true" />
                        SOP
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-base-content/50 group-hover:text-base-content/80">
                    {Math.round(Math.max(0, Math.min(1, source.score)) * 100)}% relevansi
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-1 text-xs font-semibold text-base-content group-hover:text-primary transition-colors">
                  {source.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-base-content/70">
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
  if (!source) return null;

  return (
    <dialog
      className="modal modal-open"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-box w-[min(92vw,36rem)] overflow-hidden border border-base-300/70 bg-base-100/90 p-0 shadow-[0_30px_100px_-40px_rgba(15,23,42,0.65)] backdrop-blur-2xl">
        <div className="border-b border-base-300/60 bg-base-200/40 px-4 py-3 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'badge badge-sm badge-soft font-semibold uppercase tracking-wide',
                    source.type === 'faq' ? 'badge-primary' : 'badge-warning'
                  )}
                >
                  {source.type}
                </span>
                <span className="badge badge-ghost badge-sm border border-base-300/60 text-[11px] font-medium text-base-content/60">
                  {Math.round(Math.max(0, Math.min(1, source.score)) * 100)}% relevansi
                </span>
              </div>
              <h3 className="mt-2 text-base font-bold leading-snug text-base-content">
                {source.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-base-content/60">
                Pratinjau sumber yang digunakan untuk membangun jawaban.
              </p>
            </div>

            <button
              onClick={onClose}
              className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:bg-base-200/70 hover:text-base-content"
              aria-label="Tutup pratinjau sumber"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-base-300/60 bg-base-100/75 p-4 text-xs leading-relaxed whitespace-pre-wrap text-base-content/80 shadow-xs">
            {source.content}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-base-300/60 bg-base-200/30 px-4 py-3">
          <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

