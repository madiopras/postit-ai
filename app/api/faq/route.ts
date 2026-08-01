import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { faqs } from '@/lib/schema';
import { eq, like, and, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { syncFaqRecord } from '@/lib/vector-sync';
import { DASHBOARD_ROLES, requireRole } from '@/lib/auth';
import { recordAuditEvent } from '@/lib/audit';

// Validation schema (the update schema lives in app/api/faq/[id]/route.ts)
const createFaqSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question too long'),
  answer: z.string().min(1, 'Answer is required').max(5000, 'Answer too long'),
  category: z.string().max(100).optional(),
});

/**
 * GET /api/faq
 * List FAQs with optional filtering and pagination
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(faqs.question, `%${search}%`),
          like(faqs.answer, `%${search}%`)
        )
      );
    }

    if (category) {
      conditions.push(eq(faqs.category, category));
    }

    if (status) {
      conditions.push(eq(faqs.status, status as 'draft' | 'published' | 'error'));
    }

    const whereCondition = conditions.length > 0 
      ? and(...conditions) 
      : undefined;

    const allFaqs = await db.query.faqs.findMany({
      where: whereCondition,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    const totalResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(faqs)
      .where(whereCondition || undefined);

    const totalCount = totalResult[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: allFaqs,
      meta: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('[FAQ API] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faq
 * Create new FAQ and sync to vector store
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, DASHBOARD_ROLES);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const validatedData = createFaqSchema.parse(body);

    // Insert first and commit, then embed. Embedding is a network call and must
    // not run inside a transaction — see syncFaqRecord in lib/vector-sync.ts.
    const [faq] = await db
      .insert(faqs)
      .values({ ...validatedData, status: 'draft' })
      .returning();

    const status = await syncFaqRecord(faq.id, faq.question, faq.answer);

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'faq.create',
      entityType: 'faq',
      entityId: faq.id,
      metadata: { status, category: faq.category },
    });
    return NextResponse.json({
      success: true,
      data: { ...faq, status },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.issues 
          } 
        },
        { status: 400 }
      );
    }

    console.error('[FAQ API] POST error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
