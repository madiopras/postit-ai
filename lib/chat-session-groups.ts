import type { ChatSession } from '@/lib/chat-client';

export const CHAT_SESSION_GROUP_LABELS = [
  'Hari ini',
  'Kemarin',
  '7 hari terakhir',
  'Lebih lama',
] as const;

export type ChatSessionGroupLabel = (typeof CHAT_SESSION_GROUP_LABELS)[number];

export interface ChatSessionGroup {
  label: ChatSessionGroupLabel;
  sessions: ChatSession[];
}

export function filterChatSessions(
  sessions: ChatSession[],
  query: string
): ChatSession[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
  if (!normalizedQuery) return sessions;

  return sessions.filter((session) =>
    (session.title ?? 'Chat baru')
      .toLocaleLowerCase('id-ID')
      .includes(normalizedQuery)
  );
}

export function groupChatSessions(
  sessions: ChatSession[],
  now: Date = new Date()
): ChatSessionGroup[] {
  const groups = new Map<ChatSessionGroupLabel, ChatSession[]>();
  for (const label of CHAT_SESSION_GROUP_LABELS) groups.set(label, []);

  for (const session of sessions) {
    const updatedAt = new Date(session.updatedAt);
    const label = groupLabelForDate(updatedAt, now);
    groups.get(label)?.push(session);
  }

  return CHAT_SESSION_GROUP_LABELS.flatMap((label) => {
    const groupedSessions = groups.get(label) ?? [];
    return groupedSessions.length > 0 ? [{ label, sessions: groupedSessions }] : [];
  });
}

export function formatChatSessionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupLabelForDate(
  value: Date,
  now: Date
): ChatSessionGroupLabel {
  if (Number.isNaN(value.getTime())) return 'Lebih lama';

  const dayDifference = localCalendarDay(value) - localCalendarDay(now);
  if (dayDifference >= 0) return 'Hari ini';
  if (dayDifference === -1) return 'Kemarin';
  if (dayDifference >= -7) return '7 hari terakhir';
  return 'Lebih lama';
}

function localCalendarDay(value: Date): number {
  return Math.floor(
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000
  );
}
