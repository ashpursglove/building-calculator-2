/**
 * Formatted PDF blocks for manpower (section 7) and equipment (section 8).
 */

import type { jsPDF } from "jspdf";

import { effectiveManpowerDays } from "@/domain/calculate/manpower";
import { effectiveEquipmentDays } from "@/domain/calculate/equipment";
import type { ConstructionState } from "@/store/projectStore";

import {
  drawPdfTable,
  drawTotalsBlock,
  fmtMoneyPdf,
  pdfSafe,
  PDF_THEME,
  type PdfColumn,
} from "@/io/pdfHelpers";

function drawNote(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  text: string,
): number {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_THEME.muted);
  const lines = doc.splitTextToSize(pdfSafe(text), w);
  let ty = y;
  for (const line of lines) {
    doc.text(typeof line === "string" ? line : String(line), x, ty);
    ty += 3.8;
  }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_THEME.body);
  return ty + 2;
}

function drawParamGrid(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  rows: { label: string; value: string }[],
): number {
  const colW = w / 2 - 2;
  let ty = y;
  doc.setFontSize(8.5);
  for (let i = 0; i < rows.length; i += 2) {
    const left = rows[i];
    const right = rows[i + 1];
    if (left) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_THEME.muted);
      doc.text(pdfSafe(left.label), x, ty);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF_THEME.body);
      doc.text(pdfSafe(left.value), x, ty + 3.8, { maxWidth: colW });
    }
    if (right) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...PDF_THEME.muted);
      doc.text(pdfSafe(right.label), x + w / 2 + 2, ty);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF_THEME.body);
      doc.text(pdfSafe(right.value), x + w / 2 + 2, ty + 3.8, {
        maxWidth: colW,
      });
    }
    ty += 9;
  }
  return ty;
}

/** Section 7 — manpower roster table + totals (no monospace dump). */
export function renderManpowerSection(
  doc: jsPDF,
  mp: ConstructionState["manpower"],
  y: number,
  x: number,
  w: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_THEME.body);

  const { schedule, overheads } = mp;
  let ty = drawParamGrid(doc, x, y, w, [
    {
      label: "Default programme",
      value: `${schedule.days} days, ${schedule.hoursNormalPerDay} h/day normal, ${schedule.hoursOtPerDay} h/day OT (x${schedule.otFactor.toFixed(2)})`,
    },
    {
      label: "Site overheads",
      value: `${fmtMoneyPdf(overheads.mobilisationUsd)} mob, ${fmtMoneyPdf(overheads.demobilisationUsd)} demob, ${fmtMoneyPdf(overheads.dailyOverheadUsd)}/day, ${fmtMoneyPdf(overheads.miscUsd)} misc`,
    },
  ]);
  ty += 2;

  const tableRows: string[][] = [];
  for (const row of mp.rows) {
    if (!row.enabled) continue;

    const workers = Math.max(0, Math.trunc(row.workers));
    const rate = row.rateUsdH;
    const rowDays = effectiveManpowerDays(row, schedule.days);
    if (workers <= 0 || rate <= 0 || rowDays <= 0) continue;

    const mh =
      workers *
      rowDays *
      (schedule.hoursNormalPerDay + schedule.hoursOtPerDay);
    const normal =
      workers * rowDays * schedule.hoursNormalPerDay * rate;
    const ot =
      workers *
      rowDays *
      schedule.hoursOtPerDay *
      rate *
      schedule.otFactor;
    const labour = normal + ot;
    const daysLabel = String(rowDays);

    tableRows.push([
      row.trade.trim() || "Unnamed trade",
      String(workers),
      daysLabel,
      fmtMoneyPdf(rate),
      `${mh.toFixed(1)} h`,
      fmtMoneyPdf(labour),
    ]);
  }

  const cols: PdfColumn[] = [
    { header: "Trade", widthMm: 48, align: "left" },
    { header: "Workers", widthMm: 16, align: "right" },
    { header: "Days", widthMm: 18, align: "right" },
    { header: "Rate/h", widthMm: 22, align: "right" },
    { header: "Man-hours", widthMm: 24, align: "right" },
    { header: "Labour (USD)", widthMm: 28, align: "right" },
  ];

  ty = drawPdfTable(doc, {
    x,
    y: ty,
    width: w,
    columns: cols,
    rows: tableRows,
    emptyMessage:
      "No trades on the list — add crew lines on the Manpower tab and Calculate.",
  });

  if (mp.result) {
    ty += 2;
    ty = drawTotalsBlock(doc, {
      x,
      y: ty,
      width: w,
      lines: [
        {
          label: "Total man-hours",
          value: `${mp.result.totalManhours.toFixed(1)} h`,
        },
        {
          label: "Total labour cost",
          value: fmtMoneyPdf(mp.result.totalLabourCostUsd),
        },
        {
          label: "Mobilisation + demobilisation",
          value: fmtMoneyPdf(mp.result.mobCostUsd),
        },
        {
          label: "Overhead + miscellaneous",
          value: fmtMoneyPdf(mp.result.overheadCostUsd),
        },
        {
          label: "Grand total manpower",
          value: fmtMoneyPdf(mp.result.grandTotalUsd),
          bold: true,
        },
      ],
    });
  } else {
    ty = drawNote(
      doc,
      x,
      ty,
      w,
      "Manpower totals not calculated — open the Manpower tab and press Calculate.",
    );
  }

  return ty;
}

/** Section 8 — equipment fleet table + totals (no monospace dump). */
export function renderEquipmentSection(
  doc: jsPDF,
  eq: ConstructionState["equipment"],
  y: number,
  x: number,
  w: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_THEME.body);

  let ty = drawParamGrid(doc, x, y, w, [
    {
      label: "Default programme",
      value: `${eq.days} calendar days x ${eq.hoursPerDay} productive h/day`,
    },
    {
      label: "Fuel price",
      value: `${fmtMoneyPdf(eq.fuelPriceUsdL)} / L`,
    },
    {
      label: "Plant overheads",
      value: `${fmtMoneyPdf(eq.mobilisationUsd)} mob, ${fmtMoneyPdf(eq.demobilisationUsd)} demob, ${fmtMoneyPdf(eq.dailyPlantOverheadUsd)}/day, ${fmtMoneyPdf(eq.miscPlantUsd)} misc`,
    },
  ]);
  ty += 2;

  const tableRows: string[][] = [];
  for (let i = 0; i < eq.rows.length; i++) {
    const row = eq.rows[i]!;
    if (!row.enabled) continue;

    const name = row.name.trim() || `Item ${i + 1}`;
    const count = Math.max(0, Math.trunc(row.count));
    const rate = row.rateUsdH;
    const util = row.utilPct;
    const rowDays = effectiveEquipmentDays(row, eq.days);
    const scheduleHours = rowDays * eq.hoursPerDay;

    if (count <= 0 || rate <= 0 || util <= 0 || eq.hoursPerDay <= 0 || rowDays <= 0) {
      continue;
    }

    const u = util / 100;
    const hours = count * scheduleHours * u;
    const hire = hours * rate;
    const fuelL = hours * row.fuelLH;
    const fuelCost = fuelL * eq.fuelPriceUsdL;
    const daysLabel = String(rowDays);

    tableRows.push([
      name,
      String(count),
      daysLabel,
      `${util.toFixed(0)}%`,
      `${hours.toFixed(1)} h`,
      `${fuelL.toFixed(1)} L`,
      fmtMoneyPdf(hire),
      fmtMoneyPdf(fuelCost),
    ]);
  }

  const cols: PdfColumn[] = [
    { header: "Plant", widthMm: 38, align: "left" },
    { header: "Units", widthMm: 12, align: "right" },
    { header: "Days", widthMm: 14, align: "right" },
    { header: "Util", widthMm: 12, align: "right" },
    { header: "Hours", widthMm: 16, align: "right" },
    { header: "Fuel (L)", widthMm: 16, align: "right" },
    { header: "Hire (USD)", widthMm: 24, align: "right" },
    { header: "Fuel (USD)", widthMm: 24, align: "right" },
  ];

  ty = drawPdfTable(doc, {
    x,
    y: ty,
    width: w,
    columns: cols,
    rows: tableRows,
    emptyMessage:
      "No plant on the list — add fleet lines on the Equipment tab and Calculate.",
    fontSize: 7.2,
  });

  if (eq.result) {
    const r = eq.result;
    ty += 2;
    ty = drawTotalsBlock(doc, {
      x,
      y: ty,
      width: w,
      lines: [
        {
          label: "Total operating hours (all machines)",
          value: `${r.totalHours.toFixed(1)} h`,
        },
        { label: "Total hire cost", value: fmtMoneyPdf(r.totalHireCostUsd) },
        {
          label: "Total fuel consumption",
          value: `${r.totalFuelLitres.toFixed(1)} L`,
        },
        { label: "Total fuel cost", value: fmtMoneyPdf(r.totalFuelCostUsd) },
        {
          label: "Mobilisation + demobilisation",
          value: fmtMoneyPdf(r.mobCostUsd),
        },
        {
          label: "Plant overhead + miscellaneous",
          value: fmtMoneyPdf(r.overheadCostUsd),
        },
        {
          label: "Grand total equipment",
          value: fmtMoneyPdf(r.grandTotalUsd),
          bold: true,
        },
      ],
    });
  } else {
    ty = drawNote(
      doc,
      x,
      ty,
      w,
      "Equipment totals not calculated — open the Equipment tab and press Calculate.",
    );
  }

  return ty;
}
