import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chats, documents, faqs, messages, sops } from '@/lib/schema';

/**
 * Dashboard aggregates.
 *
 * Everything here is counted in SQL. The previous `getDocumentStats` in
 * vector-sync.ts selected every row and counted in JavaScript, which would have
 * pulled every 1536-dimension embedding over the wire to produce four numbers.
 */

export interface StatusBreakdown {
  total: number;
  published: number;
  draft: number;
  error: number;
}

export interface TrendPoint {
  /** ISO date, YYYY-MM-DD */
  date: string;
  chats: number;
  messages: number;
}

export interface DashboardStats {
  faqs: StatusBreakdown;
  sops: StatusBreakdown;
  documents: {
    total: number;
    embedded: number;
    missingEmbedding: number;
    faq: number;
    sop: number;
    error: number;
  };
  conversations: { total: number; last7Days: number };
  messages: { total: number; user: number; assistant: number };
  feedback: { thumbsUp: number; thumbsDown: number; rated: number };
  trend: TrendPoint[];
}

const TREND_DAYS = 30;

/** count(*) filter (...) returns bigint; ::int keeps it a JS number. */
const countWhere = (condition: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${condition})::int`;

const countAll = sql<number>`count(*)::int`;

export async function getDashboardStats(): Promise<DashboardStats> {
  const [faqRow] = await db
    .select({
      total: countAll,
      published: countWhere(sql`${faqs.status} = 'published'`),
      draft: countWhere(sql`${faqs.status} = 'draft'`),
      error: countWhere(sql`${faqs.status} = 'error'`),
    })
    .from(faqs);

  const [sopRow] = await db
    .select({
      total: countAll,
      published: countWhere(sql`${sops.status} = 'published'`),
      draft: countWhere(sql`${sops.status} = 'draft'`),
      error: countWhere(sql`${sops.status} = 'error'`),
    })
    .from(sops);

  const [docRow] = await db
    .select({
      total: countAll,
      embedded: countWhere(sql`${documents.embedding} is not null`),
      missingEmbedding: countWhere(sql`${documents.embedding} is null`),
      faq: countWhere(sql`${documents.type} = 'faq'`),
      sop: countWhere(sql`${documents.type} = 'sop'`),
      error: countWhere(sql`${documents.status} = 'error'`),
    })
    .from(documents);

  const [chatRow] = await db
    .select({
      total: countAll,
      last7Days: countWhere(sql`${chats.createdAt} >= now() - interval '7 days'`),
    })
    .from(chats);

  const [messageRow] = await db
    .select({
      total: countAll,
      user: countWhere(sql`${messages.role} = 'user'`),
      assistant: countWhere(sql`${messages.role} = 'assistant'`),
      thumbsUp: countWhere(sql`${messages.feedback} = 'thumbs_up'`),
      thumbsDown: countWhere(sql`${messages.feedback} = 'thumbs_down'`),
    })
    .from(messages);

  return {
    faqs: faqRow,
    sops: sopRow,
    documents: docRow,
    conversations: chatRow,
    messages: {
      total: messageRow.total,
      user: messageRow.user,
      assistant: messageRow.assistant,
    },
    feedback: {
      thumbsUp: messageRow.thumbsUp,
      thumbsDown: messageRow.thumbsDown,
      rated: messageRow.thumbsUp + messageRow.thumbsDown,
    },
    trend: await getTrend(),
  };
}

/**
 * Daily conversation and message counts for the last 30 days, gaps included.
 *
 * Days are bucketed by the database server's timezone. That is fine for a
 * single-region deployment; a multi-timezone one would need an explicit zone.
 */
async function getTrend(): Promise<TrendPoint[]> {
  const [chatsByDay, messagesByDay] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char(${chats.createdAt}, 'YYYY-MM-DD')`,
        count: countAll,
      })
      .from(chats)
      .where(sql`${chats.createdAt} >= current_date - make_interval(days => ${TREND_DAYS - 1})`)
      .groupBy(sql`1`),
    db
      .select({
        day: sql<string>`to_char(${messages.createdAt}, 'YYYY-MM-DD')`,
        count: countAll,
      })
      .from(messages)
      .where(sql`${messages.createdAt} >= current_date - make_interval(days => ${TREND_DAYS - 1})`)
      .groupBy(sql`1`),
  ]);

  const chatCounts = new Map(chatsByDay.map((r) => [r.day, r.count]));
  const messageCounts = new Map(messagesByDay.map((r) => [r.day, r.count]));

  // Emit every day in the window, including the empty ones — a line chart that
  // skips quiet days misrepresents the shape of the trend.
  const points: TrendPoint[] = [];
  const today = new Date();

  for (let offset = TREND_DAYS - 1; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const key = d.toISOString().slice(0, 10);

    points.push({
      date: key,
      chats: chatCounts.get(key) ?? 0,
      messages: messageCounts.get(key) ?? 0,
    });
  }

  return points;
}
