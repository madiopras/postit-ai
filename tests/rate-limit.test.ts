import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getClientIp, rateLimit, resetRateLimits } from '@/lib/rate-limit';
import type { NextRequest } from 'next/server';

/**
 * `/api/chat` is public by design, which makes it a direct funnel into a paid
 * LLM. This is the only thing standing between an open endpoint and a bill.
 */

const WINDOW = 60_000;

beforeEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

describe('rateLimit', () => {
  it('allows exactly `limit` requests then blocks', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('ip-a', 5, WINDOW).allowed).toBe(true);
    }

    expect(rateLimit('ip-a', 5, WINDOW).allowed).toBe(false);
  });

  it('counts down the remaining allowance', () => {
    expect(rateLimit('ip-b', 3, WINDOW).remaining).toBe(2);
    expect(rateLimit('ip-b', 3, WINDOW).remaining).toBe(1);
    expect(rateLimit('ip-b', 3, WINDOW).remaining).toBe(0);
  });

  it('keeps callers isolated from each other', () => {
    rateLimit('ip-c', 1, WINDOW);
    expect(rateLimit('ip-c', 1, WINDOW).allowed).toBe(false);
    // A different client must not inherit the block.
    expect(rateLimit('ip-d', 1, WINDOW).allowed).toBe(true);
  });

  it('reports a positive retry-after when blocked', () => {
    rateLimit('ip-e', 1, WINDOW);
    const blocked = rateLimit('ip-e', 1, WINDOW);

    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('lets requests through again once the window slides past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    rateLimit('ip-f', 1, WINDOW);
    expect(rateLimit('ip-f', 1, WINDOW).allowed).toBe(false);

    vi.advanceTimersByTime(WINDOW + 1);
    expect(rateLimit('ip-f', 1, WINDOW).allowed).toBe(true);
  });

  it('slides rather than resetting in fixed buckets', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    rateLimit('ip-g', 2, WINDOW);
    vi.advanceTimersByTime(WINDOW / 2);
    rateLimit('ip-g', 2, WINDOW);

    // Both hits are still inside the window.
    expect(rateLimit('ip-g', 2, WINDOW).allowed).toBe(false);

    // Only the first has aged out here, so exactly one slot frees up.
    vi.advanceTimersByTime(WINDOW / 2 + 1);
    expect(rateLimit('ip-g', 2, WINDOW).allowed).toBe(true);
    expect(rateLimit('ip-g', 2, WINDOW).allowed).toBe(false);
  });
});

describe('getClientIp', () => {
  const reqWith = (headers: Record<string, string>) =>
    ({ headers: new Headers(headers) }) as NextRequest;

  it('takes the left-most x-forwarded-for entry', () => {
    // The right-hand entries are proxies, not the caller.
    expect(getClientIp(reqWith({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe(
      '203.0.113.9'
    );
  });

  it('falls back to x-real-ip', () => {
    expect(getClientIp(reqWith({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('returns a stable placeholder when nothing identifies the caller', () => {
    // All such callers share one bucket — deliberate, so a header-stripping
    // client cannot escape the limit entirely.
    expect(getClientIp(reqWith({}))).toBe('unknown');
  });
});
