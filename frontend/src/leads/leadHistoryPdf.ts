import type { Lead, LeadActivity } from './LeadService';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN_X = 48;
const PAGE_MARGIN_TOP = 54;
const PAGE_MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const HEADER_GAP = 28;
const ENTRY_GAP = 18;

type PdfFont = 'F1' | 'F2';
type PdfColor = readonly [number, number, number];

const TEXT_COLOR: PdfColor = [0.11, 0.15, 0.22];
const MUTED_TEXT_COLOR: PdfColor = [0.38, 0.45, 0.55];
const DIVIDER_COLOR: PdfColor = [0.86, 0.89, 0.93];

const replaceSmartCharacters = (value: string) =>
  value
    .replace(/\u00A0/g, ' ')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '*');

const sanitizePdfText = (value: string) =>
  replaceSmartCharacters(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

const escapePdfString = (value: string) =>
  sanitizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');

const estimateTextWidth = (text: string, fontSize: number) => text.length * fontSize * 0.52;

const splitLongWord = (word: string, fontSize: number, maxWidth: number) => {
  const maxCharacters = Math.max(1, Math.floor(maxWidth / (fontSize * 0.52)));
  const parts: string[] = [];

  for (let index = 0; index < word.length; index += maxCharacters) {
    parts.push(word.slice(index, index + maxCharacters));
  }

  return parts;
};

const wrapParagraph = (paragraph: string, fontSize: number, maxWidth: number) => {
  const words = paragraph.split(' ').filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      if (estimateTextWidth(word, fontSize) <= maxWidth) {
        currentLine = word;
      } else {
        const parts = splitLongWord(word, fontSize, maxWidth);
        lines.push(...parts.slice(0, -1));
        currentLine = parts.at(-1) ?? '';
      }
      continue;
    }

    const nextLine = `${currentLine} ${word}`;
    if (estimateTextWidth(nextLine, fontSize) <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);

    if (estimateTextWidth(word, fontSize) <= maxWidth) {
      currentLine = word;
      continue;
    }

    const parts = splitLongWord(word, fontSize, maxWidth);
    lines.push(...parts.slice(0, -1));
    currentLine = parts.at(-1) ?? '';
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const wrapText = (text: string, fontSize: number, maxWidth: number) => {
  const normalizedText = sanitizePdfText(text).replace(/\r\n/g, '\n').replace(/\t/g, ' ');
  const paragraphs = normalizedText.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.replace(/\s+/g, ' ').trim();

    if (!trimmedParagraph) {
      if (lines.at(-1) !== '') {
        lines.push('');
      }
      continue;
    }

    lines.push(...wrapParagraph(trimmedParagraph, fontSize, maxWidth));
  }

  return lines.length > 0 ? lines : [''];
};

const formatColor = (color: PdfColor) => color.map((value) => value.toFixed(3)).join(' ');

const createTextOperation = (
  text: string,
  x: number,
  y: number,
  fontSize: number,
  font: PdfFont,
  color: PdfColor = TEXT_COLOR
) => {
  const escapedText = escapePdfString(text);

  return [
    'BT',
    `/${font} ${fontSize} Tf`,
    `${formatColor(color)} rg`,
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
    `(${escapedText}) Tj`,
    'ET',
  ].join('\n');
};

const createLineOperation = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: PdfColor = DIVIDER_COLOR,
  width = 1
) =>
  [
    `${formatColor(color)} RG`,
    `${width.toFixed(2)} w`,
    `${x1.toFixed(2)} ${y1.toFixed(2)} m`,
    `${x2.toFixed(2)} ${y2.toFixed(2)} l`,
    'S',
  ].join('\n');

const toTitleCase = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

const getLeadClientName = (lead: Lead) =>
  lead.client_name ||
  lead.client_info?.client_name ||
  lead.company_name ||
  lead.client_info?.company_name ||
  'client';

const sanitizeFileName = (clientName: string) => {
  const normalizedName = sanitizePdfText(clientName)
    .replace(/[^A-Za-z0-9]/g, '')
    .trim();

  return `${normalizedName || 'client'}_interactions.pdf`;
};

const sortActivitiesChronologically = (activities: LeadActivity[]) =>
  [...activities].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );

const buildPageContents = (clientName: string, activities: LeadActivity[]) => {
  const pages: string[] = [];
  const generatedAt = formatDateTime(new Date().toISOString());
  let operations: string[] = [];
  let cursorY = 0;
  let pageNumber = 0;

  const startPage = () => {
    if (operations.length > 0) {
      pages.push(operations.join('\n'));
    }

    pageNumber += 1;
    operations = [];
    cursorY = PAGE_HEIGHT - PAGE_MARGIN_TOP;

    operations.push(createTextOperation('Interactions History', PAGE_MARGIN_X, cursorY, 18, 'F2'));
    cursorY -= 20;
    operations.push(createTextOperation(`Client: ${clientName}`, PAGE_MARGIN_X, cursorY, 11, 'F1'));

    const pageLabel = `Page ${pageNumber}`;
    const pageLabelX = PAGE_WIDTH - PAGE_MARGIN_X - estimateTextWidth(pageLabel, 10);
    operations.push(createTextOperation(pageLabel, pageLabelX, cursorY, 10, 'F1', MUTED_TEXT_COLOR));

    cursorY -= 14;
    operations.push(
      createTextOperation(`Generated: ${generatedAt}`, PAGE_MARGIN_X, cursorY, 10, 'F1', MUTED_TEXT_COLOR)
    );
    cursorY -= 14;
    operations.push(
      createTextOperation(
        'Entries are ordered chronologically from oldest to newest.',
        PAGE_MARGIN_X,
        cursorY,
        10,
        'F1',
        MUTED_TEXT_COLOR
      )
    );
    cursorY -= 12;
    operations.push(createLineOperation(PAGE_MARGIN_X, cursorY, PAGE_WIDTH - PAGE_MARGIN_X, cursorY));
    cursorY -= HEADER_GAP;
  };

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY - heightNeeded < PAGE_MARGIN_BOTTOM) {
      startPage();
    }
  };

  startPage();

  if (activities.length === 0) {
    operations.push(
      createTextOperation('No interaction records are available for this client.', PAGE_MARGIN_X, cursorY, 11, 'F1')
    );
    pages.push(operations.join('\n'));
    return pages;
  }

  for (const activity of activities) {
    const descriptionLines = wrapText(
      `Description: ${activity.description || 'No description provided.'}`,
      10,
      CONTENT_WIDTH
    );
    const metadataLines = [
      { text: `Date: ${formatDateTime(activity.created_at)}`, font: 'F2' as const, size: 11, color: TEXT_COLOR },
      { text: `Type: ${toTitleCase(activity.activity_type)}`, font: 'F1' as const, size: 10, color: MUTED_TEXT_COLOR },
      ...(activity.performed_by_name
        ? [{ text: `Recorded By: ${activity.performed_by_name}`, font: 'F1' as const, size: 10, color: MUTED_TEXT_COLOR }]
        : []),
    ];

    const heightNeeded =
      metadataLines.length * 15 + descriptionLines.length * 14 + ENTRY_GAP + 8;

    ensureSpace(heightNeeded);

    for (const line of metadataLines) {
      operations.push(createTextOperation(line.text, PAGE_MARGIN_X, cursorY, line.size, line.font, line.color));
      cursorY -= 15;
    }

    for (const descriptionLine of descriptionLines) {
      operations.push(createTextOperation(descriptionLine, PAGE_MARGIN_X, cursorY, 10, 'F1'));
      cursorY -= 14;
    }

    cursorY -= 4;
    operations.push(createLineOperation(PAGE_MARGIN_X, cursorY, PAGE_WIDTH - PAGE_MARGIN_X, cursorY));
    cursorY -= ENTRY_GAP;
  }

  pages.push(operations.join('\n'));
  return pages;
};

const getByteLength = (value: string) => new TextEncoder().encode(value).length;

const buildPdfDocument = (pageContents: string[]) => {
  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesId = addObject('');
  const pageIds: number[] = [];

  for (const pageContent of pageContents) {
    const contentStream = `<< /Length ${getByteLength(pageContent)} >>\nstream\n${pageContent}\nendstream`;
    const contentId = addObject(contentStream);
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(
        2
      )}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((pageId) => `${pageId} 0 R`).join(' ')}] /Count ${
    pageIds.length
  } >>`;

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n%CRM\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(getByteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = getByteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
};

export const downloadLeadInteractionHistoryPdf = (lead: Lead) => {
  const clientName = getLeadClientName(lead);
  const chronologicalActivities = sortActivitiesChronologically(lead.activities ?? []);
  const pageContents = buildPageContents(clientName, chronologicalActivities);
  const pdfDocument = buildPdfDocument(pageContents);
  const blob = new Blob([pdfDocument], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = downloadUrl;
  link.download = sanitizeFileName(clientName);
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};
