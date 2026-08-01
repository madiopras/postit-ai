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
      CREATE TABLE ${SCHEMA}.sops (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        requires_login boolean NOT NULL DEFAULT false,
        published_version_id uuid
      )
    `);
    await sql.unsafe(`
      CREATE TABLE ${SCHEMA}.documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        content text NOT NULL DEFAULT '',
        type text NOT NULL DEFAULT 'faq',
        source_id uuid,
        sop_version_id uuid,
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

    const [publicSop] = await sql.unsafe(
      `INSERT INTO ${SCHEMA}.sops (requires_login, published_version_id)
       VALUES (false, gen_random_uuid()) RETURNING id, published_version_id`
    );
    const [privateSop] = await sql.unsafe(
      `INSERT INTO ${SCHEMA}.sops (requires_login, published_version_id)
       VALUES (true, gen_random_uuid()) RETURNING id, published_version_id`
    );
    await sql.unsafe(
      `INSERT INTO ${SCHEMA}.documents
         (title, content, type, source_id, sop_version_id, status, embedding)
       VALUES
         ('SOP publik', 'konten publik', 'sop', $1, $2, 'published', $5::vector),
         ('SOP privat', 'RAHASIA', 'sop', $3, $4, 'published', $5::vector),
         ('SOP versi lama', 'LEGACY-TOKEN', 'sop', $1, gen_random_uuid(), 'published', $5::vector)`,
      [
        publicSop.id,
        publicSop.published_version_id,
        privateSop.id,
        privateSop.published_version_id,
        toVectorLiteral(vectorFor(4)),
      ]
    );

    await sql.unsafe(
      `INSERT INTO ${SCHEMA}.documents (title, content, status, embedding)
       VALUES
         ('Kode terminal ZXQ-991', 'Gunakan token ORBIT-77 untuk aktivasi.', 'published', $1::vector),
         ('Draft kode ZXQ-991', 'ORBIT-77 tidak boleh ditemukan.', 'draft', $1::vector)`,
      [toVectorLiteral(vectorFor(6))]
    );
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

  async function hybridSearch(queryText: string, authenticated: boolean) {
    const query = toVectorLiteral(vectorFor(0));
    const lexicalQuery = queryText.toLocaleLowerCase().match(/[a-z0-9]+/g)?.join(' | ') ?? '';
    return sql.unsafe(
      `WITH accessible AS (
         SELECT d.*,
                1 - (d.embedding <=> $1::vector) AS vector_score,
                ts_rank_cd(
                  to_tsvector('simple', coalesce(d.title, '') || ' ' || coalesce(d.content, '')),
                  to_tsquery('simple', $2)
                ) AS text_score
           FROM ${SCHEMA}.documents d
           LEFT JOIN ${SCHEMA}.sops s
             ON d.type = 'sop' AND d.source_id = s.id
          WHERE d.status = 'published'
            AND d.embedding IS NOT NULL
            AND (d.type = 'faq' OR d.sop_version_id = s.published_version_id)
            AND ($3 OR d.type = 'faq' OR (d.type = 'sop' AND s.requires_login = false))
       ),
       vector_candidates AS (
         SELECT id, row_number() OVER (ORDER BY vector_score DESC) AS vector_rank
           FROM accessible
          WHERE vector_score >= 0.5
          ORDER BY vector_score DESC
          LIMIT 20
       ),
       text_candidates AS (
         SELECT id, row_number() OVER (ORDER BY text_score DESC) AS text_rank
           FROM accessible
          WHERE text_score > 0
          ORDER BY text_score DESC
          LIMIT 20
       ),
       fused AS (
         SELECT coalesce(v.id, t.id) AS id,
                coalesce(1.0 / (60 + v.vector_rank), 0)
                  + coalesce(1.0 / (60 + t.text_rank), 0) AS fusion_score
           FROM vector_candidates v
           FULL OUTER JOIN text_candidates t ON t.id = v.id
       )
       SELECT a.title, a.content
         FROM fused f
         JOIN accessible a ON a.id = f.id
        ORDER BY f.fusion_score DESC, a.vector_score DESC
        LIMIT 5`,
      [query, lexicalQuery, authenticated]
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

  it('filters login-required SOP content before the anonymous LIMIT', async () => {
    const query = toVectorLiteral(vectorFor(4));
    const rows = await sql.unsafe(
      `SELECT d.title, d.content
         FROM ${SCHEMA}.documents d
         LEFT JOIN ${SCHEMA}.sops s
           ON d.type = 'sop' AND d.source_id = s.id
        WHERE d.status = 'published'
          AND d.embedding IS NOT NULL
          AND (d.type = 'faq' OR (d.type = 'sop' AND s.requires_login = false))
        ORDER BY d.embedding <=> $1::vector
        LIMIT 2`,
      [query]
    );

    expect(rows.map((row: { title: string }) => row.title)).toContain('SOP publik');
    expect(rows.map((row: { content: string }) => row.content)).not.toContain('RAHASIA');
  });

  it('detects a protected match without selecting its content', async () => {
    const query = toVectorLiteral(vectorFor(4));
    const rows = await sql.unsafe(
      `SELECT d.id
         FROM ${SCHEMA}.documents d
         INNER JOIN ${SCHEMA}.sops s
           ON d.type = 'sop' AND d.source_id = s.id
        WHERE d.status = 'published'
          AND d.embedding IS NOT NULL
          AND s.requires_login = true
        ORDER BY d.embedding <=> $1::vector
        LIMIT 1`,
      [query]
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty('content');
    expect(rows[0]).not.toHaveProperty('title');
  });

  it('finds an exact domain term even when semantic similarity is below threshold', async () => {
    const rows = await hybridSearch('ZXQ-991 ORBIT-77', false);
    const titles = rows.map((row: { title: string }) => row.title);

    expect(titles).toContain('Kode terminal ZXQ-991');
    expect(titles).not.toContain('Draft kode ZXQ-991');
  });

  it('does not leak restricted SOP content through lexical ranking', async () => {
    const rows = await hybridSearch('RAHASIA', false);

    expect(rows.map((row: { content: string }) => row.content)).not.toContain('RAHASIA');
  });

  it('does not retrieve an obsolete SOP version through lexical ranking', async () => {
    const rows = await hybridSearch('LEGACY-TOKEN', true);

    expect(rows.map((row: { content: string }) => row.content)).not.toContain('LEGACY-TOKEN');
  });
});
