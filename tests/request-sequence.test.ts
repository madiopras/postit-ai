import { describe, expect, it } from 'vitest';
import { RequestSequence } from '@/lib/request-sequence';

describe('RequestSequence', () => {
  it('aborts the previous request and marks a late response as stale', () => {
    const sequence = new RequestSequence();
    const first = sequence.begin();
    const second = sequence.begin();

    expect(first.signal.aborted).toBe(true);
    expect(first.isCurrent()).toBe(false);
    expect(second.signal.aborted).toBe(false);
    expect(second.isCurrent()).toBe(true);
  });

  it('invalidates the active request during new-chat or unmount transitions', () => {
    const sequence = new RequestSequence();
    const active = sequence.begin();

    sequence.invalidate();

    expect(active.signal.aborted).toBe(true);
    expect(active.isCurrent()).toBe(false);
  });
});
