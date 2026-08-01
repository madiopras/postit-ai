'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/untitled/base/buttons/button';
import type { SourceCitation } from '@/lib/chat-client';
import { cn } from '@/lib/utils';

export function SourceList({ sources }: { sources: SourceCitation[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  if (sources.length === 0) return null;

  return (
    <div className="mt-3">
      <Button
        variant="link"
        size="sm"
        onPress={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="gap-1.5 text-sm"
      >
        Lihat {sources.length} sumber
        <ChevronDown
          className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </Button>

      {isOpen && (
        <div id={panelId} className="mt-3 grid gap-3 sm:grid-cols-2">
          {sources.map((source) => (
            <article
              key={`${source.type}-${source.id}-${source.chunkIndex ?? 0}`}
              className="min-w-0 rounded-ui-lg border border-border-secondary bg-bg-secondary p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    source.type === 'faq'
                      ? 'bg-brand-subtle text-brand-text'
                      : 'bg-warning-bg text-warning-fg'
                  )}
                >
                  {source.type.toUpperCase()}
                </span>
                <span className="shrink-0 text-xs text-fg-quaternary">
                  Relevansi {Math.round(Math.max(0, Math.min(1, source.score)) * 100)}%
                </span>
              </div>
              <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-fg-primary">
                {source.title}
              </h3>
              <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-fg-tertiary">
                {source.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
