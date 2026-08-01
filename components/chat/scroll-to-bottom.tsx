'use client';

import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/untitled/base/buttons/button';
import { Tooltip } from '@/components/untitled/base/tooltip/tooltip';

export function ScrollToBottom({ onPress }: { onPress: () => void }) {
  return (
    <Tooltip content="Ke pesan terbaru">
      <Button
        variant="secondary"
        size="sm"
        onPress={onPress}
        className="size-10 min-h-10 rounded-full p-0 shadow-ui-sm"
        aria-label="Ke pesan terbaru"
      >
        <ArrowDown className="size-5" aria-hidden="true" />
        <span className="sr-only">Ke pesan terbaru</span>
      </Button>
    </Tooltip>
  );
}
