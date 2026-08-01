import type { NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { auditLogs, type UserRole } from '@/lib/schema';

const SENSITIVE_KEY = /(password|secret|token|api.?key|authorization|cookie|content|data)/i;
const MAX_STRING_LENGTH = 500;
const MAX_ARRAY_ITEMS = 50;
const MAX_DEPTH = 4;

type AuditActor = {
  userId: string;
  username: string;
  role: UserRole;
};

export interface AuditEvent {
  actor: AuditActor;
  request: NextRequest;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return '[truncated]';
  if (
    value === null
    || typeof value === 'boolean'
    || typeof value === 'number'
  ) return value;
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH);
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .slice(0, MAX_ARRAY_ITEMS)
        .map(([key, item]) => [key, sanitizeValue(item, depth + 1)])
    );
  }
  return String(value).slice(0, MAX_STRING_LENGTH);
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> = {}
): Record<string, unknown> {
  return sanitizeValue(metadata, 0) as Record<string, unknown>;
}

function requestIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (forwarded || request.headers.get('x-real-ip')?.trim() || null)?.slice(0, 100) ?? null;
}

/**
 * Audit persistence is deliberately best-effort at route boundaries: an audit
 * storage outage must not turn an already-committed business mutation into a
 * misleading HTTP failure. Critical transactional workflows may pass the same
 * event data into their own transaction in a future compliance mode.
 */
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: event.actor.userId,
      actorUsername: event.actor.username.slice(0, 100),
      actorRole: event.actor.role,
      action: event.action.slice(0, 100),
      entityType: event.entityType.slice(0, 100),
      entityId: event.entityId?.slice(0, 200) || null,
      metadata: sanitizeAuditMetadata(event.metadata),
      ipAddress: requestIp(event.request),
      userAgent: event.request.headers.get('user-agent')?.slice(0, 500) || null,
    });
  } catch (error) {
    console.error('[Audit] Failed to persist audit event:', error);
  }
}
