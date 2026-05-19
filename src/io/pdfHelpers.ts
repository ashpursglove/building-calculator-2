/**
 * Shared PDF layout + ASCII-safe text for jsPDF (Helvetica is Latin-1 only).
 */

import type { jsPDF } from "jspdf";

/** Planner theme — dark header band + teal accents on light paper. */
export const PDF_THEME = {
  teal: [13, 148, 136] as [number, number, number],
  tealBright: [45, 212, 191] as [number, number, number],
  headerBg: [12, 18, 16] as [number, number, number],
  body: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [203, 213, 225] as [number, number, number],
  tableBg: [248, 250, 252] as [number, number, number],
  tableStripe: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/** Strip/replace Unicode glyphs that render as garbage in standard PDF fonts. */
export function pdfSafe(raw: string): string {
  return raw
    .replace(/\u2192/g, " to ")
    .replace(/\u2190/g, "<-")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u00b7/g, ", ")
    .replace(/\u00d7/g, " x ")
    .replace(/\u00b2/g, "2")
    .replace(/\u00b3/g, "3")
    .replace(/\u21b3/g, "")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/[^\t\n\r\x20-\x7e]/g, "");
}

export function fmtMoneyPdf(n: number): string {
  return pdfSafe(
    `$${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
  );
}

export function fmtInternalAmount(rawUsd: number, quoteUsd: number): string {
  return `${fmtMoneyPdf(rawUsd)} to ${fmtMoneyPdf(quoteUsd)}`;
}

export interface SummaryRow {
  label: string;
  rawUsd: number;
  quoteUsd: number;
}

/** Executive / quotation summary table with fixed columns (no overlap). */
export function drawSummaryTable(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    marginRight: number;
    pageW: number;
    client: boolean;
    rows: SummaryRow[];
    totalRawUsd?: number;
    totalQuoteUsd: number;
  },
): number {
  const {
    x,
    y: startY,
    width: w,
    marginRight,
    pageW,
    client,
    rows,
    totalQuoteUsd,
  } = opts;
  const pad = 2;
  const labelW = client ? w * 0.58 : w * 0.44;
  const quoteX = pageW - marginRight - pad;
  const rawX = client ? quoteX : x + w * 0.62;
  const rowH = 6.2;
  const headerH = 7.5;

  let ty = startY;
  const tableH = headerH + rows.length * rowH + (client ? 10 : 30);

  doc.setFillColor(...PDF_THEME.tableBg);
  doc.rect(x, ty, w, tableH, "F");
  doc.setDrawColor(...PDF_THEME.border);
  doc.setLineWidth(0.2);
  doc.rect(x, ty, w, tableH, "S");

  doc.setFillColor(...PDF_THEME.teal);
  doc.rect(x, ty, w, headerH, "F");
  doc.setTextColor(...PDF_THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(pdfSafe("Scope"), x + pad, ty + 5);
  if (client) {
    doc.text(pdfSafe("Client quote (USD)"), quoteX, ty + 5, { align: "right" });
  } else {
    doc.text(pdfSafe("GDT internal (raw)"), rawX, ty + 5, { align: "right" });
    doc.text(pdfSafe("Client quote"), quoteX, ty + 5, { align: "right" });
  }
  ty += headerH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (i % 2 === 1) {
      doc.setFillColor(...PDF_THEME.tableStripe);
      doc.rect(x, ty - 1, w, rowH, "F");
    }
    doc.setTextColor(...PDF_THEME.body);
    const label = pdfSafe(`${i + 1}. ${row.label}`);
    doc.text(label, x + pad, ty + 4, { maxWidth: labelW });

    if (client) {
      doc.text(fmtMoneyPdf(row.quoteUsd), quoteX, ty + 4, { align: "right" });
    } else {
      doc.setTextColor(...PDF_THEME.muted);
      doc.text(fmtMoneyPdf(row.rawUsd), rawX, ty + 4, { align: "right" });
      doc.setTextColor(...PDF_THEME.teal);
      doc.text(fmtMoneyPdf(row.quoteUsd), quoteX, ty + 4, { align: "right" });
      doc.setTextColor(...PDF_THEME.body);
    }
    ty += rowH;
    doc.setDrawColor(...PDF_THEME.border);
    doc.line(x + pad, ty - 0.5, x + w - pad, ty - 0.5);
  }

  ty += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_THEME.body);

  if (!client && opts.totalRawUsd !== undefined) {
    doc.text(pdfSafe("GDT internal programme total (raw)"), x + pad, ty + 5);
    doc.setTextColor(...PDF_THEME.muted);
    doc.text(fmtMoneyPdf(opts.totalRawUsd), rawX, ty + 5, { align: "right" });
    doc.setTextColor(...PDF_THEME.body);
    ty += 7;
    doc.setFontSize(9);
    doc.text(pdfSafe("Client quotation total (incl. margin)"), x + pad, ty + 5);
    doc.setTextColor(...PDF_THEME.teal);
    doc.text(fmtMoneyPdf(totalQuoteUsd), quoteX, ty + 5, { align: "right" });
    doc.setTextColor(...PDF_THEME.body);
    ty += 7;
  }

  doc.setFontSize(10);
  doc.setTextColor(...PDF_THEME.teal);
  doc.text(
    pdfSafe(client ? "TOTAL QUOTATION (USD)" : "CUSTOMER QUOTE TOTAL (USD)"),
    x + pad,
    ty + 5,
  );
  if (client) {
    doc.text(fmtMoneyPdf(totalQuoteUsd), quoteX, ty + 5, { align: "right" });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...PDF_THEME.muted);
    doc.text(fmtMoneyPdf(opts.totalRawUsd ?? 0), rawX, ty + 5, { align: "right" });
    doc.setFontSize(10);
    doc.setTextColor(...PDF_THEME.teal);
    doc.text(fmtMoneyPdf(totalQuoteUsd), quoteX, ty + 5, { align: "right" });
  }
  ty += 9;

  doc.setTextColor(...PDF_THEME.body);
  doc.setFont("helvetica", "normal");
  return ty;
}

/** Title block with planner dark header band. */
export function drawTitleBlock(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    client: boolean;
    projectTitle: string;
    meta: { client: string; site: string; author: string; revision: string };
  },
): number {
  const { x, y, width: w, client, projectTitle, meta } = opts;
  const blockH = 54;

  doc.setFillColor(...PDF_THEME.headerBg);
  doc.roundedRect(x, y, w, 28, 2, 2, "F");
  doc.setDrawColor(...PDF_THEME.teal);
  doc.setLineWidth(0.6);
  doc.line(x, y + 28, x + w, y + 28);

  doc.setTextColor(...PDF_THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(client ? 16 : 14);
  doc.text(
    pdfSafe(client ? "QUOTATION" : "CONSTRUCTION COST ESTIMATE (INTERNAL)"),
    x + w / 2,
    y + 11,
    { align: "center" },
  );
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_THEME.tealBright);
  doc.text(pdfSafe(projectTitle || "(Untitled project)"), x + w / 2, y + 19, {
    align: "center",
  });
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_THEME.muted);
  doc.text(
    pdfSafe(client ? "Green Distillation Technologies" : "GDT Construction Planner"),
    x + w / 2,
    y + 25,
    { align: "center" },
  );

  doc.setTextColor(...PDF_THEME.body);
  let by = y + 34;
  const metaRows: [string, string][] = [
    ["Client / owner", meta.client || "-"],
    ["Site / location", meta.site || "-"],
    ["Prepared by", meta.author || "-"],
    ["Revision", meta.revision || "A"],
  ];
  doc.setFontSize(9);
  for (const [k, v] of metaRows) {
    doc.setFont("helvetica", "bold");
    doc.text(pdfSafe(k), x + 3, by);
    doc.setFont("helvetica", "normal");
    doc.text(pdfSafe(v), x + 42, by, { maxWidth: w - 46 });
    by += 4.8;
  }

  return y + blockH;
}

/** Estimate vertical space for wrapped body text (mm). */
export function estimateTextBlockHeight(
  doc: jsPDF,
  text: string,
  widthMm: number,
  fontSize: number,
  lineMult = 1.25,
): number {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(pdfSafe(text), widthMm);
  const lh = fontSize * lineMult * 0.3527;
  return lines.length * lh + 2;
}

export function drawSectionHeader(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  width: number,
): number {
  const barH = 7;
  doc.setFillColor(...PDF_THEME.teal);
  doc.roundedRect(x, y, width, barH, 1, 1, "F");
  doc.setTextColor(...PDF_THEME.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(pdfSafe(title), x + 2.5, y + barH / 2 + 2.5);
  doc.setTextColor(...PDF_THEME.body);
  doc.setFont("helvetica", "normal");
  return y + barH + 5;
}

export interface PdfColumn {
  header: string;
  widthMm: number;
  align?: "left" | "right";
}

/** Data table with teal header and zebra rows (Helvetica-safe). */
export function drawPdfTable(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    columns: PdfColumn[];
    rows: string[][];
    emptyMessage?: string;
    fontSize?: number;
  },
): number {
  const { x, width: w, columns, rows } = opts;
  const fs = opts.fontSize ?? 7.8;
  const headerH = 6.2;
  const rowH = 5.4;
  const pad = 1.5;
  let y = opts.y;
  const topY = y;

  const totalColW = columns.reduce((s, c) => s + c.widthMm, 0);
  const scale = totalColW > w ? w / totalColW : 1;

  const colLayout: { xLeft: number; xRight: number; align: "left" | "right" }[] =
    [];
  let cx = x;
  for (const col of columns) {
    const cw = col.widthMm * scale;
    const align = col.align ?? "left";
    colLayout.push({
      xLeft: cx + pad,
      xRight: cx + cw - pad,
      align,
    });
    cx += cw;
  }

  doc.setFillColor(...PDF_THEME.teal);
  doc.rect(x, y, w, headerH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fs);
  doc.setTextColor(...PDF_THEME.white);
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]!;
    const layout = colLayout[i]!;
    const anchor = layout.align === "right" ? layout.xRight : layout.xLeft;
    doc.text(pdfSafe(col.header), anchor, y + 4.2, {
      align: layout.align,
    });
  }
  y += headerH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fs);

  if (rows.length === 0) {
    doc.setFillColor(...PDF_THEME.tableBg);
    doc.rect(x, y, w, rowH + 2, "F");
    doc.setTextColor(...PDF_THEME.muted);
    doc.text(
      pdfSafe(opts.emptyMessage ?? "No data."),
      x + pad,
      y + 4,
      { maxWidth: w - pad * 2 },
    );
    y += rowH + 4;
  } else {
    for (let ri = 0; ri < rows.length; ri++) {
      if (ri % 2 === 1) {
        doc.setFillColor(...PDF_THEME.tableStripe);
        doc.rect(x, y - 0.4, w, rowH, "F");
      }
      doc.setTextColor(...PDF_THEME.body);
      const row = rows[ri]!;
      for (let ci = 0; ci < columns.length; ci++) {
        const layout = colLayout[ci]!;
        const anchor = layout.align === "right" ? layout.xRight : layout.xLeft;
        const cellW = layout.xRight - layout.xLeft;
        doc.text(pdfSafe(row[ci] ?? ""), anchor, y + 3.9, {
          align: layout.align,
          maxWidth: cellW,
        });
      }
      y += rowH;
    }
  }

  doc.setDrawColor(...PDF_THEME.border);
  doc.setLineWidth(0.2);
  doc.rect(x, topY, w, y - topY, "S");

  return y + 4;
}

export function drawTotalsBlock(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    lines: { label: string; value: string; bold?: boolean }[];
  },
): number {
  let y = opts.y + 1;
  const rightX = opts.x + opts.width;

  doc.setFillColor(...PDF_THEME.tableBg);
  const blockH = opts.lines.length * 5.2 + 4;
  doc.roundedRect(opts.x, y - 1, opts.width, blockH, 1, 1, "F");
  doc.setDrawColor(...PDF_THEME.border);
  doc.setLineWidth(0.15);
  doc.roundedRect(opts.x, y - 1, opts.width, blockH, 1, 1, "S");

  for (const line of opts.lines) {
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(line.bold ? 9.5 : 8.5);
    doc.setTextColor(...(line.bold ? PDF_THEME.teal : PDF_THEME.body));
    doc.text(pdfSafe(line.label), opts.x + 3, y + 3.5);
    doc.text(pdfSafe(line.value), rightX - 3, y + 3.5, { align: "right" });
    y += line.bold ? 6.2 : 5.2;
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_THEME.body);
  return y + 2;
}
