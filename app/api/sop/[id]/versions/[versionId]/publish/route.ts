import { NextRequest, NextResponse } from 'next/server';
import { isUuid } from '@/lib/api';
import { DASHBOARD_ROLES, requireRole } from '@/lib/auth';
import { publishSopVersion, SopVersionNotFoundError } from '@/lib/sop-versioning';
import { recordAuditEvent } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireRole(req, DASHBOARD_ROLES);
  if (!auth.ok) return auth.response;

  const { id, versionId } = await params;
  if (!isUuid(id) || !isUuid(versionId)) return notFound();

  try {
    const status = await publishSopVersion(id, versionId);
    if (status === 'error') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PUBLISH_ERROR',
            message: 'Failed to publish SOP version — the previous published version is unchanged',
          },
        },
        { status: 502 }
      );
    }

    await recordAuditEvent({
      actor: auth.session,
      request: req,
      action: req.nextUrl.pathname.endsWith('/rollback')
        ? 'sop_version.rollback'
        : 'sop_version.publish',
      entityType: 'sop_version',
      entityId: versionId,
      metadata: { sopId: id, status },
    });
    return NextResponse.json({ success: true, data: { id, versionId, status } });
  } catch (error) {
    if (error instanceof SopVersionNotFoundError) return notFound();
    throw error;
  }
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
