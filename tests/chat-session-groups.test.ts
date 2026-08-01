import { describe, expect, it } from 'vitest';
import {
  filterChatSessions,
  groupChatSessions,
} from '@/lib/chat-session-groups';
import type { ChatSession } from '@/lib/chat-client';

function session(id: string, title: string | null, updatedAt: Date): ChatSession {
  const serializedDate = Number.isNaN(updatedAt.getTime())
    ? 'invalid-date'
    : updatedAt.toISOString();
  return {
    id,
    title,
    createdAt: serializedDate,
    updatedAt: serializedDate,
  };
}

describe('chat session utilities', () => {
  it('filters titles case-insensitively and supports the null-title fallback', () => {
    const sessions = [
      session('1', 'Reset PASSWORD', new Date(2026, 7, 1, 10)),
      session('2', 'Prosedur refund', new Date(2026, 7, 1, 9)),
      session('3', null, new Date(2026, 7, 1, 8)),
    ];

    expect(filterChatSessions(sessions, ' password ')).toEqual([sessions[0]]);
    expect(filterChatSessions(sessions, 'CHAT BARU')).toEqual([sessions[2]]);
    expect(filterChatSessions(sessions, '   ')).toBe(sessions);
  });

  it('groups browser-local calendar boundaries in the required order', () => {
    const now = new Date(2026, 7, 1, 0, 15);
    const sessions = [
      session('today', 'Hari ini', new Date(2026, 7, 1, 0, 1)),
      session('yesterday', 'Kemarin', new Date(2026, 6, 31, 23, 59)),
      session('week', 'Tujuh hari', new Date(2026, 6, 25, 12)),
      session('older', 'Lama', new Date(2026, 6, 24, 12)),
      session('invalid', 'Invalid', new Date('invalid')),
    ];

    expect(groupChatSessions(sessions, now)).toEqual([
      { label: 'Hari ini', sessions: [sessions[0]] },
      { label: 'Kemarin', sessions: [sessions[1]] },
      { label: '7 hari terakhir', sessions: [sessions[2]] },
      { label: 'Lebih lama', sessions: [sessions[3], sessions[4]] },
    ]);
  });
});
