import path from 'node:path';
import mammoth from 'mammoth';
import { unzipSync } from 'fflate';

export const ATTACHMENT_PARSER_VERSION = '1';
export const MAX_EXTRACTED_CHARACTERS = 1_000_000;
const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_PDF_PAGES = 200;
const MAX_SHEETS = 50;
const MAX_SPREADSHEET_ROWS = 10_000;
const MAX_SPREADSHEET_CELLS = 100_000;
const MAX_SLIDES = 300;

export interface ExtractedSection {
  label: string;
  text: string;
  pageNumber?: number;
  sheetName?: string;
  slideNumber?: number;
}

export interface ExtractionResult {
  text: string;
  metadata: {
    sections: Array<{
      label: string;
      start: number;
      end: number;
      pageNumber?: number;
      sheetName?: string;
      slideNumber?: number;
    }>;
  };
}

export class AttachmentExtractionError extends Error {
  constructor(
    message: string,
    public readonly safeMessage: string = message
  ) {
    super(message);
  }
}

export async function extractAttachment(
  filename: string,
  data: Uint8Array
): Promise<ExtractionResult> {
  const extension = path.extname(filename).toLowerCase();
  let sections: ExtractedSection[];

  switch (extension) {
    case '.txt':
    case '.csv':
      sections = [{ label: filename, text: decodeUtf8(data) }];
      break;
    case '.pdf':
      sections = await extractPdf(data);
      break;
    case '.docx':
      preflightZip(data);
      sections = await extractDocx(data, filename);
      break;
    case '.xlsx':
      preflightZip(data);
      sections = extractXlsx(data);
      break;
    case '.pptx':
      preflightZip(data);
      sections = extractPptx(data);
      break;
    default:
      throw new AttachmentExtractionError('Unsupported attachment format');
  }

  return combineSections(sections);
}

async function extractPdf(data: Uint8Array): Promise<ExtractedSection[]> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: data.slice(),
      useWorkerFetch: false,
    });
    const document = await loadingTask.promise;

    if (document.numPages > MAX_PDF_PAGES) {
      throw new AttachmentExtractionError(`PDF exceeds the ${MAX_PDF_PAGES}-page limit`);
    }

    const sections: ExtractedSection[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str;
        text += item.hasEOL ? '\n' : ' ';
      }
      sections.push({
        label: `Page ${pageNumber}`,
        pageNumber,
        text,
      });
    }
    await loadingTask.destroy();
    return sections;
  } catch (error) {
    if (error instanceof AttachmentExtractionError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    if (/password/i.test(message)) {
      throw new AttachmentExtractionError(message, 'Password-protected PDFs are not supported');
    }
    throw new AttachmentExtractionError(message, 'Failed to extract text from PDF');
  }
}

async function extractDocx(data: Uint8Array, filename: string): Promise<ExtractedSection[]> {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(data) });
    return [{ label: filename, text: result.value }];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AttachmentExtractionError(message, 'Failed to extract text from DOCX');
  }
}

function extractXlsx(data: Uint8Array): ExtractedSection[] {
  try {
    const archive = unzipSync(data);
    const sharedStrings = parseSharedStrings(archive['xl/sharedStrings.xml']);
    const sheetDefinitions = parseSheetDefinitions(
      archive['xl/workbook.xml'],
      archive['xl/_rels/workbook.xml.rels']
    );
    if (sheetDefinitions.length > MAX_SHEETS) {
      throw new AttachmentExtractionError(`Workbook exceeds the ${MAX_SHEETS}-sheet limit`);
    }

    let rowCount = 0;
    let cellCount = 0;
    return sheetDefinitions.map((sheet) => {
      const bytes = archive[sheet.path];
      if (!bytes) {
        throw new AttachmentExtractionError(`Worksheet data is missing for ${sheet.name}`);
      }
      const xml = decodeUtf8(bytes);
      const rows: string[] = [];
      for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        rowCount++;
        if (rowCount > MAX_SPREADSHEET_ROWS) {
          throw new AttachmentExtractionError(
            `Workbook exceeds the ${MAX_SPREADSHEET_ROWS}-row limit`
          );
        }
        const cells: string[] = [];
        for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
          cellCount++;
          if (cellCount > MAX_SPREADSHEET_CELLS) {
            throw new AttachmentExtractionError(
              `Workbook exceeds the ${MAX_SPREADSHEET_CELLS}-cell limit`
            );
          }
          const reference = attribute(cellMatch[1], 'r') || `Cell ${cellCount}`;
          const type = attribute(cellMatch[1], 't');
          const body = cellMatch[2];
          const raw = firstTagText(body, type === 'inlineStr' ? 't' : 'v');
          if (raw === null) continue;
          const value = type === 's'
            ? sharedStrings[Number(raw)] ?? ''
            : decodeXml(raw);
          if (value.trim()) cells.push(`${reference}: ${value.trim()}`);
        }
        if (cells.length > 0) rows.push(cells.join(' | '));
      }
      return {
        label: `Sheet: ${sheet.name}`,
        sheetName: sheet.name,
        text: rows.join('\n'),
      };
    });
  } catch (error) {
    if (error instanceof AttachmentExtractionError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new AttachmentExtractionError(message, 'Failed to extract text from XLSX');
  }
}

function extractPptx(data: Uint8Array): ExtractedSection[] {
  try {
    const archive = unzipSync(data);
    const slides = Object.keys(archive)
      .map((name) => ({ name, match: /^ppt\/slides\/slide(\d+)\.xml$/.exec(name) }))
      .filter((entry): entry is { name: string; match: RegExpExecArray } => Boolean(entry.match))
      .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

    if (slides.length > MAX_SLIDES) {
      throw new AttachmentExtractionError(`Presentation exceeds the ${MAX_SLIDES}-slide limit`);
    }

    return slides.map((slide) => {
      const slideNumber = Number(slide.match[1]);
      const xml = decodeUtf8(archive[slide.name]);
      const text = [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)]
        .map((match) => decodeXml(match[1]).trim())
        .filter(Boolean)
        .join('\n');
      return {
        label: `Slide ${slideNumber}`,
        slideNumber,
        text,
      };
    });
  } catch (error) {
    if (error instanceof AttachmentExtractionError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new AttachmentExtractionError(message, 'Failed to extract text from PPTX');
  }
}

function combineSections(sections: ExtractedSection[]): ExtractionResult {
  const metadata: ExtractionResult['metadata'] = { sections: [] };
  let text = '';

  for (const section of sections) {
    const normalized = normalizeText(section.text);
    if (!normalized) continue;
    const block = `${section.label}\n${normalized}`;
    if (text.length > 0) text += '\n\n';
    const start = text.length;
    text += block;
    metadata.sections.push({
      label: section.label,
      start,
      end: text.length,
      pageNumber: section.pageNumber,
      sheetName: section.sheetName,
      slideNumber: section.slideNumber,
    });
    if (text.length > MAX_EXTRACTED_CHARACTERS) {
      throw new AttachmentExtractionError(
        `Extracted text exceeds the ${MAX_EXTRACTED_CHARACTERS}-character limit`
      );
    }
  }

  if (!text.trim()) {
    throw new AttachmentExtractionError(
      'No extractable text found',
      'No text layer or extractable text was found in this attachment'
    );
  }
  return { text, metadata };
}

function preflightZip(data: Uint8Array): void {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let eocd = -1;
  const minimum = Math.max(0, data.length - 65_557);
  for (let offset = data.length - 22; offset >= minimum; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new AttachmentExtractionError('Invalid Office ZIP archive');

  const entries = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (entries > MAX_ARCHIVE_ENTRIES) {
    throw new AttachmentExtractionError(`Archive exceeds the ${MAX_ARCHIVE_ENTRIES}-entry limit`);
  }

  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entries; index++) {
    if (offset + 46 > data.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw new AttachmentExtractionError('Invalid Office ZIP directory');
    }
    const flags = view.getUint16(offset + 8, true);
    if ((flags & 1) !== 0) {
      throw new AttachmentExtractionError('Encrypted Office documents are not supported');
    }
    totalUncompressed += view.getUint32(offset + 24, true);
    if (totalUncompressed > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
      throw new AttachmentExtractionError(
        'Office document exceeds the 50 MB decompression limit'
      );
    }
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    offset += 46 + nameLength + extraLength + commentLength;
  }
}

function parseSharedStrings(bytes?: Uint8Array): string[] {
  if (!bytes) return [];
  const xml = decodeUtf8(bytes);
  return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((match) =>
    [...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
      .map((text) => decodeXml(text[1]))
      .join('')
  );
}

function parseSheetDefinitions(
  workbookBytes?: Uint8Array,
  relationshipBytes?: Uint8Array
): Array<{ name: string; path: string }> {
  if (!workbookBytes || !relationshipBytes) {
    throw new AttachmentExtractionError('Workbook metadata is missing');
  }
  const relationships = new Map<string, string>();
  const relationshipXml = decodeUtf8(relationshipBytes);
  for (const match of relationshipXml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = attribute(match[1], 'Id');
    const target = attribute(match[1], 'Target');
    if (id && target && !target.includes('..')) {
      relationships.set(id, target.replace(/^\//, '').replace(/^xl\//, ''));
    }
  }

  const workbookXml = decodeUtf8(workbookBytes);
  const sheets: Array<{ name: string; path: string }> = [];
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = decodeXml(attribute(match[1], 'name') || `Sheet ${sheets.length + 1}`);
    const relationshipId = attribute(match[1], 'r:id');
    const target = relationshipId ? relationships.get(relationshipId) : undefined;
    if (target) sheets.push({ name, path: `xl/${target}`.replace(/\/+/g, '/') });
  }
  return sheets;
}

function firstTagText(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return match?.[1] ?? null;
}

function attribute(input: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|\\s)${escaped}=(?:"([^"]*)"|'([^']*)')`).exec(input);
  return match?.[1] ?? match?.[2] ?? null;
}

function decodeXml(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function decodeUtf8(data: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    throw new AttachmentExtractionError('Document text is not valid UTF-8');
  }
}

function normalizeText(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
