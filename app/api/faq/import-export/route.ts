import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { faqs } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { syncFaqToFaq } from '@/lib/vector-sync';
import { requireAuth } from '@/lib/auth';

// CSV import schema
const csvImportSchema = z.object({
  data: z.array(
    z.object({
      question: z.string().min(1, 'Question is required').max(500),
      answer: z.string().min(1, 'Answer is required').max(5000),
      category: z.string().max(100).optional().default(''),
    })
  ),
});

/**
 * GET /api/faq/import-export
 * Export all FAQs as CSV
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const allFaqs = await db.query.faqs.findMany();

    if (allFaqs.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FAQS', message: 'No FAQs to export' } },
        { status: 400 }
      );
    }

    // Build CSV
    const headers = ['Question', 'Answer', 'Category', 'Status', 'Created At'];
    const rows = allFaqs.map((faq) => [
      `"${faq.question.replace(/"/g, '""')}"`,
      `"${faq.answer.replace(/"/g, '""')}"`,
      faq.category ? `"${faq.category.replace(/"/g, '""')}"` : '""',
      faq.status,
      faq.createdAt ? new Date(faq.createdAt).toISOString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="faqs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[FAQ Import-Export] GET error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faq/import-export
 * Import FAQs from CSV
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const validatedData = csvImportSchema.parse(body);

    const results = {
      total: validatedData.data.length,
      created: 0,
      failed: 0,
      errors: [] as Array<{ row: number; question: string; error: string }>,
    };

    // Insert FAQs with sync
    for (let i = 0; i < validatedData.data.length; i++) {
      const faqData = validatedData.data[i];

      try {
        await db.transaction(async (tx) => {
          // Insert FAQ
          const [faq] = await tx
            .insert(faqs)
            .values({
              question: faqData.question,
              answer: faqData.answer,
              category: faqData.category || null,
              status: 'published',
            })
            .returning();

          // Sync to vector store
          try {
            await syncFaqToFaq(faq.id, faq.question, faq.answer, faq.status!);
          } catch (syncError) {
            console.error('[FAQ Sync] Error syncing FAQ:', syncError);
            // Update FAQ status to error if sync fails
            await tx
              .update(faqs)
              .set({ status: 'error' })
              .where(eq(faqs.id, faq.id));
          }
        });

        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          question: faqData.question,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid CSV format',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error('[FAQ Import-Export] POST error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}