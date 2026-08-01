import path from 'node:path';

export const MAX_SOP_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const MEDIA_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
};

export class InvalidSopAttachmentError extends Error {}

export function validateSopAttachment(file: File): {
  filename: string;
  mediaType: string;
} {
  const filename = sanitizeFilename(file.name);
  const extension = path.extname(filename).toLowerCase();
  const mediaType = MEDIA_TYPES[extension];

  if (!mediaType) {
    throw new InvalidSopAttachmentError(
      'Unsupported file type. Use PDF, DOCX, XLSX, PPTX, TXT, or CSV'
    );
  }
  if (file.size === 0) throw new InvalidSopAttachmentError('Attachment cannot be empty');
  if (file.size > MAX_SOP_ATTACHMENT_SIZE) {
    throw new InvalidSopAttachmentError('Attachment exceeds the 10 MB limit');
  }

  return { filename, mediaType };
}

export function validateSopAttachmentSignature(
  filename: string,
  bytes: Uint8Array
): void {
  const extension = path.extname(filename).toLowerCase();
  const startsWith = (...signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);

  if (extension === '.pdf' && !startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) {
    throw new InvalidSopAttachmentError('File content does not match the PDF format');
  }
  if (['.docx', '.xlsx', '.pptx'].includes(extension)
    && !startsWith(0x50, 0x4b, 0x03, 0x04)) {
    throw new InvalidSopAttachmentError('File content does not match the Office document format');
  }
  if (['.docx', '.xlsx', '.pptx'].includes(extension)) {
    // ZIP entry names are present in the local/central directory even when the
    // entry contents are compressed, so subtype validation needs no parser.
    const archiveIndex = new TextDecoder('latin1').decode(bytes);
    const expectedDirectory = {
      '.docx': 'word/',
      '.xlsx': 'xl/',
      '.pptx': 'ppt/',
    }[extension]!;
    if (
      !archiveIndex.includes('[Content_Types].xml')
      || !archiveIndex.includes(expectedDirectory)
    ) {
      throw new InvalidSopAttachmentError('File content does not match its Office extension');
    }
  }
  if (['.txt', '.csv'].includes(extension)) {
    if (bytes.includes(0)) {
      throw new InvalidSopAttachmentError('Text attachments cannot contain binary data');
    }
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new InvalidSopAttachmentError('Text attachments must use UTF-8 encoding');
    }
  }
}

function sanitizeFilename(input: string): string {
  const filename = path.basename(input).normalize('NFC').trim();
  if (
    filename.length === 0
    || filename.length > 255
    || filename === '.'
    || filename === '..'
    || /[\u0000-\u001f\u007f]/.test(filename)
  ) {
    throw new InvalidSopAttachmentError('Invalid attachment filename');
  }
  return filename;
}
