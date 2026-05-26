/**
 * Unified quote roll-up: every cost line (disciplines, CapEx items, GDT time)
 * with cost centre + margin tier → raw vs customer quote amounts.
 */

import type { ConstructionState } from "@/store/projectStore";
import {
  COST_CENTER_LABELS,
  LINE_CATEGORY_LABELS,
  MARGIN_TIER_PCT,
  aggregateGdtTime,
  lineItemRawCost,
  MARGIN_TIER_LABELS,
  type CostCenter,
  type LineItemCategory,
  type MarginTier,
} from "@/domain/calculate/lineItems";

export interface QuoteClassification {
  costCenter: CostCenter;
  marginTier: MarginTier;
}

export type DisciplineKey =
  | "blocks"
  | "sand"
  | "concrete"
  | "earthworks"
  | "manpower"
  | "equipment";

export const DISCIPLINE_KEYS: DisciplineKey[] = [
  "blocks",
  "sand",
  "concrete",
  "earthworks",
  "manpower",
  "equipment",
];

export const DISCIPLINE_LABELS: Record<DisciplineKey, string> = {
  blocks: "Blockwork (breeze)",
  sand: "Sweet sand / bedding",
  concrete: "Concrete works",
  earthworks: "Earthworks / land preparation",
  manpower: "Manpower & site labour",
  equipment: "Equipment & machinery",
};

export type DisciplineClassifications = Record<
  DisciplineKey,
  QuoteClassification
>;

export function defaultDisciplineClassifications(): DisciplineClassifications {
  return {
    blocks: { costCenter: "gdt", marginTier: "none" },
    sand: { costCenter: "gdt", marginTier: "none" },
    concrete: { costCenter: "gdt", marginTier: "none" },
    earthworks: { costCenter: "gdt", marginTier: "none" },
    manpower: { costCenter: "gdt", marginTier: "none" },
    equipment: { costCenter: "gdt", marginTier: "none" },
  };
}

export function marginedUsd(
  rawUsd: number,
  tier: MarginTier,
  marginPct: Record<MarginTier, number>,
): number {
  const raw = Number.isFinite(rawUsd) ? Math.max(0, rawUsd) : 0;
  return raw * (1 + marginPct[tier] / 100);
}

export function classifyAmount(
  rawUsd: number,
  classification: QuoteClassification,
  marginPct: Record<MarginTier, number>,
): {
  rawUsd: number;
  withMarginUsd: number;
  marginUsd: number;
  gdtRawUsd: number;
  contractorRawUsd: number;
} {
  const raw = Number.isFinite(rawUsd) ? Math.max(0, rawUsd) : 0;
  const withMargin = marginedUsd(raw, classification.marginTier, marginPct);
  const gdtRaw = classification.costCenter === "gdt" ? raw : 0;
  const contractorRaw = classification.costCenter === "contractor" ? raw : 0;
  return {
    rawUsd: raw,
    withMarginUsd: withMargin,
    marginUsd: withMargin - raw,
    gdtRawUsd: gdtRaw,
    contractorRawUsd: contractorRaw,
  };
}

export interface QuoteLine {
  id: string;
  label: string;
  /** discipline | capex_category | capex_item | gdt_time | gdt_time_item */
  kind: string;
  rawUsd: number;
  withMarginUsd: number;
  marginUsd: number;
  costCenter: CostCenter;
  marginTier: MarginTier;
}

export interface QuoteRollup {
  lines: QuoteLine[];
  lineItemsByCategory: Record<LineItemCategory, number>;
  totalRawUsd: number;
  totalQuoteUsd: number;
  totalMarginUsd: number;
  gdtScopeRawUsd: number;
  contractorScopeRawUsd: number;
  gdtScopeQuoteUsd: number;
  contractorScopeQuoteUsd: number;
}

function disciplineRaw(
  state: ConstructionState,
  key: DisciplineKey,
): number {
  switch (key) {
    case "blocks":
      return state.breeze.result?.totalCostUsd ?? 0;
    case "sand":
      return state.sand.result?.totalCostUsd ?? 0;
    case "concrete":
      return state.concrete.result?.totalCostUsd ?? 0;
    case "earthworks":
      return state.land.result?.totalCostUsd ?? 0;
    case "manpower":
      return state.manpower.result?.grandTotalUsd ?? 0;
    case "equipment":
      return state.equipment.result?.grandTotalUsd ?? 0;
  }
}

const CATEGORY_ORDER: LineItemCategory[] = [
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

/** Build every quote line for summary tables and PDF export. */
export function computeQuoteRollup(state: ConstructionState): QuoteRollup {
  const marginPct =
    state.config?.marginTierPct ?? { ...MARGIN_TIER_PCT };
  const lines: QuoteLine[] = [];
  let totalRaw = 0;
  let totalQuote = 0;
  let gdtScopeRaw = 0;
  let contractorScopeRaw = 0;
  let gdtScopeQuote = 0;
  let contractorScopeQuote = 0;

  const dc = state.disciplineClassifications ?? defaultDisciplineClassifications();

  for (const key of DISCIPLINE_KEYS) {
    const raw = disciplineRaw(state, key);
    const classification = dc[key] ?? defaultDisciplineClassifications()[key];
    const c = classifyAmount(raw, classification, marginPct);
    if (raw <= 0) continue;
    lines.push({
      id: `disc-${key}`,
      label: DISCIPLINE_LABELS[key],
      kind: "discipline",
      rawUsd: c.rawUsd,
      withMarginUsd: c.withMarginUsd,
      marginUsd: c.marginUsd,
      costCenter: classification.costCenter,
      marginTier: classification.marginTier,
    });
    totalRaw += c.rawUsd;
    totalQuote += c.withMarginUsd;
    gdtScopeRaw += c.gdtRawUsd;
    contractorScopeRaw += c.contractorRawUsd;
    if (classification.costCenter === "gdt") gdtScopeQuote += c.withMarginUsd;
    else contractorScopeQuote += c.withMarginUsd;
  }

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

  for (const cat of CATEGORY_ORDER) {
    const itemsInCat = state.lineItems.filter(
      (li) => li.category === cat && li.enabled,
    );
    if (itemsInCat.length === 0) continue;

    let catRaw = 0;
    let catQuote = 0;
    for (const item of itemsInCat) {
      const raw = lineItemRawCost(item, state.reactors.count);
      const c = classifyAmount(
        raw,
        {
          costCenter: item.costCenter,
          marginTier: item.marginTier,
        },
        marginPct,
      );
      catRaw += c.rawUsd;
      catQuote += c.withMarginUsd;
      lines.push({
        id: item.id,
        label: item.label,
        kind: "capex_item",
        rawUsd: c.rawUsd,
        withMarginUsd: c.withMarginUsd,
        marginUsd: c.marginUsd,
        costCenter: item.costCenter,
        marginTier: item.marginTier,
      });
      gdtScopeRaw += c.gdtRawUsd;
      contractorScopeRaw += c.contractorRawUsd;
      if (item.costCenter === "gdt") gdtScopeQuote += c.withMarginUsd;
      else contractorScopeQuote += c.withMarginUsd;
    }
    liByCat[cat] = catRaw;
    totalRaw += catRaw;
    totalQuote += catQuote;

    lines.push({
      id: `capex-cat-${cat}`,
      label: LINE_CATEGORY_LABELS[cat],
      kind: "capex_category",
      rawUsd: catRaw,
      withMarginUsd: catQuote,
      marginUsd: catQuote - catRaw,
      costCenter: "contractor",
      marginTier: "none",
    });
  }

  for (const item of state.gdtTime.items) {
    if (!item.enabled) continue;
    const days = Number.isFinite(item.days) ? Math.max(0, item.days) : 0;
    const rate =
      item.dayRateOverrideUsd !== null &&
      Number.isFinite(item.dayRateOverrideUsd)
        ? item.dayRateOverrideUsd
        : state.gdtTime.rates[item.workGroup];
    const raw = days * rate;
    const cc = item.costCenter ?? "gdt";
    const c = classifyAmount(
      raw,
      {
        costCenter: cc,
        marginTier: item.marginTier,
      },
      marginPct,
    );
    lines.push({
      id: item.id,
      label: item.label,
      kind: "gdt_time_item",
      rawUsd: c.rawUsd,
      withMarginUsd: c.withMarginUsd,
      marginUsd: c.marginUsd,
      costCenter: cc,
      marginTier: item.marginTier,
    });
    totalRaw += c.rawUsd;
    totalQuote += c.withMarginUsd;
    gdtScopeRaw += c.gdtRawUsd;
    contractorScopeRaw += c.contractorRawUsd;
    if (cc === "gdt") gdtScopeQuote += c.withMarginUsd;
    else contractorScopeQuote += c.withMarginUsd;
  }

  const timeAgg = aggregateGdtTime(
    state.gdtTime.items,
    state.gdtTime.rates,
    marginPct,
  );
  if (timeAgg.rawUsd > 0) {
    lines.push({
      id: "gdt-time-total",
      label: "GDT internal time",
      kind: "gdt_time",
      rawUsd: timeAgg.rawUsd,
      withMarginUsd: timeAgg.withMarginUsd,
      marginUsd: timeAgg.marginUsd,
      costCenter: "gdt",
      marginTier: "none",
    });
  }

  return {
    lines,
    lineItemsByCategory: liByCat,
    totalRawUsd: totalRaw,
    totalQuoteUsd: totalQuote,
    totalMarginUsd: totalQuote - totalRaw,
    gdtScopeRawUsd: gdtScopeRaw,
    contractorScopeRawUsd: contractorScopeRaw,
    gdtScopeQuoteUsd: gdtScopeQuote,
    contractorScopeQuoteUsd: contractorScopeQuote,
  };
}

export { COST_CENTER_LABELS, MARGIN_TIER_PCT, MARGIN_TIER_LABELS };

/** High-level lines for executive summary / client quotation (no per-item double-count). */
export function executiveQuoteLines(rollup: QuoteRollup): QuoteLine[] {
  return rollup.lines.filter(
    (l) =>
      l.kind === "discipline" ||
      l.kind === "capex_category" ||
      l.kind === "gdt_time",
  );
}
