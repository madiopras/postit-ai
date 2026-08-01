import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sopAttachments, sops, sopVersions } from '@/lib/schema';
import { isUuid } from '@/lib/api';
import { DASHBOARD_ROLES, requireRole } from '@/lib/auth';
import {
  ATTACHMENT_PARSER_VERSION,
  AttachmentExtractionError,
  extractAttachment,
} from '@/lib/attachment-extraction';
import { recordAuditEvent } from '@/lib/audit';

type RouteParams = Promise<{ id: string; versionId: string; attachmentId: string }>;

export async function GET(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const auth = await requireRole(req, DASHBOARD_ROLES);
  if (!auth.ok) return auth.response;

  const target = await resolveAttachment(params);
  if (!target) return notFound();

  return new NextResponse(new Uint8Array(target.attachment.data), {
    headers: {
      'Content-Type': target.attachment.mediaType,
      'Content-Length': String(target.attachment.size),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(target.attachment.filename)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const auth = await requireRole(req, DASHBOARD_ROLES);
  if (!auth.ok) return auth.response;

  const target = await resolveAttachment(params);
  if (!target) return notFound();
  if (target.version.publishedAt || target.sop.publishedVersionId === target.version.id) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PUBLISHED_VERSION_IMMUTABLE',
          message: 'Attachments cannot be removed from a published version',
        },
      },
      { status: 409 }
    );
  }

  await db.delete(sopAttachments).where(eq(sopAttachments.id, target.attachment.id));
  await recordAuditEvent({
    actor: auth.session,
    request: req,
    action: 'sop_attachment.delete',
    entityType: 'sop_attachment',
    entityId: target.attachment.id,
    metadata: {
      sopId: target.sop.id,
      versionId: target.version.id,
      filename: target.attachment.filename,
    },
  });
  return NextResponse.json({ success: true, message: 'Attachment deleted successfully' });
}

export async function POST(
  req: NextRequest,
  { params }: { params: RouteParams }
) {
  const auth = await requireRole(req, DASHBOARD_ROLES);
  if (!auth.ok) return auth.response;

  const target = await resolveAttachment(params);
  if (!target) return notFound();
  if (target.version.publishedAt || target.sop.publishedVersionId === target.version.id) {
    return immutableVersion();
  }

  await db
    .update(sopAttachments)
    .set({ extractionStatus: 'pending', extractionError: null })
    .where(eq(sopAttachments.id, target.attachment.id));

  try {
    const extraction = await extractAttachment(
      target.attachment.filename,
      new Uint8Array(target.attachment.data)
    );
    const [attachment] = await db
      .update(sopAttachments)
      .set({
        extractionStatus: 'ready',
        extractedText: extraction.text,
        extractionError: null,
        extractedAt: new Date(),
        parserVersion: ATTACHMENT_PARSER_VERSION,
        extractedCharacterCount: extraction.text.length,
        extractionMetadata: extraction.metadata,
      })
      .where(eq(sopAttachments.id, target.attachment.id))
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
        createdAt: sopAttachments.createdAt,
      });
    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: 'sop_attachment.reprocess',
      entityType: 'sop_attachment',
      entityId: target.attachment.id,
      metadata: {
        sopId: target.sop.id,
        versionId: target.version.id,
        filename: target.attachment.filename,
        extractionStatus: attachment.extractionStatus,
      },
    });
    return NextResponse.json({ success: true, data: attachment });
  } catch (error) {
    const safeMessage = error instanceof AttachmentExtractionError
      ? error.safeMessage
      : 'Attachment extraction failed';
    await db
      .update(sopAttachments)
      .set({
        extractionStatus: 'error',
        extractedText: null,
        extractionError: safeMessage,
        extractedAt: new Date(),
        parserVersion: ATTACHMENT_PARSER_VERSION,
        extractedCharacterCount: null,
        extractionMetadata: null,
      })
      .where(eq(sopAttachments.id, target.attachment.id));
    return NextResponse.json(
      {
        success: false,
        error: { code: 'EXTRACTION_ERROR', message: safeMessage },
      },
      { status: 422 }
    );
  }
}

async function resolveAttachment(params: RouteParams) {
  const { id, versionId, attachmentId } = await params;
  if (!isUuid(id) || !isUuid(versionId) || !isUuid(attachmentId)) return null;

  const [version, sop, attachment] = await Promise.all([
    db.query.sopVersions.findFirst({
      where: and(eq(sopVersions.id, versionId), eq(sopVersions.sopId, id)),
    }),
    db.query.sops.findFirst({ where: eq(sops.id, id) }),
    db.query.sopAttachments.findFirst({
      where: and(
        eq(sopAttachments.id, attachmentId),
        eq(sopAttachments.sopVersionId, versionId)
      ),
    }),
  ]);

  return version && sop && attachment ? { version, sop, attachment } : null;
}

function notFound() {
  return NextResponse.json(
    {
      success: false,
      error: { code: 'ATTACHMENT_NOT_FOUND', message: 'SOP attachment not found' },
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
        message: 'Published version attachments cannot be reprocessed',
      },
    },
    { status: 409 }
  );
}
