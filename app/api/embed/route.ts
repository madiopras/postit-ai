import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import { eq, isNull } from 'drizzle-orm';
import { chunkText } from '@/lib/chunking';
import { embed } from '@/lib/nine';
import { sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

// TODO(phase-7): delete this route and lib/nine.ts. It embeds with hardcoded
// models, bypassing the dynamic config system in lib/config.ts, so it can write
// vectors of a different dimension than the rest of the pipeline.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await req.json();

  const where = id ? eq(documents.id, id) : isNull(documents.embedding);
  const rows = await db.query.documents.findMany({ where });

  let synced = 0;
  for (const row of rows) {
    const chunks = chunkText(row.content);
    for (const c of chunks) {
      const e = await embed(c);
      await db.execute(sql`
        UPDATE documents SET embedding = ${`[${e.join(',')}]`}::vector
        WHERE id = ${row.id}
      `);
      synced++;
    }
  }
  return Response.json({ synced });
}