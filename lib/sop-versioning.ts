import { and, desc, eq, max, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents, sopAttachments, sops, sopVersions } from '@/lib/schema';
import { embedBatch } from '@/lib/embedding';
import { chunkText, processSopToChunks } from '@/lib/chunking';
import { ATTACHMENT_PARSER_VERSION } from '@/lib/attachment-extraction';
import { createHash } from 'node:crypto';

export class SopVersionNotFoundError extends Error {}

export async function getLatestSopVersion(sopId: string) {
  return db.query.sopVersions.findFirst({
    where: eq(sopVersions.sopId, sopId),
    orderBy: [desc(sopVersions.versionNumber)],
  });
}

/**
 * Append an immutable draft. The advisory lock makes MAX(version_number) + 1
 * safe when two editors save the same SOP concurrently.
 */
export async function createSopVersion(input: {
  sopId: string;
  title: string;
  content: string;
  createdBy: string;
  category?: string;
  requiresLogin?: boolean;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`sop-version:${input.sopId}`}))`);

    await tx
      .update(sops)
      .set({
        category: input.category,
        requiresLogin: input.requiresLogin,
        updatedAt: new Date(),
      })
      .where(eq(sops.id, input.sopId));

    const [counter] = await tx
      .select({ latest: max(sopVersions.versionNumber) })
      .from(sopVersions)
      .where(eq(sopVersions.sopId, input.sopId));

    const [version] = await tx
      .insert(sopVersions)
      .values({
        sopId: input.sopId,
        versionNumber: (counter?.latest ?? 0) + 1,
        title: input.title,
        content: input.content,
        indexingStatus: 'draft',
        createdBy: input.createdBy,
      })
      .returning();

    if (counter?.latest) {
      await tx.execute(sql`
        insert into sop_attachments (
          sop_version_id, filename, media_type, size, checksum, data,
          extraction_status, extracted_text, extraction_error, extracted_at,
          parser_version, extracted_character_count, extraction_metadata,
          uploaded_by, created_at
        )
        select
          ${version.id}, filename, media_type, size, checksum, data,
          extraction_status, extracted_text, extraction_error, extracted_at,
          parser_version, extracted_character_count, extraction_metadata,
          uploaded_by, created_at
        from sop_attachments
        where sop_version_id = (
          select id
          from sop_versions
          where sop_id = ${input.sopId}
            and version_number = ${counter.latest}
        )
      `);
    }

    return version;
  });
}

/**
 * Embed first, then atomically replace the active vector set and published
 * snapshot. A failed embedding request cannot disturb the previous publication.
 */
export async function publishSopVersion(
  sopId: string,
  versionId: string
): Promise<'published' | 'error'> {
  const version = await db.query.sopVersions.findFirst({
    where: and(eq(sopVersions.id, versionId), eq(sopVersions.sopId, sopId)),
  });
  if (!version) throw new SopVersionNotFoundError('SOP version not found');

  try {
    const attachments = await db
      .select()
      .from(sopAttachments)
      .where(eq(sopAttachments.sopVersionId, versionId));
    const invalidAttachment = attachments.find((attachment) =>
      attachment.extractionStatus !== 'ready'
      || !attachment.extractedText
      || !attachment.extractionMetadata?.sections.length
      || attachment.parserVersion !== ATTACHMENT_PARSER_VERSION
      || createHash('sha256').update(attachment.data).digest('hex') !== attachment.checksum
    );
    if (invalidAttachment) {
      throw new Error(
        `Attachment is not ready for indexing: ${invalidAttachment.filename}`
      );
    }

    const bodyChunks = processSopToChunks(version.title, version.content, sopId)
      .map((chunk) => ({
        title: chunk.title,
        content: chunk.content,
        metadata: { sourceKind: 'sop_body' },
        sopAttachmentId: null as string | null,
      }));
    const attachmentChunks = attachments.flatMap((attachment) => {
      const sectionMetadata = attachment.extractionMetadata?.sections ?? [];
      return sectionMetadata.flatMap((section) => {
        const sectionText = attachment.extractedText!.slice(section.start, section.end);
        return chunkText(sectionText).map((content, index, chunks) => ({
          title: `${version.title} · ${attachment.filename} · ${section.label} (Part ${index + 1}/${chunks.length})`,
          content,
          sopAttachmentId: attachment.id,
          metadata: {
            sourceKind: 'attachment',
            attachmentId: attachment.id,
            filename: attachment.filename,
            mediaType: attachment.mediaType,
            section: section.label,
            pageNumber: section.pageNumber,
            sheetName: section.sheetName,
            slideNumber: section.slideNumber,
          },
        }));
      });
    });
    const chunks = [...bodyChunks, ...attachmentChunks];
    const embeddings = chunks.length > 0
      ? await embedBatch(chunks.map((chunk) => chunk.content))
      : [];

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`sop-publish:${sopId}`}))`);

      // Re-check ownership after the network round-trip. The SOP or version may
      // have been deleted while embeddings were being generated.
      const [currentVersion] = await tx
        .select()
        .from(sopVersions)
        .where(and(eq(sopVersions.id, versionId), eq(sopVersions.sopId, sopId)))
        .limit(1);
      if (!currentVersion) throw new SopVersionNotFoundError('SOP version not found');

      await tx
        .delete(documents)
        .where(and(eq(documents.type, 'sop'), eq(documents.sourceId, sopId)));

      if (chunks.length > 0) {
        await tx.insert(documents).values(chunks.map((chunk, index) => ({
          type: 'sop' as const,
          title: chunk.title,
          content: chunk.content,
          chunkIndex: index,
          sourceId: sopId,
          sopVersionId: versionId,
          sopAttachmentId: chunk.sopAttachmentId,
          metadata: chunk.metadata,
          embedding: embeddings[index],
          status: 'published' as const,
        })));
      }

      const publishedAt = new Date();
      await tx
        .update(sops)
        .set({
          title: currentVersion.title,
          content: currentVersion.content,
          status: 'published',
          publishedVersionId: versionId,
          updatedAt: publishedAt,
        })
        .where(eq(sops.id, sopId));
      await tx
        .update(sopVersions)
        .set({ indexingStatus: 'ready', publishedAt })
        .where(eq(sopVersions.id, versionId));
    });

    return 'published';
  } catch (error) {
    if (error instanceof SopVersionNotFoundError) throw error;

    console.error('[SOP Versioning] Publish failed:', error);
    await db
      .update(sopVersions)
      .set({ indexingStatus: 'error' })
      .where(and(eq(sopVersions.id, versionId), eq(sopVersions.sopId, sopId)));

    // Only a never-published SOP becomes globally errored. Existing published
    // content and vectors remain the authoritative snapshot.
    await db
      .update(sops)
      .set({ status: 'error', updatedAt: new Date() })
      .where(and(eq(sops.id, sopId), sql`${sops.publishedVersionId} is null`));
    return 'error';
  }
}
