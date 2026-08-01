import { describe, expect, it } from 'vitest';
import {
  InvalidSopAttachmentError,
  validateSopAttachment,
  validateSopAttachmentSignature,
} from '@/lib/sop-attachments';

describe('SOP attachment validation', () => {
  it('accepts supported documents and derives a trusted media type from the extension', () => {
    const file = new File(
      [Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])],
      'manual.pdf',
      { type: 'text/html' }
    );

    expect(validateSopAttachment(file)).toEqual({
      filename: 'manual.pdf',
      mediaType: 'application/pdf',
    });
    expect(() =>
      validateSopAttachmentSignature(file.name, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    ).not.toThrow();
  });

  it('rejects executable and disguised file formats', () => {
    expect(() => validateSopAttachment(new File(['binary'], 'payload.exe'))).toThrow(
      InvalidSopAttachmentError
    );
    expect(() =>
      validateSopAttachmentSignature('disguised.pdf', new TextEncoder().encode('<html>'))
    ).toThrow('does not match the PDF format');
    expect(() => validateSopAttachment(new File(['legacy'], 'legacy.doc'))).toThrow(
      'Unsupported file type'
    );
  });

  it('normalizes path-like filenames and rejects binary text', () => {
    expect(validateSopAttachment(new File(['safe'], '../../manual.txt')).filename).toBe('manual.txt');
    expect(() =>
      validateSopAttachmentSignature('manual.txt', Uint8Array.from([0x61, 0x00, 0x62]))
    ).toThrow('cannot contain binary data');
  });

  it('rejects empty files and files above the size limit', () => {
    expect(() => validateSopAttachment(new File([], 'empty.txt'))).toThrow('cannot be empty');
    const oversized = {
      name: 'large.pdf',
      size: 10 * 1024 * 1024 + 1,
    } as File;
    expect(() => validateSopAttachment(oversized)).toThrow('10 MB');
  });
});
