import { createHash } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sopAttachments, sops, sopVersions } from '@/lib/schema';
import { isUuid } from '@/lib/api';
import { DASHBOARD_ROLES, requireRole } from '@/lib/auth';
import {
  InvalidSopAttachmentError,
  MAX_SOP_ATTACHMENT_SIZE,
  validateSopAttachment,
  validateSopAttachmentSignature,
} from '@/lib/sop-attachments';
import {
  ATTACHMENT_PARSER_VERSION,
  AttachmentExtractionError,
  extractAttachment,
} from '@/lib/attachment-extraction';
import { recordAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireRole(req, DASHBOARD_ROLES);
  if (!auth.ok) return auth.response;

  const target = await resolveVersion(params);
  if (!target) return notFound();

  const attachments = await db
    .select({
      id: sopAttachments.id,
      filename: sopAttachments.filename,
      mediaType: sopAttachments.mediaType,
      size: sopAttachments.size,
      checksum: sopAttachments.checksum,
      extractionStatus: sopAttachments.extractionStatus,
      extractionError: sopAttachments.extractionError,
      extractedCharacterCount: sopAttachments.extractedCharacterCount,
      extractedAt: sopAttachments.extractedAt,
      uploadedBy: sopAttachments.uploadedBy,
      createdAt: sopAttachments.createdAt,
    })
    .from(sopAttachments)
    .where(eq(sopAttachments.sopVersionId, target.version.id))
    .orderBy(asc(sopAttachments.createdAt));

  return NextResponse.json({ success: true, data: attachments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireRole(req, DASHBOARD_ROLES);
  if (!auth.ok) return auth.response;

  const target = await resolveVersion(params);
  if (!target) return notFound();
  if (target.version.publishedAt || target.sop.publishedVersionId === target.version.id) {
    return immutableVersion();
  }

  try {
    const contentLength = Number(req.headers.get('content-length'));
    if (
      Number.isFinite(contentLength)
      && contentLength > MAX_SOP_ATTACHMENT_SIZE + 1024 * 1024
    ) {
      throw new InvalidSopAttachmentError('Attachment exceeds the 10 MB limit');
    }
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_REQUIRED', message: 'Attachment file is required' } },
        { status: 400 }
      );
    }

    const validated = validateSopAttachment(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    validateSopAttachmentSignature(validated.filename, bytes);
    const checksum = createHash('sha256').update(bytes).digest('hex');
    let extractionValues:
      | {
          extractionStatus: 'ready';
          extractedText: string;
          extractionError: null;
          extractedAt: Date;
          parserVersion: string;
          extractedCharacterCount: number;
          extractionMetadata: Awaited<ReturnType<typeof extractAttachment>>['metadata'];
        }
      | {
          extractionStatus: 'error';
          extractedText: null;
          extractionError: string;
          extractedAt: Date;
          parserVersion: string;
          extractedCharacterCount: null;
          extractionMetadata: null;
        };
    try {
      const extraction = await extractAttachment(validated.filename, bytes);
      extractionValues = {
        extractionStatus: 'ready',
        extractedText: extraction.text,
        extractionError: null,
        extractedAt: new Date(),
        parserVersion: ATTACHMENT_PARSER_VERSION,
        extractedCharacterCount: extraction.text.length,
        extractionMetadata: extraction.metadata,
      };
    } catch (error) {
      if (!(error instanceof AttachmentExtractionError)) throw error;
      extractionValues = {
        extractionStatus: 'error',
        extractedText: null,
        extractionError: error.safeMessage,
        extractedAt: new Date(),
        parserVersion: ATTACHMENT_PARSER_VERSION,
        extractedCharacterCount: null,
        extractionMetadata: null,
      };
    }

    const [attachment] = await db
      .insert(sopAttachments)
      .values({
        sopVersionId: target.version.id,
        filename: validated.filename,
        mediaType: validated.mediaType,
        size: bytes.byteLength,
        checksum,
        data: Buffer.from(bytes),
        ...extractionValues,
        uploadedBy: auth.session.userId,
      })
      .returning({
        id: sopAttachments.id,
        filename: sopAttachments.filename,
        mediaType: sopAttachments.mediaType,
        size: sopAttachments.size,
        checksum: sopAttachments.checksum,
        extractionStatus: sopAttachments.extractionStatus,
        extractionError: sopAttachments.extractionError,
        extractedCharacterCount: sopAttachments.extractedCharacterCount,
        extractedAt: sopAttachments.extractedAt,
        uploadedBy: sopAttachments.uploadedBy,
        createdAt: sopAttachments.createdAt,
      });

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'sop_attachment.upload',
      entityType: 'sop_attachment',
      entityId: attachment.id,
      metadata: {
        sopId: target.sop.id,
        versionId: target.version.id,
        filename: attachment.filename,
        mediaType: attachment.mediaType,
        size: attachment.size,
        extractionStatus: attachment.extractionStatus,
      },
    });
    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSopAttachmentError) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ATTACHMENT', message: error.message } },
        { status: 400 }
      );
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ATTACHMENT_EXISTS',
            message: 'An attachment with this filename already exists in the version',
          },
        },
        { status: 409 }
      );
    }
    console.error('[SOP Attachment API] Upload error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

async function resolveVersion(params: Promise<{ id: string; versionId: string }>) {
  const { id, versionId } = await params;
  if (!isUuid(id) || !isUuid(versionId)) return null;

  const [version, sop] = await Promise.all([
    db.query.sopVersions.findFirst({
      where: and(eq(sopVersions.id, versionId), eq(sopVersions.sopId, id)),
    }),
    db.query.sops.findFirst({ where: eq(sops.id, id) }),
  ]);
  return version && sop ? { version, sop } : null;
}

function notFound() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'SOP_VERSION_NOT_FOUND', message: 'SOP version not found' },
    },
    { status: 404 }
  );
}

function immutableVersion() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'PUBLISHED_VERSION_IMMUTABLE',
        message: 'Attachments can only be changed on an unpublished draft version',
      },
    },
    { status: 409 }
  );
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}
