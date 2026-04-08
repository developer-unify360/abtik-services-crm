import type { PayslipPreview } from './PayrollService';

const PDF_PAGE_WIDTH = 841.89;
const PDF_PAGE_HEIGHT = 595.28;
const CANVAS_SCALE = 2.5;
const CANVAS_WIDTH = Math.round(PDF_PAGE_WIDTH * CANVAS_SCALE);
const CANVAS_HEIGHT = Math.round(PDF_PAGE_HEIGHT * CANVAS_SCALE);

const getByteLength = (value: string) => new TextEncoder().encode(value).length;

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'NA';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'NA';
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(date)
    .replace(/\//g, '-');
};

const formatCurrency = (value?: string | null, currency = 'INR') => {
  const numericValue = Math.round(Number(value ?? 0));

  if (Number.isNaN(numericValue)) {
    return value ?? '0';
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(numericValue)
      .replace(/\u00A0/g, ' ');
  } catch {
    return numericValue.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
};

const sanitizeFileName = (preview: PayslipPreview) => {
  const rawName = `${preview.employee.full_name || 'employee'}_${preview.summary.month_label || 'payslip'}_payslip`;
  const cleanedName = rawName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return `${cleanedName || 'payslip'}.pdf`;
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(blob);
  });

const normalizeImageSource = async (source?: string | null) => {
  if (!source) {
    return null;
  }

  if (source.startsWith('data:') || source.startsWith('blob:')) {
    return source;
  }

  try {
    const response = await fetch(source, { credentials: 'include' });
    if (!response.ok) {
      return source;
    }

    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return source;
  }
};

const resolveLogoSource = async (preview: PayslipPreview, preferredLogoSource?: string | null) => {
  const sources = [
    preferredLogoSource,
    preview.company.company_logo_data_url,
    preview.company.company_logo_url,
  ];

  for (const source of sources) {
    const normalizedSource = await normalizeImageSource(source);
    if (normalizedSource) {
      return normalizedSource;
    }
  }

  return null;
};

const loadImageElement = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    if (!source.startsWith('data:') && !source.startsWith('blob:')) {
      image.crossOrigin = 'anonymous';
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load logo image.'));
    image.src = source;
  });

const setCanvasFont = (
  context: CanvasRenderingContext2D,
  fontSize: number,
  fontWeight = 400
) => {
  context.font = `${fontWeight} ${fontSize}px Arial, Helvetica, sans-serif`;
};

const trimTextToWidth = (
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number
) => {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  if (!normalizedValue) {
    return '';
  }

  if (context.measureText(normalizedValue).width <= maxWidth) {
    return normalizedValue;
  }

  let trimmedValue = normalizedValue;
  while (trimmedValue.length > 0) {
    const candidate = `${trimmedValue.trimEnd()}...`;
    if (context.measureText(candidate).width <= maxWidth) {
      return candidate;
    }

    trimmedValue = trimmedValue.slice(0, -1);
  }

  return '...';
};

const shrinkFontToFit = (
  context: CanvasRenderingContext2D,
  value: string,
  initialSize: number,
  maxWidth: number,
  minSize: number,
  fontWeight = 400
) => {
  let fontSize = initialSize;

  while (fontSize > minSize) {
    setCanvasFont(context, fontSize, fontWeight);
    if (context.measureText(value).width <= maxWidth) {
      return fontSize;
    }

    fontSize -= 0.5;
  }

  return minSize;
};

const wrapTextToWidth = (
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines: number
) => {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  if (!normalizedValue) {
    return [] as string[];
  }

  const words = normalizedValue.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return [] as string[];
  }

  const consumedValue = lines.join(' ');
  if (consumedValue.length < normalizedValue.length) {
    const lastLine = lines[lines.length - 1];
    lines[lines.length - 1] = trimTextToWidth(context, `${lastLine}...`, maxWidth);
  }

  return lines;
};

const drawText = (
  context: CanvasRenderingContext2D,
  {
    value,
    x,
    y,
    fontSize,
    fontWeight = 400,
    color = '#1f2937',
    align = 'left',
    maxWidth,
    minFontSize = 9,
    shrinkToFit = false,
  }: {
    value: string;
    x: number;
    y: number;
    fontSize: number;
    fontWeight?: number;
    color?: string;
    align?: CanvasTextAlign;
    maxWidth?: number;
    minFontSize?: number;
    shrinkToFit?: boolean;
  }
) => {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  if (!normalizedValue) {
    return;
  }

  context.save();
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'middle';

  let resolvedFontSize = fontSize;
  if (maxWidth && shrinkToFit) {
    resolvedFontSize = shrinkFontToFit(
      context,
      normalizedValue,
      fontSize,
      maxWidth,
      minFontSize,
      fontWeight
    );
  }

  setCanvasFont(context, resolvedFontSize, fontWeight);

  const displayValue = maxWidth
    ? trimTextToWidth(context, normalizedValue, maxWidth)
    : normalizedValue;

  context.fillText(displayValue, x, y);
  context.restore();
};

const drawRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  strokeStyle = '#d0d0d0',
  lineWidth = 1
) => {
  context.save();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.strokeRect(x, y, width, height);
  context.restore();
};

const drawLine = (
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  strokeStyle = '#d0d0d0',
  lineWidth = 1
) => {
  context.save();
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.restore();
};

const drawLogo = (
  context: CanvasRenderingContext2D,
  logoImage: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const imageRatio = logoImage.width / logoImage.height;
  const boxRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > boxRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }

  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;

  context.drawImage(logoImage, offsetX, offsetY, drawWidth, drawHeight);
};

const renderPayslipArtwork = async (
  preview: PayslipPreview,
  preferredLogoSource?: string | null
) => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to prepare payslip canvas.');
  }

  const logoSource = await resolveLogoSource(preview, preferredLogoSource);
  let logoImage: HTMLImageElement | null = null;

  if (logoSource) {
    try {
      logoImage = await loadImageElement(logoSource);
    } catch {
      logoImage = null;
    }
  }

  context.scale(CANVAS_SCALE, CANVAS_SCALE);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT);

  const pageX = 12;
  const pageY = 12;
  const pageWidth = PDF_PAGE_WIDTH - pageX * 2;
  const pageHeight = PDF_PAGE_HEIGHT - pageY * 2;
  const leftMargin = 28;
  const rightMargin = PDF_PAGE_WIDTH - 28;
  const contentWidth = rightMargin - leftMargin;
  const headerRuleY = 110;
  const titleY = 132;

  drawRect(context, pageX, pageY, pageWidth, pageHeight, '#d9d9d9', 1);

  drawText(context, {
    value: (preview.company.company_name || 'Company Name').toUpperCase(),
    x: leftMargin,
    y: 50,
    fontSize: 18,
    fontWeight: 700,
    color: '#204b77',
    maxWidth: 600,
    minFontSize: 13,
    shrinkToFit: true,
  });

  setCanvasFont(context, 11, 400);
  const addressLines = wrapTextToWidth(
    context,
    preview.company.company_address || '',
    390,
    3
  );

  addressLines.forEach((line, index) => {
    drawText(context, {
      value: line,
      x: leftMargin,
      y: 68 + index * 14,
      fontSize: 11,
      color: '#374151',
      maxWidth: 390,
    });
  });

  if (logoImage) {
    drawLogo(context, logoImage, rightMargin - 72, 28, 80, 80);
  }

  drawLine(context, leftMargin, headerRuleY, rightMargin, headerRuleY, '#334155', 1.8);
  drawText(context, {
    value: `Pay slip for the Month of ${preview.summary.month_label}`,
    x: PDF_PAGE_WIDTH / 2,
    y: titleY,
    fontSize: 13.5,
    fontWeight: 700,
    align: 'center',
    maxWidth: 360,
  });

  const infoTableX = leftMargin;
  const infoTableY = 145;
  const infoColumnWidths = [182, 324, 165, 103];
  const infoRowHeight = 24;
  const infoTableWidth = infoColumnWidths.reduce((sum, width) => sum + width, 0);
  const infoTableHeight = infoRowHeight * 6;

  const infoRows: [string, string, string, string][] = [
    ['Employee Name', preview.employee.full_name || 'NA', 'Company', preview.company.company_name || 'NA'],
    ['Bank Account', preview.employee.bank_account_number || 'NA', 'Bank Name', preview.employee.bank_name || 'NA'],
    ['Date of Joining', formatDate(preview.employee.date_of_joining), 'ESIC No', 'NA'],
    ['Designation', preview.employee.designation || 'NA', 'Department', preview.employee.department || 'NA'],
    ['CTC', formatCurrency(preview.summary.monthly_ctc, preview.company.currency), 'Working Days', preview.summary.total_days || '0'],
    ['Paid Days', preview.summary.paid_days || '0', 'LWOP Days', preview.summary.leave_without_pay_days || '0'],
  ];

  drawRect(context, infoTableX, infoTableY, infoTableWidth, infoTableHeight);

  let infoRunningX = infoTableX;
  infoColumnWidths.slice(0, -1).forEach((width) => {
    infoRunningX += width;
    drawLine(context, infoRunningX, infoTableY, infoRunningX, infoTableY + infoTableHeight);
  });

  for (let rowIndex = 1; rowIndex < infoRows.length; rowIndex += 1) {
    drawLine(
      context,
      infoTableX,
      infoTableY + rowIndex * infoRowHeight,
      infoTableX + infoTableWidth,
      infoTableY + rowIndex * infoRowHeight
    );
  }

  infoRows.forEach((row, rowIndex) => {
    const cellCenterY = infoTableY + rowIndex * infoRowHeight + infoRowHeight / 2;
    const rowValues = [
      { value: row[0], x: infoTableX + 8, width: infoColumnWidths[0] - 16, weight: 700, color: '#4b5563' },
      { value: row[1], x: infoTableX + infoColumnWidths[0] + 8, width: infoColumnWidths[1] - 16, weight: 400, color: '#1f2937' },
      { value: row[2], x: infoTableX + infoColumnWidths[0] + infoColumnWidths[1] + 8, width: infoColumnWidths[2] - 16, weight: 700, color: '#4b5563' },
      { value: row[3], x: infoTableX + infoColumnWidths[0] + infoColumnWidths[1] + infoColumnWidths[2] + 8, width: infoColumnWidths[3] - 16, weight: 400, color: '#1f2937' },
    ];

    rowValues.forEach((cell) => {
      drawText(context, {
        value: cell.value,
        x: cell.x,
        y: cellCenterY,
        fontSize: 10.4,
        fontWeight: cell.weight,
        color: cell.color,
        maxWidth: cell.width,
        minFontSize: 9,
        shrinkToFit: true,
      });
    });
  });

  const earnings = preview.earnings.map((item) => ({
    name: item.name || '',
    amount: formatCurrency(item.actual_amount, preview.company.currency),
  }));
  const deductions = preview.deductions.map((item) => ({
    name: item.name || '',
    amount: formatCurrency(item.actual_amount, preview.company.currency),
  }));

  const visibleRowCount = Math.max(5, earnings.length, deductions.length);
  const bodyRows = Array.from({ length: visibleRowCount }, (_, index) => ({
    earningName: earnings[index]?.name || '',
    earningAmount: earnings[index]?.amount || '',
    deductionName: deductions[index]?.name || '',
    deductionAmount: deductions[index]?.amount || '',
  }));

  const payrollTableX = leftMargin;
  const payrollTableY = infoTableY + infoTableHeight + 10;
  const payrollColumnWidths = [255, 140, 255, 124];
  const payrollRowHeight = 24;
  const payrollTableWidth = payrollColumnWidths.reduce((sum, width) => sum + width, 0);
  const payrollTableHeight = payrollRowHeight * (bodyRows.length + 3);

  drawRect(context, payrollTableX, payrollTableY, payrollTableWidth, payrollTableHeight);

  let payrollRunningX = payrollTableX;
  payrollColumnWidths.slice(0, -1).forEach((width) => {
    payrollRunningX += width;
    drawLine(
      context,
      payrollRunningX,
      payrollTableY,
      payrollRunningX,
      payrollTableY + payrollTableHeight
    );
  });

  for (let rowIndex = 1; rowIndex < bodyRows.length + 3; rowIndex += 1) {
    drawLine(
      context,
      payrollTableX,
      payrollTableY + rowIndex * payrollRowHeight,
      payrollTableX + payrollTableWidth,
      payrollTableY + rowIndex * payrollRowHeight
    );
  }

  const headerCenterY = payrollTableY + payrollRowHeight / 2;
  drawText(context, {
    value: 'Earnings',
    x: payrollTableX + payrollColumnWidths[0] / 2,
    y: headerCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    color: '#a1a1aa',
    align: 'center',
    maxWidth: payrollColumnWidths[0] - 14,
  });
  drawText(context, {
    value: 'Amount',
    x: payrollTableX + payrollColumnWidths[0] + payrollColumnWidths[1] / 2,
    y: headerCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    color: '#a1a1aa',
    align: 'center',
    maxWidth: payrollColumnWidths[1] - 14,
  });
  drawText(context, {
    value: 'Deductions',
    x: payrollTableX + payrollColumnWidths[0] + payrollColumnWidths[1] + payrollColumnWidths[2] / 2,
    y: headerCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    color: '#a1a1aa',
    align: 'center',
    maxWidth: payrollColumnWidths[2] - 14,
  });
  drawText(context, {
    value: 'Amount',
    x: payrollTableX + payrollColumnWidths[0] + payrollColumnWidths[1] + payrollColumnWidths[2] + payrollColumnWidths[3] / 2,
    y: headerCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    color: '#a1a1aa',
    align: 'center',
    maxWidth: payrollColumnWidths[3] - 14,
  });

  bodyRows.forEach((row, rowIndex) => {
    const cellCenterY = payrollTableY + (rowIndex + 1) * payrollRowHeight + payrollRowHeight / 2;

    drawText(context, {
      value: row.earningName,
      x: payrollTableX + 8,
      y: cellCenterY,
      fontSize: 10.5,
      maxWidth: payrollColumnWidths[0] - 16,
    });
    drawText(context, {
      value: row.earningAmount,
      x: payrollTableX + payrollColumnWidths[0] + payrollColumnWidths[1] - 8,
      y: cellCenterY,
      fontSize: 10.5,
      align: 'right',
      maxWidth: payrollColumnWidths[1] - 16,
    });
    drawText(context, {
      value: row.deductionName,
      x: payrollTableX + payrollColumnWidths[0] + payrollColumnWidths[1] + 8,
      y: cellCenterY,
      fontSize: 10.5,
      maxWidth: payrollColumnWidths[2] - 16,
    });
    drawText(context, {
      value: row.deductionAmount,
      x: payrollTableX + payrollTableWidth - 8,
      y: cellCenterY,
      fontSize: 10.5,
      align: 'right',
      maxWidth: payrollColumnWidths[3] - 16,
    });
  });

  const totalsCenterY = payrollTableY + (bodyRows.length + 1) * payrollRowHeight + payrollRowHeight / 2;
  drawText(context, {
    value: 'Total Earnings',
    x: payrollTableX + 8,
    y: totalsCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    maxWidth: payrollColumnWidths[0] - 16,
  });
  drawText(context, {
    value: formatCurrency(preview.summary.earnings_total, preview.company.currency),
    x: payrollTableX + payrollColumnWidths[0] + payrollColumnWidths[1] - 8,
    y: totalsCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    align: 'right',
    maxWidth: payrollColumnWidths[1] - 16,
  });
  drawText(context, {
    value: 'Total Deductions',
    x: payrollTableX + payrollColumnWidths[0] + payrollColumnWidths[1] + 8,
    y: totalsCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    maxWidth: payrollColumnWidths[2] - 16,
  });
  drawText(context, {
    value: formatCurrency(preview.summary.deductions_total, preview.company.currency),
    x: payrollTableX + payrollTableWidth - 8,
    y: totalsCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    align: 'right',
    maxWidth: payrollColumnWidths[3] - 16,
  });

  const netPayCenterY = payrollTableY + (bodyRows.length + 2) * payrollRowHeight + payrollRowHeight / 2;
  drawText(context, {
    value: 'Net Pay (Total Earnings - Total Deductions)',
    x: payrollTableX + 8,
    y: netPayCenterY,
    fontSize: 10.8,
    fontWeight: 700,
    color: '#9ca3af',
    maxWidth: payrollColumnWidths[0] + payrollColumnWidths[1] + payrollColumnWidths[2] - 20,
  });
  drawText(context, {
    value: formatCurrency(preview.summary.net_pay, preview.company.currency),
    x: payrollTableX + payrollTableWidth - 8,
    y: netPayCenterY,
    fontSize: 11.5,
    fontWeight: 700,
    color: '#9ca3af',
    align: 'right',
    maxWidth: payrollColumnWidths[3] - 16,
  });

  drawText(context, {
    value: 'This is a system generated payslip and does not require signature.',
    x: PDF_PAGE_WIDTH / 2,
    y: payrollTableY + payrollTableHeight + 28,
    fontSize: 10.2,
    color: '#4b5563',
    align: 'center',
    maxWidth: contentWidth - 80,
  });

  return canvas.toDataURL('image/jpeg', 0.96);
};

const dataUrlToHex = (dataUrl: string) => {
  const [, base64Data = ''] = dataUrl.split(',');
  const binaryValue = window.atob(base64Data);
  let hexValue = '';

  for (let index = 0; index < binaryValue.length; index += 1) {
    hexValue += binaryValue.charCodeAt(index).toString(16).padStart(2, '0');
  }

  return `${hexValue}>`;
};

const buildPdfDocument = (jpegDataUrl: string) => {
  const jpegHex = dataUrlToHex(jpegDataUrl);
  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const imageId = addObject(
    `<< /Type /XObject /Subtype /Image /Width ${CANVAS_WIDTH} /Height ${CANVAS_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${getByteLength(
      jpegHex
    )} >>\nstream\n${jpegHex}\nendstream`
  );
  const pagesId = addObject('');
  const contentStream = `q\n${PDF_PAGE_WIDTH.toFixed(2)} 0 0 ${PDF_PAGE_HEIGHT.toFixed(2)} 0 0 cm\n/Im1 Do\nQ`;
  const contentId = addObject(`<< /Length ${getByteLength(contentStream)} >>\nstream\n${contentStream}\nendstream`);
  const pageId = addObject(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH.toFixed(2)} ${PDF_PAGE_HEIGHT.toFixed(
      2
    )}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
  );

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n%ERP\n';
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

export const downloadPayslipPdf = async (
  preview: PayslipPreview,
  preferredLogoSource?: string | null
) => {
  const jpegDataUrl = await renderPayslipArtwork(preview, preferredLogoSource);
  const pdfDocument = buildPdfDocument(jpegDataUrl);
  const blob = new Blob([pdfDocument], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = downloadUrl;
  link.download = sanitizeFileName(preview);
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};
