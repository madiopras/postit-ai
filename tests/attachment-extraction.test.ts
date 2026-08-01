import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  AttachmentExtractionError,
  extractAttachment,
} from '@/lib/attachment-extraction';

describe('attachment text extraction', () => {
  it('extracts and normalizes UTF-8 text', async () => {
    const result = await extractAttachment(
      'procedure.txt',
      new TextEncoder().encode('First step\r\n\r\nSecond   step')
    );

    expect(result.text).toContain('First step\n\nSecond step');
    expect(result.metadata.sections).toMatchObject([
      { label: 'procedure.txt', start: 0 },
    ]);
  });

  it('extracts DOCX paragraph text', async () => {
    const result = await extractAttachment('procedure.docx', docxFixture());

    expect(result.text).toContain('Approve the request');
  });

  it('extracts XLSX values with sheet identity without evaluating formulas', async () => {
    const result = await extractAttachment('limits.xlsx', xlsxFixture());

    expect(result.text).toContain('Sheet: Approval Limits');
    expect(result.text).toContain('A1: Department');
    expect(result.text).toContain('B1: 5000');
    expect(result.metadata.sections[0]).toMatchObject({
      sheetName: 'Approval Limits',
    });
  });

  it('extracts PPTX text in slide order', async () => {
    const result = await extractAttachment('training.pptx', pptxFixture());

    expect(result.text.indexOf('Welcome')).toBeLessThan(result.text.indexOf('Final checklist'));
    expect(result.metadata.sections).toMatchObject([
      { slideNumber: 1 },
      { slideNumber: 2 },
    ]);
  });

  it('extracts a text-layer PDF by page', async () => {
    const result = await extractAttachment('policy.pdf', pdfFixture('Refund policy'));

    expect(result.text).toContain('Refund policy');
    expect(result.metadata.sections[0]).toMatchObject({ pageNumber: 1 });
  });

  it('rejects empty extracted text', async () => {
    await expect(
      extractAttachment('empty.txt', new TextEncoder().encode(' \n '))
    ).rejects.toBeInstanceOf(AttachmentExtractionError);
  });
});

function docxFixture(): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
    ),
    'word/document.xml': strToU8(
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Approve the request</w:t></w:r></w:p></w:body></w:document>'
    ),
  });
}

function xlsxFixture(): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'xl/workbook.xml': strToU8(
      '<workbook xmlns:r="relationships"><sheets><sheet name="Approval Limits" sheetId="1" r:id="rId1"/></sheets></workbook>'
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'
    ),
    'xl/sharedStrings.xml': strToU8(
      '<sst><si><t>Department</t></si></sst>'
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><f>2500*2</f><v>5000</v></c></row></sheetData></worksheet>'
    ),
  });
}

function pptxFixture(): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'ppt/slides/slide2.xml': strToU8('<p:sld><a:t>Final checklist</a:t></p:sld>'),
    'ppt/slides/slide1.xml': strToU8('<p:sld><a:t>Welcome</a:t></p:sld>'),
  });
}

function pdfFixture(text: string): Uint8Array {
  const escaped = text.replace(/[()\\]/g, '\\$&');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${escaped.length + 31} >>\nstream\nBT /F1 12 Tf 72 720 Td (${escaped}) Tj ET\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
