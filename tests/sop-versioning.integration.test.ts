import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';

const mocks = vi.hoisted(() => ({
  embedBatch: vi.fn(),
}));

vi.mock('@/lib/embedding', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/embedding')>();
  return { ...original, embedBatch: mocks.embedBatch };
});

import { db } from '@/lib/db';
import { documents, sopAttachments, sops, sopVersions, users } from '@/lib/schema';
import { createSopVersion, publishSopVersion } from '@/lib/sop-versioning';
import { ATTACHMENT_PARSER_VERSION } from '@/lib/attachment-extraction';
import { createHash } from 'node:crypto';

const enabled = Boolean(process.env.DATABASE_URL);
const username = `sop-version-test-${crypto.randomUUID()}`;
let userId = '';
let sopId = '';
let firstVersionId = '';

describe.skipIf(!enabled)('SOP immutable publication boundary (database)', () => {
  beforeAll(async () => {
    const [user] = await db.insert(users).values({
      username,
      password: 'test-only-not-a-real-login',
      role: 'admin',
    }).returning();
    userId = user.id;

    const [sop] = await db.insert(sops).values({
      title: 'Published title',
      content: 'Published content',
      status: 'draft',
    }).returning();
    sopId = sop.id;

    const [version] = await db.insert(sopVersions).values({
      sopId,
      versionNumber: 1,
      title: sop.title,
      content: sop.content,
      createdBy: userId,
    }).returning();
    firstVersionId = version.id;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.embedBatch.mockImplementation(async (contents: string[]) =>
      contents.map(() => Array(1536).fill(0.01))
    );
  });

  afterAll(async () => {
    if (sopId) await db.delete(sops).where(eq(sops.id, sopId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });

  it('keeps the active publication unchanged when a draft is saved or embedding fails', async () => {
    expect(await publishSopVersion(sopId, firstVersionId)).toBe('published');
    await db.insert(sopAttachments).values({
      sopVersionId: firstVersionId,
      filename: 'procedure.pdf',
      mediaType: 'application/pdf',
      size: 5,
      checksum: createHash('sha256').update('%PDF').digest('hex'),
      data: Buffer.from('%PDF'),
      extractionStatus: 'ready',
      extractedText: 'Page 1\nAttachment content',
      extractedAt: new Date(),
      parserVersion: ATTACHMENT_PARSER_VERSION,
      extractedCharacterCount: 25,
      extractionMetadata: {
        sections: [{ label: 'Page 1', start: 0, end: 25, pageNumber: 1 }],
      },
      uploadedBy: userId,
    });

    const draft = await createSopVersion({
      sopId,
      title: 'Draft title',
      content: 'Draft content',
      createdBy: userId,
    });
    const copiedAttachments = await db
      .select()
      .from(sopAttachments)
      .where(eq(sopAttachments.sopVersionId, draft.id));
    expect(copiedAttachments).toHaveLength(1);
    expect(copiedAttachments[0]).toMatchObject({
      filename: 'procedure.pdf',
      checksum: createHash('sha256').update('%PDF').digest('hex'),
    });

    let aggregate = await db.query.sops.findFirst({ where: eq(sops.id, sopId) });
    expect(aggregate).toMatchObject({
      title: 'Published title',
      content: 'Published content',
      publishedVersionId: firstVersionId,
    });

    mocks.embedBatch.mockRejectedValueOnce(new Error('embedding unavailable'));
    vi.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    expect(await publishSopVersion(sopId, draft.id)).toBe('error');

    aggregate = await db.query.sops.findFirst({ where: eq(sops.id, sopId) });
    expect(aggregate?.publishedVersionId).toBe(firstVersionId);
    const activeDocuments = await db
      .select()
      .from(documents)
      .where(and(eq(documents.type, 'sop'), eq(documents.sourceId, sopId)));
    expect(activeDocuments.length).toBeGreaterThan(0);
    expect(activeDocuments.every((document) => document.sopVersionId === firstVersionId)).toBe(true);
  });

  it('can publish a draft and later roll back through the same atomic path', async () => {
    const draft = await db.query.sopVersions.findFirst({
      where: and(eq(sopVersions.sopId, sopId), eq(sopVersions.versionNumber, 2)),
    });
    expect(draft).toBeDefined();

    expect(await publishSopVersion(sopId, draft!.id)).toBe('published');
    const [copiedAttachment] = await db
      .select()
      .from(sopAttachments)
      .where(eq(sopAttachments.sopVersionId, draft!.id));
    const attachmentDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.sopAttachmentId, copiedAttachment.id));
    expect(attachmentDocuments.length).toBeGreaterThan(0);
    expect(attachmentDocuments[0]?.metadata).toMatchObject({
      sourceKind: 'attachment',
      filename: 'procedure.pdf',
      pageNumber: 1,
    });
    expect(await publishSopVersion(sopId, firstVersionId)).toBe('published');

    const aggregate = await db.query.sops.findFirst({ where: eq(sops.id, sopId) });
    expect(aggregate).toMatchObject({
      title: 'Published title',
      content: 'Published content',
      publishedVersionId: firstVersionId,
    });

    const versions = await db
      .select()
      .from(sopVersions)
      .where(eq(sopVersions.sopId, sopId));
    expect(versions).toHaveLength(2);
  });

  it('does not replace the active knowledge base when attachment extraction is not ready', async () => {
    const draft = await createSopVersion({
      sopId,
      title: 'Version with broken attachment',
      content: 'This version must not become active',
      createdBy: userId,
    });
    const [attachment] = await db
      .select()
      .from(sopAttachments)
      .where(eq(sopAttachments.sopVersionId, draft.id));
    await db
      .update(sopAttachments)
      .set({
        extractionStatus: 'error',
        extractedText: null,
        extractionError: 'No extractable text found',
      })
      .where(eq(sopAttachments.id, attachment.id));

    vi.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    expect(await publishSopVersion(sopId, draft.id)).toBe('error');

    const aggregate = await db.query.sops.findFirst({ where: eq(sops.id, sopId) });
    expect(aggregate?.publishedVersionId).toBe(firstVersionId);
    const activeDocuments = await db
      .select()
      .from(documents)
      .where(and(eq(documents.type, 'sop'), eq(documents.sourceId, sopId)));
    expect(activeDocuments.every((document) => document.sopVersionId === firstVersionId)).toBe(true);
  });
});
