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
  access: { authenticated: boolean } = { authenticated: true }
): Promise<SearchResult[]> {
  try {
    // Cosine *distance* (`<=>`): smaller means more similar. Cosine similarity is
    // `1 - distance`, so a score of 1 is identical and 0 is unrelated.
    const distance = sql<number>`${documents.embedding} <=> ${toVector(queryEmbedding)}`;

    const publishedAndRelevant = and(
      eq(documents.status, 'published'),
      isNotNull(documents.embedding),
      or(
        eq(documents.type, 'faq'),
        and(
          eq(documents.type, 'sop'),
          eq(documents.sopVersionId, sops.publishedVersionId)
        )
      ),
      sql`1 - (${distance}) >= ${minScore}`
    );
    const accessFilter = access.authenticated
      ? publishedAndRelevant
      : and(
          publishedAndRelevant,
          or(
            eq(documents.type, 'faq'),
            and(eq(documents.type, 'sop'), eq(sops.requiresLogin, false))
          )
        );

    const results = await db
      .select({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        content: documents.content,
        chunkIndex: documents.chunkIndex,
        sourceId: documents.sourceId,
        metadata: documents.metadata,
        similarity: sql<number>`1 - (${distance})`,
      })
      .from(documents)
      .leftJoin(
        sops,
        and(eq(documents.type, 'sop'), eq(documents.sourceId, sops.id))
      )
      // Apply the score threshold and access policy before LIMIT. Restricted
      // SOP content therefore never leaves this query for anonymous callers.
      .where(accessFilter)
      // Order by distance ascending: most similar first. This is also the form
      // pgvector's ivfflat/hnsw indexes can serve.
      .orderBy(distance)
      .limit(limit);

    return results.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      content: r.content,
      chunkIndex: r.chunkIndex ?? 0,
      score: r.similarity,
      sourceId: r.sourceId || undefined,
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
  minScore: number = 0.5
): Promise<boolean> {
  const distance = sql<number>`${documents.embedding} <=> ${toVector(queryEmbedding)}`;
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
        sql`1 - (${distance}) >= ${minScore}`
      )
    )
    .orderBy(distance)
    .limit(1);

  return result.length > 0;
}

// Document counts now live in lib/stats.ts, aggregated in SQL. The version that
// used to sit here selected every row — including every 1536-dimension
// embedding — and counted them in JavaScript.
