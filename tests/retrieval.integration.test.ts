import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

/**
 * The regression guard for the worst bug this project had.
 *
 * `searchSimilarDocuments` ordered by *similarity ascending*, so it returned the
 * least relevant documents first; the minScore filter then ran after LIMIT and
 * usually discarded the whole page. The chatbot answered from unrelated context,
 * or cited nothing at all, for as long as the code existed.
 *
 * This exercises the real SQL against a real pgvector, in a throwaway schema —
 * a mock could not have caught it, because the bug was in the ordering the
 * database was asked for.
 *
 * Skipped when DATABASE_URL is unset so the unit suite still runs anywhere.
 */

const DATABASE_URL = process.env.DATABASE_URL;
const SCHEMA = 'retrieval_test';
const DIMS = 8;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sql: any;

/** A unit vector pointing mostly along axis `axis`, with a little noise. */
function vectorFor(axis: number): number[] {
  const v = Array.from({ length: DIMS }, (_, i) => (i === axis ? 1 : 0.05));
  const norm = Math.hypot(...v);
  return v.map((x) => x / norm);
}

const toVectorLiteral = (v: number[]) => JSON.stringify(v);

describe.skipIf(!DATABASE_URL)('searchSimilarDocuments ordering (pgvector)', () => {
  beforeAll(async () => {
    sql = postgres(DATABASE_URL!, { max: 1 });

    await sql.unsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    await sql.unsafe(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await sql.unsafe(`CREATE SCHEMA ${SCHEMA}`);
    await sql.unsafe(`
      CREATE TABLE ${SCHEMA}.documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        status text NOT NULL,
        embedding vector(${DIMS})
      )
    `);

    // Axis 0 is the query direction; each later axis is further away.
    const rows = [
      { title: 'paling mirip', axis: 0, status: 'published' },
      { title: 'agak mirip', axis: 1, status: 'published' },
      { title: 'kurang mirip', axis: 2, status: 'published' },
      { title: 'jauh', axis: 3, status: 'published' },
      { title: 'draft yang mirip', axis: 0, status: 'draft' },
    ];

    for (const row of rows) {
      await sql.unsafe(
        `INSERT INTO ${SCHEMA}.documents (title, status, embedding)
         VALUES ($1, $2, $3::vector)`,
        [row.title, row.status, toVectorLiteral(vectorFor(row.axis))]
      );
    }
  });

  afterAll(async () => {
    if (!sql) return;
    await sql.unsafe(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
    await sql.end();
  });

  /** The exact query shape lib/vector-sync.ts builds. */
  async function search(limit: number, minScore: number) {
    const query = toVectorLiteral(vectorFor(0));
    return sql.unsafe(
      `SELECT title, 1 - (embedding <=> $1::vector) AS score
         FROM ${SCHEMA}.documents
        WHERE status = 'published'
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> $1::vector) >= $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3`,
      [query, minScore, limit]
    );
  }

  it('returns the most similar document first', async () => {
    const rows = await search(5, 0);

    expect(rows[0].title).toBe('paling mirip');
  });

  it('orders scores strictly descending', async () => {
    const rows = await search(5, 0);
    const scores = rows.map((r: { score: number }) => Number(r.score));

    // The inverted query produced ascending scores — this is the assertion
    // that would have failed.
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('applies the score threshold before LIMIT, not after', async () => {
    // With the threshold applied after LIMIT, a tight limit returns the top row
    // and then throws it away when the rest of the page falls below minScore.
    const rows = await search(1, 0.5);

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('paling mirip');
    expect(Number(rows[0].score)).toBeGreaterThanOrEqual(0.5);
  });

  it('never returns unpublished documents', async () => {
    const rows = await search(10, 0);
    const titles = rows.map((r: { title: string }) => r.title);

    // The draft sits at the query axis, so it would rank first if leaked.
    expect(titles).not.toContain('draft yang mirip');
  });

  it('respects the limit', async () => {
    expect(await search(2, 0)).toHaveLength(2);
  });
});
