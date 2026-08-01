import { NextResponse, type NextRequest } from 'next/server';
import { optionalAuth } from '@/lib/auth';

export type ChatOwner =
  | { kind: 'user'; userId: string }
  | { kind: 'visitor'; visitorId: string };

export type ChatIdentityResult =
  | { ok: true; owner: ChatOwner }
  | { ok: false; response: NextResponse };

/**
 * Resolve the authoritative owner for a public chat endpoint.
 *
 * A valid account always wins over the browser visitor id. Anonymous callers
 * must supply the opaque visitor id used by the existing public chat.
 */
export async function resolveChatOwner(
  req: NextRequest,
  visitorId: string | null | undefined
): Promise<ChatIdentityResult> {
  const auth = await optionalAuth(req);
  if (!auth.ok) return auth;
  if (auth.session) {
    return { ok: true, owner: { kind: 'user', userId: auth.session.userId } };
  }
  if (!visitorId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'visitorId is required' },
        },
        { status: 400 }
      ),
    };
  }
  return { ok: true, owner: { kind: 'visitor', visitorId } };
}

export function ownsChat(
  chat: { userId: string | null; visitorId: string | null },
  owner: ChatOwner
): boolean {
  return owner.kind === 'user'
    ? chat.userId === owner.userId
    : chat.userId === null && chat.visitorId === owner.visitorId;
}

function citationIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((source) =>
    source &&
    typeof source === 'object' &&
    'id' in source &&
    typeof source.id === 'string'
      ? [source.id]
      : []
  );
}

export function redactRestrictedMessages<
  T extends { content: string; sources: unknown }
>(history: T[], restrictedIds: ReadonlySet<string>): Array<T & { loginRequired?: boolean }> {
  return history.map((message) => {
    const containsRestrictedSource = citationIds(message.sources).some(
      (sourceId) => restrictedIds.has(sourceId)
    );
    return containsRestrictedSource
      ? {
          ...message,
          content:
            'Informasi tersebut kini memerlukan login. Silakan login untuk membuka SOP.',
          sources: [],
          loginRequired: true,
        }
      : message;
  });
}

export function citedDocumentIds(value: unknown): string[] {
  return citationIds(value);
}
