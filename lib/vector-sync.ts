import { db } from '@/lib/db';
import { documents, faqs, sops } from '@/lib/schema';
import { embed, embedBatch } from './embedding';
import { processSopToChunks, processFaqToChunk } from './chunking';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

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
 * Sync SOP to vector store
 * Chunks SOP content and creates embeddings for each chunk
 */
export async function syncSopToVectors(
  sopId: string,
  title: string,
  content: string,
  status: 'draft' | 'published' | 'error' = 'draft'
): Promise<void> {
  try {
    // First, delete existing documents for this SOP
    await db
      .delete(documents)
      .where(and(
        eq(documents.type, 'sop'),
        eq(documents.sourceId, sopId)
      ));

    // Process SOP into chunks
    const chunks = processSopToChunks(title, content, sopId);

    if (chunks.length === 0) {
      return;
    }

    // Generate embeddings for all chunks
    const chunkContents = chunks.map(c => c.content);
    const embeddings = await embedBatch(chunkContents);

    // Insert all chunks with embeddings
    const insertData = chunks.map((chunk, index) => ({
      type: 'sop' as const,
      title: chunk.title,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      sourceId: sopId,
      embedding: embeddings[index],
      status,
    }));

    await db.insert(documents).values(insertData);
  } catch (error) {
    console.error('[Vector Sync] SOP sync error:', error);
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
 * Chunk, embed and record the outcome for a SOP. See `syncFaqRecord`.
 */
export async function syncSopRecord(
  sopId: string,
  title: string,
  content: string
): Promise<'published' | 'error'> {
  try {
    await syncSopToVectors(sopId, title, content, 'published');
    await db
      .update(sops)
      .set({ status: 'published', updatedAt: new Date() })
      .where(eq(sops.id, sopId));
    return 'published';
  } catch (error) {
    console.error('[Vector Sync] SOP record sync failed:', error);
    await db
      .update(sops)
      .set({ status: 'error', updatedAt: new Date() })
      .where(eq(sops.id, sopId));
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
}

export async function searchSimilarDocuments(
  queryEmbedding: number[],
  limit: number = 5,
  minScore: number = 0.5
): Promise<SearchResult[]> {
  try {
    // Cosine *distance* (`<=>`): smaller means more similar. Cosine similarity is
    // `1 - distance`, so a score of 1 is identical and 0 is unrelated.
    const distance = sql<number>`${documents.embedding} <=> ${toVector(queryEmbedding)}`;

    const results = await db
      .select({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        content: documents.content,
        chunkIndex: documents.chunkIndex,
        sourceId: documents.sourceId,
        similarity: sql<number>`1 - (${distance})`,
      })
      .from(documents)
      .where(and(
        eq(documents.status, 'published'),
        isNotNull(documents.embedding),
        // Apply the score threshold in SQL so that LIMIT selects from documents
        // that already passed it. Filtering after LIMIT would discard the whole
        // page whenever the top matches fall below minScore.
        sql`1 - (${distance}) >= ${minScore}`
      ))
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
    }));
  } catch (error) {
    console.error('[Vector Sync] Search error:', error);
    throw error;
  }
}

// Document counts now live in lib/stats.ts, aggregated in SQL. The version that
// used to sit here selected every row — including every 1536-dimension
// embedding — and counted them in JavaScript.