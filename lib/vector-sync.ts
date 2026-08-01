import { db } from '@/lib/db';
import { documents, faqs, sops } from '@/lib/schema';
import { embed } from './embedding';
import { processFaqToChunk } from './chunking';
import { eq, and, isNotNull, or, sql } from 'drizzle-orm';

/**
 * Bind an embedding as a pgvector value inside a raw `sql` template.
 *
 * Drizzle only knows a value is a vector when it is assigned to a `vector`
 * column. Inside a raw template it passes the JS array straight to postgres-js,
 * which sends it as a record — Postgres then rejects the query with
 * "cannot cast type record to vector". pgvector parses the '[1,2,3]' text form,
 * which is exactly what JSON.stringify produces for an array of numbers.
 */
function toVector(embedding: number[]) {
  return sql`${JSON.stringify(embedding)}::vector`;
}

const LEXICAL_STOP_WORDS = new Set([
  'apa', 'apakah', 'bagaimana', 'berapa', 'dan', 'dari', 'di', 'ini', 'itu',
  'kapan', 'ke', 'lalu', 'mana', 'mengapa', 'saya', 'sekarang', 'siapa',
  'tolong', 'untuk', 'yang',
]);

/**
 * Keep exact domain terms for PostgreSQL full-text search while discarding
 * conversational words that otherwise make unrelated FAQ questions look alike.
 */
export function buildLexicalSearchQuery(query: string): string {
  const terms = query
    .toLocaleLowerCase('id-ID')
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((term) => term.length > 1 && !LEXICAL_STOP_WORDS.has(term))
    ?? [];
  return [...new Set(terms)].slice(0, 12).join(' ');
}

/**
 * Sync FAQ to vector store
 * Creates or updates document embedding for FAQ
 */
export async function syncFaqToFaq(
  faqId: string,
  question: string,
  answer: string,
  status: 'draft' | 'published' | 'error' = 'draft'
): Promise<void> {
  try {
    // Generate embedding for the FAQ content
    const chunk = processFaqToChunk(question, answer, faqId);
    const embedding = await embed(chunk.content);

    // Check if document already exists
    const existingDocs = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.type, 'faq'),
        eq(documents.sourceId, faqId)
      ));

    if (existingDocs.length > 0) {
      // Update existing documents
      await db
        .update(documents)
        .set({
          title: chunk.title,
          content: chunk.content,
          // Assigned to the vector column directly, same as the insert path
          // below — drizzle serialises it correctly and no cast is needed.
          embedding,
          status,
        })
        .where(and(
          eq(documents.type, 'faq'),
          eq(documents.sourceId, faqId)
        ));
    } else {
      // Insert new document
      await db.insert(documents).values({
        type: 'faq',
        title: chunk.title,
        content: chunk.content,
        chunkIndex: 0,
        sourceId: faqId,
        embedding,
        status,
      });
    }
  } catch (error) {
    console.error('[Vector Sync] FAQ sync error:', error);
    throw error;
  }
}

/**
 * Embed a FAQ and record the outcome on the source row.
 *
 * Call this *after* the FAQ row is committed, never inside a transaction:
 * syncing performs a network round-trip to the embedding API, and the previous
 * code ran it inside `db.transaction()` while writing through the global `db`
 * connection instead of `tx`. That held a transaction open across a slow HTTP
 * call, and the document rows it wrote committed independently — so a rolled
 * back FAQ could leave orphaned vectors behind.
 *
 * @returns the status the FAQ ended up in
 */
export async function syncFaqRecord(
  faqId: string,
  question: string,
  answer: string
): Promise<'published' | 'error'> {
  try {
    await syncFaqToFaq(faqId, question, answer, 'published');
    await db
      .update(faqs)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(faqs.id, faqId));
    return 'published';
  } catch (error) {
    console.error('[Vector Sync] FAQ record sync failed:', error);
    await db
      .update(faqs)
      .set({ status: 'error', updatedAt: new Date() })
      .where(eq(faqs.id, faqId));
    return 'error';
  }
}

/**
 * Search similar documents using vector similarity
 */
export interface SearchResult {
  id: string;
  type: 'faq' | 'sop';
  title: string;
  content: string;
  chunkIndex: number;
  score: number;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

export async function searchSimilarDocuments(
  queryEmbedding: number[],
  limit: number = 5,
  minScore: number = 0.5,
  access: { authenticated: boolean; queryText?: string } = { authenticated: true }
): Promise<SearchResult[]> {
  try {
    const vector = toVector(queryEmbedding);
    const lexicalQuery = buildLexicalSearchQuery(access.queryText ?? '');
    const lexicalTsQuery = lexicalQuery.split(' ').join(' | ');
    const candidateLimit = Math.max(limit * 4, 20);
    const accessSql = access.authenticated
      ? sql`true`
      : sql`(d.type = 'faq' OR (d.type = 'sop' AND s.requires_login = false))`;

    // Reciprocal Rank Fusion combines semantic and exact-term ranks without
    // pretending that cosine similarity and ts_rank share the same scale.
    // The access and publication boundary lives in `accessible`, before either
    // candidate set can rank or return protected content.
    const rows = await db.execute(sql`
      WITH accessible AS (
        SELECT
          d.id,
          d.type,
          d.title,
          d.content,
          d.chunk_index,
          d.source_id,
          d.metadata,
          1 - (d.embedding <=> ${vector}) AS vector_score,
          ts_rank_cd(
            to_tsvector('simple', coalesce(d.title, '') || ' ' || coalesce(d.content, '')),
            to_tsquery('simple', ${lexicalTsQuery})
          ) AS text_score
        FROM documents d
        LEFT JOIN sops s
          ON d.type = 'sop' AND d.source_id = s.id
        WHERE d.status = 'published'
          AND d.embedding IS NOT NULL
          AND (
            d.type = 'faq'
            OR (
              d.type = 'sop'
              AND d.sop_version_id = s.published_version_id
            )
          )
          AND ${accessSql}
      ),
      vector_candidates AS (
        SELECT id, row_number() OVER (ORDER BY vector_score DESC) AS vector_rank
        FROM accessible
        WHERE vector_score >= ${minScore}
        ORDER BY vector_score DESC
        LIMIT ${candidateLimit}
      ),
      text_candidates AS (
        SELECT id, row_number() OVER (ORDER BY text_score DESC) AS text_rank
        FROM accessible
        WHERE ${lexicalQuery.length > 0} AND text_score > 0
        ORDER BY text_score DESC
        LIMIT ${candidateLimit}
      ),
      fused AS (
        SELECT
          coalesce(v.id, t.id) AS id,
          coalesce(1.0 / (60 + v.vector_rank), 0)
            + coalesce(1.0 / (60 + t.text_rank), 0) AS fusion_score
        FROM vector_candidates v
        FULL OUTER JOIN text_candidates t ON t.id = v.id
      )
      SELECT
        a.id,
        a.type,
        a.title,
        a.content,
        a.chunk_index,
        a.source_id,
        a.metadata,
        a.vector_score AS score
      FROM fused f
      INNER JOIN accessible a ON a.id = f.id
      ORDER BY f.fusion_score DESC, a.vector_score DESC
      LIMIT ${limit}
    `);

    const results = rows as unknown as Array<{
      id: string;
      type: 'faq' | 'sop';
      title: string;
      content: string;
      chunk_index: number | null;
      source_id: string | null;
      metadata: Record<string, unknown> | null;
      score: number | string;
    }>;

    return results.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      content: r.content,
      chunkIndex: r.chunk_index ?? 0,
      score: Number(r.score),
      sourceId: r.source_id || undefined,
      metadata: r.metadata ?? undefined,
    }));
  } catch (error) {
    console.error('[Vector Sync] Search error:', error);
    throw error;
  }
}

/**
 * Check whether an anonymous query matched protected SOP content without
 * selecting that content. Used only to render a login CTA when no accessible
 * answer is available.
 */
export async function hasRelevantRestrictedSop(
  queryEmbedding: number[],
  minScore: number = 0.5,
  queryText: string = ''
): Promise<boolean> {
  const distance = sql<number>`${documents.embedding} <=> ${toVector(queryEmbedding)}`;
  const lexicalQuery = buildLexicalSearchQuery(queryText);
  const lexicalTsQuery = lexicalQuery.split(' ').join(' | ');
  const documentText = sql`to_tsvector(
    'simple',
    coalesce(${documents.title}, '') || ' ' || coalesce(${documents.content}, '')
  )`;
  const result = await db
    .select({ id: documents.id })
    .from(documents)
    .innerJoin(
      sops,
      and(eq(documents.type, 'sop'), eq(documents.sourceId, sops.id))
    )
    .where(
      and(
        eq(documents.status, 'published'),
        eq(sops.requiresLogin, true),
        eq(documents.sopVersionId, sops.publishedVersionId),
        isNotNull(documents.embedding),
        or(
          sql`1 - (${distance}) >= ${minScore}`,
          and(
            sql`${lexicalQuery.length > 0}`,
            sql`${documentText} @@ to_tsquery('simple', ${lexicalTsQuery})`
          )
        )
      )
    )
    .orderBy(distance)
    .limit(1);

  return result.length > 0;
}

// Document counts now live in lib/stats.ts, aggregated in SQL. The version that
// used to sit here selected every row — including every 1536-dimension
// embedding — and counted them in JavaScript.
