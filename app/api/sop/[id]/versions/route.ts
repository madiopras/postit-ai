import { desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sopVersions, sops } from '@/lib/schema';
import { isUuid } from '@/lib/api';
import { DASHBOARD_ROLES, requireRole } from '@/lib/auth';
import { createSopVersion, getLatestSopVersion } from '@/lib/sop-versioning';
import { recordAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, DASHBOARD_ROLES);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const sop = await db.query.sops.findFirst({ where: eq(sops.id, id) });
  if (!sop) return notFound();

  const versions = await db
    .select()
    .from(sopVersions)
    .where(eq(sopVersions.sopId, id))
    .orderBy(desc(sopVersions.versionNumber));

  return NextResponse.json({
    success: true,
    data: versions,
    publishedVersionId: sop.publishedVersionId,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(req, DASHBOARD_ROLES);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const [sop, latest] = await Promise.all([
    db.query.sops.findFirst({ where: eq(sops.id, id) }),
    getLatestSopVersion(id),
  ]);
  if (!sop || !latest) return notFound();
  if (!latest.publishedAt && latest.id !== sop.publishedVersionId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'DRAFT_EXISTS', message: 'The latest SOP version is already a draft' },
      },
      { status: 409 }
    );
  }

  const version = await createSopVersion({
    sopId: id,
    title: latest.title,
    content: latest.content,
    createdBy: auth.session.userId,
  });
  await recordAuditEvent({
    actor: auth.session,
    request: req,
    action: 'sop_version.create',
    entityType: 'sop_version',
    entityId: version.id,
    metadata: { sopId: id, versionNumber: version.versionNumber },
  });
  return NextResponse.json({ success: true, data: version }, { status: 201 });
}

function notFound() {
  return NextResponse.json(
    { success: false, error: { code: 'SOP_NOT_FOUND', message: 'SOP not found' } },
    { status: 404 }
  );
}
