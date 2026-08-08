'use client';

import { useId, useState } from 'react';
import { BookOpen, ChevronDown, FileText, HelpCircle, X } from 'lucide-react';
import {
  Dialog,
  Modal,
  ModalDescription,
  ModalOverlay,
  ModalTitle,
} from '@/components/untitled/application/modals/modal';
import { Button } from '@/components/untitled/base/buttons/button';
import type { SourceCitation } from '@/lib/chat-client';
import { cn } from '@/lib/utils';

export function SourceList({ sources }: { sources: SourceCitation[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceCitation | null>(null);
  const panelId = useId();

  if (sources.length === 0) return null;

  return (
    <div className="mt-3">
      <Button
        variant="tertiary"
        size="sm"
        onPress={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="h-7 gap-1.5 rounded-ui-full border border-border-secondary/80 bg-bg-secondary/60 px-3 text-xs font-medium text-fg-tertiary hover:bg-bg-tertiary hover:text-fg-secondary"
      >
        <BookOpen className="size-3.5" aria-hidden="true" />
        <span>{sources.length} Sumber referensi</span>
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </Button>

      {isOpen && (
        <div id={panelId} className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {sources.map((source) => {
            const isFaq = source.type === 'faq';
            return (
              <button
                type="button"
                key={`${source.type}-${source.id}-${source.chunkIndex ?? 0}`}
                onClick={() => setSelectedSource(source)}
                className="group flex flex-col items-start rounded-xl border border-border-secondary/80 bg-bg-secondary/70 p-3 text-left transition-all duration-150 hover:border-border-brand/60 hover:bg-bg-secondary hover:shadow-ui-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isFaq ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-brand-subtle px-1.5 py-0.5 text-[10px] font-semibold text-brand-text">
                        <HelpCircle className="size-2.5" aria-hidden="true" />
                        FAQ
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold text-warning-fg">
                        <FileText className="size-2.5" aria-hidden="true" />
                        SOP
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-fg-quaternary group-hover:text-fg-tertiary">
                    {Math.round(Math.max(0, Math.min(1, source.score)) * 100)}% relevansi
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-1 text-xs font-semibold text-fg-primary group-hover:text-brand-text">
                  {source.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-tertiary">
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
  return (
    <ModalOverlay isOpen={Boolean(source)} onOpenChange={(open) => !open && onClose()}>
      <Modal className="max-w-lg">
        <Dialog className="p-5">
          {source && (
            <div>
              <div className="flex items-center justify-between border-b border-border-secondary/60 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-semibold',
                      source.type === 'faq'
                        ? 'bg-brand-subtle text-brand-text'
                        : 'bg-warning-bg text-warning-fg'
                    )}
                  >
                    {source.type.toUpperCase()}
                  </span>
                  <span className="text-xs text-fg-quaternary">
                    Relevansi {Math.round(Math.max(0, Math.min(1, source.score)) * 100)}%
                  </span>
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  onPress={onClose}
                  className="size-7 min-h-7 p-0 text-fg-quaternary hover:text-fg-primary"
                  aria-label="Tutup pratinjau sumber"
                >
                  <X className="size-4" aria-hidden="true" />
                  <span className="sr-only">Tutup</span>
                </Button>
              </div>

              <div className="mt-4">
                <ModalTitle className="text-base font-semibold leading-snug text-fg-primary">
                  {source.title}
                </ModalTitle>
                <ModalDescription className="sr-only">
                  Detail dokumen referensi kutipan jawaban
                </ModalDescription>
                <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-lg bg-bg-secondary p-3.5 text-xs leading-relaxed text-fg-secondary">
                  {source.content}
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button variant="secondary" size="sm" onPress={onClose}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

