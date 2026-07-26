'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'postit_visitor_id';

/**
 * Resolved once per page load and reused, so `getSnapshot` stays stable —
 * returning a fresh value on each call would loop React forever.
 */
let cachedId: string | null = null;

function readOrCreateId(): string {
  if (cachedId) return cachedId;

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage — fall through to an in-memory id.
  }

  if (!stored) {
    stored = crypto.randomUUID();
    try {
      window.localStorage.setItem(STORAGE_KEY, stored);
    } catch {
      // Not persisted; the visitor gets a fresh id on the next reload.
    }
  }

  cachedId = stored;
  return stored;
}

/** The value never changes during a page's lifetime, so nothing to subscribe to. */
const subscribe = () => () => {};

/** localStorage does not exist while rendering on the server. */
const getServerSnapshot = () => '';

/**
 * Stable per-browser identifier for anonymous chat.
 *
 * The public chat has no login, so conversations are grouped by this id instead
 * of a user. It is not a credential: every endpoint that accepts it still
 * verifies server-side that the record belongs to this visitor.
 *
 * Returns an empty string on the server and during hydration — callers should
 * wait for a non-empty value before issuing requests. `useSyncExternalStore` is
 * used rather than an effect so that the server and client snapshots are
 * explicit and hydration cannot mismatch.
 */
export function useVisitorId(): string {
  return useSyncExternalStore(subscribe, readOrCreateId, getServerSnapshot);
}
