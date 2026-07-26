import type { NextRequest } from 'next/server';

/**
 * In-memory sliding-window rate limiter.
 *
 * `/api/chat` is public by design, which makes it a direct funnel into a paid
 * LLM endpoint — every unauthenticated request costs embedding plus completion
 * tokens. This caps that.
 *
 * State lives in this process, so the limit is per instance: running N replicas
 * effectively multiplies the cap by N. That is acceptable for the current
 * single-instance deployment; move to Redis before scaling out.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still available in the current window. */
  remaining: number;
  /** Seconds until the oldest hit falls out of the window. */
  retryAfterSeconds: number;
}

/** key -> timestamps (ms) of hits still inside the window */
const hits = new Map<string, number[]>();

const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = 0;

/**
 * Drop keys with no recent activity so the map cannot grow without bound.
 * Runs at most once per SWEEP_INTERVAL_MS rather than on every request.
 */
function sweep(now: number, windowMs: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;

  for (const [key, timestamps] of hits) {
    const newest = timestamps[timestamps.length - 1];
    if (newest === undefined || now - newest >= windowMs) {
      hits.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    hits.set(key, recent);
    const oldest = recent[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(key, recent);

  return {
    allowed: true,
    remaining: limit - recent.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Best-effort client identity for rate limiting.
 *
 * `NextRequest.ip` was removed in Next.js 15, so this reads the proxy headers.
 * They are client-controllable when the app is not behind a trusted proxy —
 * good enough to stop casual abuse, not a security control.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Left-most entry is the original client.
    return forwarded.split(',')[0]!.trim();
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Exported for tests — clears all recorded hits. */
export function resetRateLimits(): void {
  hits.clear();
  lastSweep = 0;
}
