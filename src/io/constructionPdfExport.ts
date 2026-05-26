/**
 * A4 narrative PDF estimate — parity with legacy ReportLab sections, PandID-style
 * client-side export (jspdf + save/writeFile).
 */

import { jsPDF } from "jspdf";

import type { ConstructionState } from "@/store/projectStore";
import { concreteLabelFromType } from "@/domain/concreteKinds";
import {
  renderEquipmentSection,
  renderManpowerSection,
} from "@/io/pdfDisciplineSections";
import {
  COST_CENTER_LABELS,
  LINE_CATEGORY_LABELS,
  MARGIN_TIER_PCT,
  aggregateGdtTime,
  aggregateLineItems,
  lineItemRawCost,
  type LineItemCategory,
} from "@/domain/calculate/lineItems";
import { marginTierLabels } from "@/domain/plannerConfig";
import { computeReactorGeometry } from "@/domain/calculate/reactors";
import {
  classifyAmount,
  computeQuoteRollup,
  executiveQuoteLines,
} from "@/domain/calculate/quoteRollup";
import {
  PDF_THEME,
  drawSectionHeader,
  drawSummaryTable,
  drawTitleBlock,
  estimateTextBlockHeight,
  fmtInternalAmount,
  fmtMoneyPdf,
  pdfSafe,
} from "@/io/pdfHelpers";
import { isTauriRuntime } from "@/io/runtime";

export type PdfAudience = "internal" | "client";

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN_L = 16;
const MARGIN_R = 16;
const MARGIN_T = 18;
const MARGIN_B = 16;
const CONTENT_W = PAGE_W_MM - MARGIN_L - MARGIN_R;

/** Shared client-facing legal wording (intro echoes qualifications). */
const CLIENT_LEGAL_INTRO =
  "This document is for budgeting and commercial discussion only. It is not a certified tender return "
  + "unless stated otherwise, and it is not a commercial offer. Figures below are indicative totals by "
  + "sector and line item for the agreed scope. Exchange rates, duties, escalation, provisional sums, "
  + "contingency, bonding, and weather risk are excluded unless stated otherwise.";

const CLIENT_QUALIFICATIONS =
  "• This quotation is for budgeting and commercial discussion — not a certified tender return unless stated otherwise.\n"
  + "• This document is not a commercial offer.\n"
  + "• Sector and line-item totals reflect the scope and quantities agreed for this estimate — please confirm before acceptance.\n"
  + "• Site-specific verification (drawings, soils data, supplier quotes, labour agreements) remains the client's responsibility.";

const CAPEX_CATEGORY_ORDER: LineItemCategory[] = [
  "site_construction",
  "site_mep",
  "harvesting",
  "buildings",
  "ancillary",
  "reactor_mep",
  "tech",
  "logistics",
  "training",
];

function executiveLinesForAudience(
  rollup: ReturnType<typeof computeQuoteRollup>,
  client: boolean,
) {
  const lines = executiveQuoteLines(rollup);
  if (!client) return lines;
  return lines.filter((l) => l.kind !== "gdt_time");
}

function hasCapexLineItems(state: ConstructionState): boolean {
  return state.lineItems.some((li) => li.enabled);
}

function hasGdtTimeItems(state: ConstructionState): boolean {
  return state.gdtTime.items.some((it) => it.enabled);
}

export function totalsFromState(state: ConstructionState) {
  const blockCost = state.breeze.result?.totalCostUsd ?? 0;
  const sandCost = state.sand.result?.totalCostUsd ?? 0;
  const concreteCost = state.concrete.result?.totalCostUsd ?? 0;
  const landCost = state.land.result?.totalCostUsd ?? 0;
  const manpowerCost = state.manpower.result?.grandTotalUsd ?? 0;
  const equipmentCost = state.equipment.result?.grandTotalUsd ?? 0;

  const liBreak = aggregateLineItems(state.lineItems, state.reactors.count);
  const liByCat: Record<LineItemCategory, number> = {
    site_construction: 0,
    site_mep: 0,
    harvesting: 0,
    buildings: 0,
    ancillary: 0,
    reactor_mep: 0,
    tech: 0,
    logistics: 0,
    training: 0,
  };
  for (const item of state.lineItems) {
    liByCat[item.category] += lineItemRawCost(item, state.reactors.count);
  }
  const timeBreak = aggregateGdtTime(
    state.gdtTime.items,
    state.gdtTime.rates,
  );

  const calcRaw =
    blockCost +
    sandCost +
    concreteCost +
    landCost +
    manpowerCost +
    equipmentCost;
  const total = calcRaw + liBreak.rawUsd + timeBreak.rawUsd;
  const totalWithMargin =
    calcRaw + liBreak.withMarginUsd + timeBreak.withMarginUsd;

  return {
    blockCost,
    sandCost,
    concreteCost,
    landCost,
    manpowerCost,
    equipmentCost,
    lineItemsRaw: liBreak.rawUsd,
    lineItemsWithMargin: liBreak.withMarginUsd,
    lineItemsByCategory: liByCat,
    gdtTimeRaw: timeBreak.rawUsd,
    gdtTimeWithMargin: timeBreak.withMarginUsd,
    gdtScope: liBreak.gdtUsd + timeBreak.rawUsd,
    contractorScope: liBreak.contractorUsd + calcRaw,
    total,
    totalWithMargin,
  };
}

function fmtMoney(n: number): string {
  return fmtMoneyPdf(n);
}

function safePdfStem(raw: string): string {
  return raw.replace(/[\\/:*?"<>|]/g, "_").trim() || "construction_estimate";
}

/**
 * Builds buffer and prompts save — returns filesystem path under Tauri, or download filename in browser.
 */
export async function exportConstructionEstimatePdf(
  state: ConstructionState,
  audience: PdfAudience = "internal",
): Promise<string | null> {
  const doc = buildPdf(state, audience);
  const stem = safePdfStem(state.meta.title || "estimate");
  const bytes = doc.output("arraybuffer");
  const u8 = new Uint8Array(bytes);

  const defaultPath =
    audience === "internal"
      ? `${stem}_internal.pdf`
      : `${stem}_quotation.pdf`;

  if (isTauriRuntime()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      defaultPath,
    });
    if (!path) return null;
    await writeFile(path, u8);
    return path;
  }

  const blob = new Blob([u8], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultPath;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return defaultPath;
}

function buildPdf(state: ConstructionState, audience: PdfAudience): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const rollup = computeQuoteRollup(state);
  const executive = executiveQuoteLines(rollup);
  const marginPct = state.config?.marginTierPct ?? { ...MARGIN_TIER_PCT };
  const marginLabels = marginTierLabels(marginPct);
  const client = audience === "client";
  let y = MARGIN_T;
  let page = 1;
  const CONTENT_BOTTOM_Y = PAGE_H_MM - MARGIN_B;
  const SECTION_HDR_MM = 12;

  const resetBodyStyle = (fontSize = 9): void => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...PDF_THEME.body);
  };

  const footer = (): void => {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${page}`, PAGE_W_MM / 2, PAGE_H_MM - 8, { align: "center" });
    doc.text(
      pdfSafe(
        client
          ? "GDT - quotation for budgeting purposes. Subject to contract terms."
          : "GDT Construction Planner - internal estimate",
      ),
      MARGIN_L,
      PAGE_H_MM - 8,
      { maxWidth: CONTENT_W },
    );
    resetBodyStyle(9);
  };

  const newPage = (): void => {
    footer();
    doc.addPage();
    page++;
    y = MARGIN_T;
    resetBodyStyle(9);
  };

  const ensure = (neededMm: number): void => {
    if (y + neededMm <= CONTENT_BOTTOM_Y) return;
    newPage();
  };

  /** Section header plus minimum content - new page if they would not fit together. */
  const beginSection = (title: string, minFollowingMm: number): void => {
    const block = SECTION_HDR_MM + minFollowingMm;
    if (y + block > CONTENT_BOTTOM_Y) {
      newPage();
    }
    y = drawSectionHeader(doc, title, MARGIN_L, y, CONTENT_W);
    resetBodyStyle(9);
  };

  /** Sub-block (category, paragraph) - new page if block would not fit. */
  const beginBlock = (minMm: number): void => {
    if (y + minMm > CONTENT_BOTTOM_Y) {
      newPage();
    }
    resetBodyStyle(8.5);
  };

  /** Multi-line paragraphs with hyphenation-ish wrap */
  const bodyLines = (
    txt: string,
    size = 9.5,
    lineMult = 1.25,
  ): number => {
    resetBodyStyle(size);
    const lines = doc.splitTextToSize(pdfSafe(txt), CONTENT_W);
    const lh = size * lineMult * 0.3527; // px→mm-ish line height for wrapped text blocks
    for (let i = 0; i < lines.length; i++) {
      const line =
        typeof lines[i] === "string" ?
          lines[i]
        : (lines[i]?.toString() ?? "");
      ensure(lh + 2);
      doc.text(line, MARGIN_L, y);
      y += lh;
    }
    resetBodyStyle(size);
    return lines.length * lh;
  };

  const keyRows = (
    rows: readonly { k: string; v: string }[],
    kvSize = 9,
  ): void => {
    doc.setFontSize(kvSize);
    for (const row of rows) {
      ensure(6);
      resetBodyStyle(kvSize);
      doc.setFont("helvetica", "bold");
      const kw = CONTENT_W * 0.38;
      const linesK = doc.splitTextToSize(pdfSafe(row.k + ":"), kw);
      doc.setFont("helvetica", "normal");
      const linesV = doc.splitTextToSize(pdfSafe(row.v || "-"), CONTENT_W - kw - 4);

      let blockH = Math.max(linesK.length, linesV.length) * kvSize * 0.43;
      blockH += 1.5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(kvSize);
      doc.text(linesK, MARGIN_L, y);

      doc.setFont("helvetica", "normal");
      doc.text(linesV, MARGIN_L + kw + 2, y);

      y += blockH + 2;
      doc.setFont("helvetica", "normal");
    }
  };

  /** --- Title sheet --- */
  y = drawTitleBlock(doc, {
    x: MARGIN_L,
    y,
    width: CONTENT_W,
    client,
    projectTitle: state.meta.title,
    meta: state.meta,
  });

  doc.setFontSize(8.8);
  doc.setTextColor(...PDF_THEME.muted);
  bodyLines(
    client
      ? CLIENT_LEGAL_INTRO
      : "This internal report aggregates discipline-level estimates with raw costs, margin tiers, and "
        + "cost-centre classification. Monetary values reflect the latest successful Calculate operation "
        + "per discipline at export time.",
    9,
    1.22,
  );
  doc.setTextColor(...PDF_THEME.body);
  y += 6;

  if (!client) {
    beginBlock(32);
    doc.setFillColor(...PDF_THEME.tableBg);
    doc.setDrawColor(...PDF_THEME.border);
    doc.roundedRect(MARGIN_L, y, CONTENT_W, 26, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_THEME.body);
    doc.text(pdfSafe("GDT internal programme cost (raw)"), MARGIN_L + 4, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_THEME.muted);
    doc.text(
      fmtMoneyPdf(rollup.totalRawUsd),
      PAGE_W_MM - MARGIN_R - 4,
      y + 8,
      { align: "right" },
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_THEME.teal);
    doc.text(
      pdfSafe("Client quotation (incl. margin)"),
      MARGIN_L + 4,
      y + 17,
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(
      fmtMoneyPdf(rollup.totalQuoteUsd),
      PAGE_W_MM - MARGIN_R - 4,
      y + 17,
      { align: "right" },
    );
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_THEME.muted);
    doc.text(
      pdfSafe(
        `Margin on programme: ${fmtMoneyPdf(rollup.totalMarginUsd)} | GDT scope raw ${fmtMoneyPdf(rollup.gdtScopeRawUsd)} | Contractor scope raw ${fmtMoneyPdf(rollup.contractorScopeRawUsd)}`,
      ),
      MARGIN_L + 4,
      y + 23,
      { maxWidth: CONTENT_W - 8 },
    );
    y += 30;
    resetBodyStyle(9);
  }

  /* --- Roll-up --- */
  beginSection(
    client ? "1. Quotation summary" : "1. Executive cost summary",
    35 + executive.length * 6,
  );

  ensure(20 + executive.length * 7);
  y = drawSummaryTable(doc, {
    x: MARGIN_L,
    y,
    width: CONTENT_W,
    marginRight: MARGIN_R,
    pageW: PAGE_W_MM,
    client,
    rows: executiveLinesForAudience(rollup, client).map((line) => ({
      label: line.label,
      rawUsd: line.rawUsd,
      quoteUsd: line.withMarginUsd,
    })),
    totalRawUsd: rollup.totalRawUsd,
    totalQuoteUsd: rollup.totalQuoteUsd,
  });
  y += 8;

  if (client) {
    const CLIENT_ROW_MM = 4.8;
    const CLIENT_CAT_HDR_MM = 7;
    let clientSection = 2;

    const disciplineLines = rollup.lines.filter(
      (l) => l.kind === "discipline" && l.withMarginUsd > 0,
    );

    beginSection(`${clientSection++}. Quotation breakdown`, 24);

    if (disciplineLines.length > 0) {
      beginBlock(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...PDF_THEME.body);
      doc.text(
        pdfSafe("Construction, earthworks, and site operations"),
        MARGIN_L,
        y,
      );
      y += CLIENT_CAT_HDR_MM;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      for (const line of disciplineLines) {
        beginBlock(CLIENT_ROW_MM);
        doc.text(pdfSafe(line.label), MARGIN_L + 2, y, {
          maxWidth: CONTENT_W * 0.62,
        });
        doc.text(fmtMoney(line.withMarginUsd), PAGE_W_MM - MARGIN_R, y, {
          align: "right",
        });
        y += CLIENT_ROW_MM;
      }
      y += 4;
    }

    for (const cat of CAPEX_CATEGORY_ORDER) {
      const itemsInCat = state.lineItems.filter(
        (li) => li.category === cat && li.enabled,
      );
      if (itemsInCat.length === 0) continue;

      const itemRows: { label: string; quoteUsd: number }[] = [];
      let catQuoteUsd = 0;
      for (const item of itemsInCat) {
        const raw = lineItemRawCost(item, state.reactors.count);
        const quote = classifyAmount(
          raw,
          {
            costCenter: item.costCenter,
            marginTier: item.marginTier,
          },
          marginPct,
        ).withMarginUsd;
        if (quote <= 0) continue;
        catQuoteUsd += quote;
        const qtyPart =
          item.mode === "per_reactor"
            ? `${item.qty} × ${state.reactors.count} reactor(s)`
            : `${item.qty} lump`;
        itemRows.push({
          label: `${item.label} (${qtyPart})`,
          quoteUsd: quote,
        });
      }
      if (itemRows.length === 0) continue;

      beginBlock(CLIENT_CAT_HDR_MM + itemRows.length * CLIENT_ROW_MM + 4);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...PDF_THEME.body);
      doc.text(pdfSafe(LINE_CATEGORY_LABELS[cat]), MARGIN_L, y);
      doc.text(fmtMoney(catQuoteUsd), PAGE_W_MM - MARGIN_R, y, {
        align: "right",
      });
      y += CLIENT_CAT_HDR_MM;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      for (const row of itemRows) {
        beginBlock(CLIENT_ROW_MM);
        doc.text(pdfSafe(row.label), MARGIN_L + 4, y, {
          maxWidth: CONTENT_W * 0.64,
        });
        doc.text(fmtMoney(row.quoteUsd), PAGE_W_MM - MARGIN_R, y, {
          align: "right",
        });
        y += CLIENT_ROW_MM;
      }
      y += 4;
    }

    const qualHeight = estimateTextBlockHeight(
      doc,
      CLIENT_QUALIFICATIONS,
      CONTENT_W,
      9,
      1.25,
    );
    beginSection(`${clientSection++}. Terms and qualifications`, qualHeight);
    bodyLines(CLIENT_QUALIFICATIONS, 9, 1.25);
    footer();
    return doc;
  }

  let detailSection = 2;

  /* --- GDT vs Contractor cost-center breakdown --- */
  beginBlock(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(pdfSafe("Cost-centre split"), MARGIN_L, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    keyRows([
      {
        k: "GDT scope (raw / quote)",
        v: fmtInternalAmount(rollup.gdtScopeRawUsd, rollup.gdtScopeQuoteUsd),
      },
      {
        k: "Contractor scope (raw / quote)",
        v: fmtInternalAmount(
          rollup.contractorScopeRawUsd,
          rollup.contractorScopeQuoteUsd,
        ),
      },
      {
        k: "Programme margin add-on",
        v: fmtMoney(rollup.totalMarginUsd),
      },
      {
        k: "Reactor count (drives per-reactor lines)",
        v: `${state.reactors.count}`,
      },
    ]);
  y += 4;

  /* --- Reactor configuration --- */
  beginSection(`${detailSection++}. Reactor configuration`, 42);
  const rGeom = computeReactorGeometry(state.reactors);
  keyRows([
    {
      k: "Reactor envelope",
      v:
        `${state.reactors.lengthM} m × ${state.reactors.widthM} m, wall height ${state.reactors.wallHeightM} m, working depth ${state.reactors.workingDepthM} m`,
    },
    {
      k: "Excavation parameters",
      v:
        `${state.reactors.excavationDepthCm} cm deep · footing ${state.reactors.footingThicknessCm} cm · sand bedding ${state.reactors.sandBeddingCm} cm · overdig ${state.reactors.overdigM} m`,
    },
    {
      k: "Derived per-reactor",
      v:
        `footprint ${rGeom.footprintM2.toFixed(2)} m² · excavation footprint ${rGeom.excavationFootprintPerM2.toFixed(2)} m² · liner area ${rGeom.linerAreaPerReactorM2.toFixed(2)} m²`,
    },
    {
      k: "Derived totals (× count)",
      v:
        `total footprint ${rGeom.totalFootprintM2.toFixed(2)} m² · excavation vol. ${rGeom.totalExcavationVolumeM3.toFixed(2)} m³ · total liner ${rGeom.totalLinerAreaM2.toFixed(2)} m² · working vol. ${rGeom.totalWorkingVolumeM3.toFixed(2)} m³`,
    },
  ]);

  /* --- Detailed discipline sections (omitted when not calculated) --- */
  if (state.breeze.result) {
  beginSection(`${detailSection++}. Blockwork (breeze) - assumptions and quantities`, 45);
  keyRows([
    {
      k: "Block SKU",
      v: `${state.breeze.blockName}`,
    },
    {
      k: "Unit supply rate",
      v: `${state.breeze.costPerBlock.toFixed(4)} USD/unit`,
    },
    {
      k: "Raceway reactor walls (from Reactors tab)",
      v:
        `L=${state.reactors.lengthM.toFixed(3)} m, W=${state.reactors.widthM.toFixed(
          3,
        )} m, H=${state.reactors.wallHeightM.toFixed(3)} m, count=${state.reactors.count}`,
    },
  ]);

  if (state.breeze.walls.length) {
    keyRows(
      state.breeze.walls.map((w) => ({
        k: `Wall group · ${w.label}${w.enabled ? "" : " (disabled)"}`,
        v: `${w.lengthM.toFixed(3)} m × ${w.heightM.toFixed(3)} m × ${w.count} units`,
      })),
    );
  }
  if (state.breeze.arcs.length) {
    keyRows(
      state.breeze.arcs.map((a) => ({
        k: `Arc group · ${a.label}${a.enabled ? "" : " (disabled)"}`,
        v: `${a.count} arcs @ r=${a.radiusM.toFixed(3)} m, h=${a.heightM.toFixed(3)} m`,
      })),
    );
  }
    const br = state.breeze.result;
    keyRows([
      {
        k: "Computed total blockwork area",
        v: `${br.totalAreaM2.toFixed(2)} m² (walls ${br.wallAreaM2.toFixed(2)} + arcs ${br.arcAreaM2.toFixed(2)} + reactors ${br.reactorAreaM2.toFixed(2)})`,
      },
      {
        k: "Blocks / pallets",
        v: `${br.blocksRequired.toLocaleString()} blocks on ${br.palletsRequired} pallets (${br.leftoverBlocks} surplus pieces)`,
      },
      {
        k: "Material subtotal",
        v: fmtMoney(br.totalCostUsd),
      },
    ]);
  }

  if (state.sand.result) {
  beginSection(`${detailSection++}. Sweet sand (bedding)`, 35);
  keyRows([
    {
      k: "Geometry",
      v: `L=${state.sand.lengthTotalM.toFixed(3)} m, W=${state.sand.widthM.toFixed(
        3,
      )} m, fill=${state.sand.fillHeightCm.toFixed(1)} cm, corner r=${state.sand.cornerRadiusCm.toFixed(
        1,
      )} cm`,
    },
    {
      k: "Material",
      v: `ρ = ${state.sand.bulkDensityKgM3.toFixed(1)} kg/m³, tender ${state.sand.costPerTonneUsd.toFixed(
        2,
      )} USD/t`,
    },
  ]);
    const s = state.sand.result;
    keyRows([
      { k: "Straight section (L−W)", v: `${s.rectLengthM.toFixed(3)} m` },
      { k: "Half-circle radius", v: `${s.arcRadiusM.toFixed(3)} m` },
      { k: "Plan area", v: `${s.planAreaM2.toFixed(2)} m²` },
      {
        k: "Volumes (base / corner / total)",
        v:
          `${s.volumeBaseM3.toFixed(3)} / ${s.volumeCornerM3.toFixed(3)} / ${s.volumeTotalM3.toFixed(3)} m³`,
      },
      {
        k: "Mass",
        v:
          `${s.weightKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg (${s.weightTons.toFixed(
            3,
          )} t)`,
      },
      { k: "Material subtotal", v: fmtMoney(s.totalCostUsd) },
    ]);
  }

  if (state.concrete.result) {
  beginSection(`${detailSection++}. Concrete structures`, 40);
  keyRows([
    {
      k: "Element count",
      v: `${state.concrete.elements.filter((e) => e.enabled).length} active / ${state.concrete.elements.length} total`,
    },
    {
      k: "Glob. materials assumptions",
      v: `${state.concrete.materials.densityKgM3} kg/m³ concrete · ${fmtMoney(state.concrete.materials.costUsdM3)}/m³ · ${state.concrete.materials.rebarKgM3} kg/m³ rebar @ ${fmtMoney(state.concrete.materials.rebarCostUsdT)}/t`,
    },
  ]);

  for (const el of state.concrete.elements) {
    const typeLabel = concreteLabelFromType(el.elementType);
    let dims = "";
    if (el.elementType === "wall") {
      dims = `length ${el.lengthM} m × height ${el.heightM} m × depth ${el.thicknessCm} cm × ${el.count}`;
    } else if (el.elementType === "strip") {
      dims = `length ${el.lengthM} m × width ${el.widthM} m × depth ${el.thicknessCm} cm`;
    } else {
      dims = `length ${el.lengthM} m × width ${el.widthM} m × depth ${el.thicknessCm} cm × ${el.count}`;
    }
    keyRows([
      {
        k: `${typeLabel} · ${el.label}${el.enabled ? "" : " (disabled)"}`,
        v: dims,
      },
    ]);
  }

    const c = state.concrete.result;
    keyRows([
      { k: "Total volume", v: `${c.volumeM3.toFixed(3)} m³` },
      { k: "Formwork (vertical indicative)", v: `${c.formAreaM2.toFixed(2)} m²` },
      {
        k: "Rebar (indicative)",
        v: `${c.rebarKg.toFixed(1)} kg (${c.rebarTons.toFixed(3)} t)`,
      },
      {
        k: "Costs (conc / steel / total)",
        v:
          `${fmtMoney(c.concCostUsd)} / ${fmtMoney(c.rebarCostUsd)} to ${fmtMoney(c.totalCostUsd)}`,
      },
    ]);
    for (const row of c.elements) {
      keyRows([
        {
          k: `  ↳ ${row.label}`,
          v: `${row.volumeM3.toFixed(3)} m³ · ${fmtMoney(row.totalCostUsd)}`,
        },
      ]);
    }
  }

  if (state.land.result) {
  beginSection(`${detailSection++}. Earthworks and compaction`, 40);
  const L = state.land;
  const lr = state.land.result;
  keyRows([
    {
      k: "Reactor link",
      v: state.earthworksFromReactors
        ? "ON — reactor pads pulled from Reactors tab"
        : "OFF",
    },
    {
      k: "Compaction modelling",
      v: `${L.compactionTargetPct}% target, ${L.liftThicknessCm} cm lifts, roller ${L.rollerWidthM} m wide, ${L.passesPerLift} passes/lift`,
    },
    {
      k: "Unit rates applied",
      v: `${fmtMoney(L.costPerM3Cut)}/m³ cut & haul · ${fmtMoney(L.costPerM2Pass)} USD per m²·pass`,
    },
  ]);
  if (L.platforms.length) {
    keyRows(
      L.platforms.map((p) => ({
        k: `Platform · ${p.label}${p.enabled ? "" : " (disabled)"}`,
        v: `${p.areaM2.toFixed(2)} m² @ ${p.depthCm.toFixed(1)} cm`,
      })),
    );
  }
  if (L.trenches.length) {
    keyRows(
      L.trenches.map((t) => ({
        k: `Trench · ${t.label}${t.enabled ? "" : " (disabled)"}`,
        v: `${t.count} × (${t.lengthM.toFixed(2)} × ${t.widthM.toFixed(2)} × ${(t.depthCm / 100).toFixed(2)} m)`,
      })),
    );
  }
    keyRows([
      {
        k: "Volumes",
        v:
          `${lr.platformVolumeM3.toFixed(3)} m³ platforms + ${lr.trenchVolumeM3.toFixed(
            3,
          )} m³ trenches + ${lr.reactorVolumeM3.toFixed(3)} m³ reactor pads ⇒ ${lr.totalCutVolumeM3.toFixed(
            3,
          )} m³`,
      },
      {
        k: "Compaction footprints",
        v:
          `${lr.platformCompAreaM2.toFixed(2)} m² pads + ${lr.trenchCompAreaM2.toFixed(
            2,
          )} m² trenches + ${lr.reactorCompAreaM2.toFixed(2)} m² reactor pads`,
      },
      {
        k: "Lift counts",
        v: `${lr.liftsPlatform} lifts (pad) · ${lr.liftsTrench} lifts (trenches); ${lr.totalAreaPassesM2.toFixed(
          2,
        )} m²·passes`,
      },
      {
        k: "Costs (cut / compaction / total)",
        v:
          `${fmtMoney(lr.cutCostUsd)} / ${fmtMoney(lr.compactionCostUsd)} to ${fmtMoney(lr.totalCostUsd)}`,
      },
    ]);
  }

  if (state.manpower.result) {
    beginSection(`${detailSection++}. Manpower roster and allowances`, 88);
    y = renderManpowerSection(doc, state.manpower, y, MARGIN_L, CONTENT_W);
  }

  if (state.equipment.result) {
    beginSection(`${detailSection++}. Mechanical plant and fuels`, 88);
    y = renderEquipmentSection(doc, state.equipment, y, MARGIN_L, CONTENT_W);
  }

  /* --- Section 9: CapEx line items grouped by category --- */
  const categoryOrder: LineItemCategory[] = [
    "site_construction",
    "site_mep",
    "harvesting",
    "buildings",
    "ancillary",
    "reactor_mep",
    "tech",
    "logistics",
    "training",
  ];

  const LINE_ITEM_ROW_MM = 4.8;
  const LINE_ITEM_CAT_HDR_MM = 6.5;

  if (hasCapexLineItems(state)) {
  let capexMinMm = 0;
  for (const cat of categoryOrder) {
    const n = state.lineItems.filter(
      (li) => li.category === cat && li.enabled,
    ).length;
    if (n > 0) capexMinMm += 7 + n * 5 + 2;
  }
  beginSection(
    `${detailSection++}. CapEx line items (per-reactor and lump)`,
    Math.max(capexMinMm, 28),
  );

  for (const cat of categoryOrder) {
    const itemsInCat = state.lineItems.filter(
      (li) => li.category === cat && li.enabled,
    );
    if (itemsInCat.length === 0) continue;

    const blockMm = LINE_ITEM_CAT_HDR_MM + itemsInCat.length * LINE_ITEM_ROW_MM;
    beginBlock(blockMm);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_THEME.body);
    doc.text(pdfSafe(LINE_CATEGORY_LABELS[cat]), MARGIN_L, y);
    y += LINE_ITEM_CAT_HDR_MM;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    for (const item of itemsInCat) {
      const raw = lineItemRawCost(item, state.reactors.count);
      const margin = marginPct[item.marginTier];
      const margined = raw * (1 + margin / 100);
      beginBlock(LINE_ITEM_ROW_MM);
      const qtyPart =
        item.mode === "per_reactor"
          ? `${item.qty} x ${state.reactors.count}`
          : `${item.qty} lump`;
      const left = pdfSafe(
        `${item.label} (${qtyPart} x ${fmtMoney(item.unitCostUsd)})`,
      );
      const right = `${fmtInternalAmount(raw, margined)} [${pdfSafe(COST_CENTER_LABELS[item.costCenter])}, ${pdfSafe(marginLabels[item.marginTier])}]`;
      doc.text(left, MARGIN_L + 2, y, { maxWidth: CONTENT_W * 0.55 });
      doc.text(right, PAGE_W_MM - MARGIN_R, y, { align: "right" });
      y += LINE_ITEM_ROW_MM;
    }
    y += 2;
  }
  }

  /* --- GDT internal time --- */
  const gdtItems = state.gdtTime.items.filter((it) => it.enabled);
  if (hasGdtTimeItems(state)) {
  beginSection(
    `${detailSection++}. GDT internal time`,
    18 + gdtItems.length * LINE_ITEM_ROW_MM,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  keyRows([
    {
      k: "Day rates (USD/day)",
      v: `Engineering ${fmtMoney(state.gdtTime.rates.Engineering)} · Site Ops ${fmtMoney(state.gdtTime.rates["Site Ops"])} · Bio Ops ${fmtMoney(state.gdtTime.rates["Bio Ops"])}`,
    },
  ]);
  resetBodyStyle(8.5);
  for (const it of gdtItems) {
    const rate =
      it.dayRateOverrideUsd !== null
        ? it.dayRateOverrideUsd
        : state.gdtTime.rates[it.workGroup];
    const raw = Math.max(0, it.days) * rate;
    const margined = raw * (1 + marginPct[it.marginTier] / 100);
    beginBlock(LINE_ITEM_ROW_MM);
    const left = pdfSafe(
      `${it.label} (${it.days} days x ${fmtMoney(rate)}/d ${it.workGroup})`,
    );
    const cc = it.costCenter ?? "gdt";
    const right = `${fmtInternalAmount(raw, margined)} [${pdfSafe(COST_CENTER_LABELS[cc])}, ${pdfSafe(marginLabels[it.marginTier])}]`;
    doc.text(left, MARGIN_L + 2, y, { maxWidth: CONTENT_W * 0.6 });
    doc.text(right, PAGE_W_MM - MARGIN_R, y, { align: "right" });
    y += LINE_ITEM_ROW_MM;
  }
  }

  const qualificationsText =
    "• Figures are deterministic engineering estimates for budgeting / optioneering - not certified tender returns.\n"
      + "• Exchange rates, duties, escalation, provisional sums, primes, contingency, bonding, LC fees, HSE programmes and weather risk are intentionally outside this calculator.\n"
      + "• Concrete reinforcement weights use uniform kg/m3 factors; choke points, splice lengths, cages, chairs should be adjudicated via structural drawings.\n"
      + "• Earthmoving productivity, trench support, groundwater control, spoil disposal fees, haul routes, traffic management, QA/QC borings, compaction testing budgets are not automated - allow separate lines.\n"
      + "• Sweet sand densities vary with moisture - verify quarry test certificates.\n"
      + "• Per-reactor line items scale linearly with the Reactors tab count - confirm the count before sharing the quote externally.\n"
      + "• Cost-centre split (GDT vs Contractor) and margin tiers reflect internal planning assumptions, not the final commercial mark-up.";

  const qualHeight = estimateTextBlockHeight(
    doc,
    qualificationsText,
    CONTENT_W,
    9,
    1.25,
  );
  beginSection(
    `${detailSection++}. Professional qualifications and exclusions`,
    qualHeight,
  );
  bodyLines(qualificationsText, 9, 1.25);

  footer();
  return doc;
}

