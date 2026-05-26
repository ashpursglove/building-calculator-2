/**
 * Generic CapEx line-items used by the Buildings, Hardware, and Logistics tabs.
 *
 * Mirrors `CapEx Calc.xlsx` — every miscellaneous quote line is one of:
 *  - per-reactor unit rate (cost = unit × reactorCount × qty)
 *  - lump site-wide cost (cost = unit × qty)
 *
 * Each item is also tagged with a `costCenter` (GDT vs Contractor) and an
 * optional `marginTier` so the quote roll-up matches the legacy "Old" sheet.
 */

export type LineItemMode = "per_reactor" | "lump";

export type CostCenter = "gdt" | "contractor";

export type MarginTier = "none" | "low" | "med" | "high";

export type LineItemCategory =
  | "site_construction"
  | "site_mep"
  | "harvesting"
  | "buildings"
  | "ancillary"
  | "reactor_mep"
  | "tech"
  | "logistics"
  | "training";

export interface LineItem {
  id: string;
  category: LineItemCategory;
  label: string;
  mode: LineItemMode;
  /** USD per unit (per reactor or per site, depending on mode). */
  unitCostUsd: number;
  /** Multiplier (1 by default). Useful for >1 instance of a lump or per-reactor qty. */
  qty: number;
  costCenter: CostCenter;
  marginTier: MarginTier;
  note?: string;
  /** Set to false to keep the item visible but excluded from totals. */
  enabled: boolean;
}

export interface GdtTimeItem {
  id: string;
  label: string;
  /** Number of days the GDT staff member works on this task. */
  days: number;
  workGroup: GdtWorkGroup;
  /** Override day rate if the global rate for the work group is not appropriate. */
  dayRateOverrideUsd: number | null;
  costCenter: CostCenter;
  marginTier: MarginTier;
  enabled: boolean;
}

export type GdtWorkGroup = "Engineering" | "Site Ops" | "Bio Ops";

export interface GdtTimeRates {
  Engineering: number;
  "Site Ops": number;
  "Bio Ops": number;
}

export function defaultGdtTimeRates(): GdtTimeRates {
  return {
    Engineering: 200,
    "Site Ops": 120,
    "Bio Ops": 120,
  };
}

export const MARGIN_TIER_PCT: Record<MarginTier, number> = {
  none: 0,
  low: 5,
  med: 10,
  high: 25,
};

export const MARGIN_TIER_LABELS: Record<MarginTier, string> = {
  none: "None (0%)",
  low: "Low (5%)",
  med: "Medium (10%)",
  high: "High (25%)",
};

export const COST_CENTER_LABELS: Record<CostCenter, string> = {
  gdt: "GDT",
  contractor: "Contractor",
};

export const LINE_CATEGORY_LABELS: Record<LineItemCategory, string> = {
  site_construction: "Site Construction",
  site_mep: "MEP (electrical / fixtures)",
  harvesting: "Harvesting & fluids",
  buildings: "Buildings & Structures",
  ancillary: "Ancillary & Support",
  reactor_mep: "Mechanical (reactor)",
  tech: "Technology / Controls",
  logistics: "Logistics & Travel",
  training: "Training & Handover",
};

/**
 * Items that were re-categorised in v3. Used by `coerceLineItems` to migrate
 * older saves automatically (and gives us a single source of truth).
 */
export const LINE_ITEM_CATEGORY_REMAP: Record<string, LineItemCategory> = {
  // Harvesting moved out of Site MEP
  "smep-harvester": "harvesting",
  "smep-pumps": "harvesting",
  "smep-piping": "harvesting",
  // Solenoid + foot valves moved out of Reactor MEP into Harvesting
  "rmep-solenoid": "harvesting",
  "rmep-footvalves": "harvesting",
};

/** Item IDs that no longer ship by default (e.g. Valve boxes removed). */
export const LINE_ITEM_RETIRED_IDS = new Set<string>(["rmep-valveboxes"]);

export interface LineItemBreakdown {
  /** Raw cost before margin. */
  rawUsd: number;
  /** Cost after applying the configured margin tier. */
  withMarginUsd: number;
  /** Margin alone (withMargin - raw). */
  marginUsd: number;
  /** Raw cost classified as GDT scope. */
  gdtUsd: number;
  /** Raw cost classified as Contractor scope. */
  contractorUsd: number;
}

export function lineItemRawCost(item: LineItem, reactorCount: number): number {
  if (!item.enabled) return 0;
  const qty = Number.isFinite(item.qty) ? item.qty : 0;
  const unit = Number.isFinite(item.unitCostUsd) ? item.unitCostUsd : 0;
  if (item.mode === "per_reactor") {
    return Math.max(0, reactorCount) * qty * unit;
  }
  return qty * unit;
}

export function aggregateLineItems(
  items: readonly LineItem[],
  reactorCount: number,
  marginPct: Record<MarginTier, number> = MARGIN_TIER_PCT,
): LineItemBreakdown {
  let raw = 0;
  let withMargin = 0;
  let gdt = 0;
  let contractor = 0;
  for (const item of items) {
    const cost = lineItemRawCost(item, reactorCount);
    raw += cost;
    const margined = cost * (1 + marginPct[item.marginTier] / 100);
    withMargin += margined;
    if (item.costCenter === "gdt") gdt += cost;
    else contractor += cost;
  }
  return {
    rawUsd: raw,
    withMarginUsd: withMargin,
    marginUsd: withMargin - raw,
    gdtUsd: gdt,
    contractorUsd: contractor,
  };
}

export interface GdtTimeBreakdown {
  totalDays: number;
  rawUsd: number;
  withMarginUsd: number;
  marginUsd: number;
  gdtUsd: number;
  contractorUsd: number;
  perWorkGroup: Record<GdtWorkGroup, { days: number; rawUsd: number }>;
}

export function aggregateGdtTime(
  items: readonly GdtTimeItem[],
  rates: GdtTimeRates,
  marginPct: Record<MarginTier, number> = MARGIN_TIER_PCT,
): GdtTimeBreakdown {
  let totalDays = 0;
  let raw = 0;
  let withMargin = 0;
  let gdt = 0;
  let contractor = 0;
  const perGroup: Record<GdtWorkGroup, { days: number; rawUsd: number }> = {
    Engineering: { days: 0, rawUsd: 0 },
    "Site Ops": { days: 0, rawUsd: 0 },
    "Bio Ops": { days: 0, rawUsd: 0 },
  };
  for (const item of items) {
    if (!item.enabled) continue;
    const days = Number.isFinite(item.days) ? Math.max(0, item.days) : 0;
    const rate =
      item.dayRateOverrideUsd !== null && Number.isFinite(item.dayRateOverrideUsd)
        ? item.dayRateOverrideUsd
        : rates[item.workGroup];
    const cost = days * rate;
    raw += cost;
    withMargin += cost * (1 + marginPct[item.marginTier] / 100);
    if (item.costCenter === "gdt") gdt += cost;
    else contractor += cost;
    totalDays += days;
    perGroup[item.workGroup].days += days;
    perGroup[item.workGroup].rawUsd += cost;
  }
  return {
    totalDays,
    rawUsd: raw,
    withMarginUsd: withMargin,
    marginUsd: withMargin - raw,
    gdtUsd: gdt,
    contractorUsd: contractor,
    perWorkGroup: perGroup,
  };
}

/** Seed used when creating a fresh project — mirrors `CapEx Calc.xlsx`. */
export function defaultLineItems(): LineItem[] {
  const make = (
    id: string,
    category: LineItemCategory,
    label: string,
    mode: LineItemMode,
    unitCostUsd: number,
    costCenter: CostCenter,
    marginTier: MarginTier,
    note: string,
    extras?: Partial<LineItem>,
  ): LineItem => ({
    id,
    category,
    label,
    mode,
    unitCostUsd,
    qty: 1,
    costCenter,
    marginTier,
    note,
    enabled: true,
    ...extras,
  });
  return [
    /* Site construction — items not already covered by Blocks/Concrete/Earthworks */
    make(
      "site-liner-mat",
      "site_construction",
      "Reactor liner materials",
      "per_reactor",
      2100,
      "gdt",
      "none",
      "HDPE / EPDM pond liner sheets supplied to site, sized to the reactor footprint plus over-hang. One unit per reactor.",
    ),
    make(
      "site-liner-app",
      "site_construction",
      "Liner application & plastic welding",
      "per_reactor",
      450,
      "gdt",
      "none",
      "Lay, fit and hot-air weld the liner; includes seam test and dressing into the freeboard channel.",
    ),
    make(
      "site-nethouse-mat",
      "site_construction",
      "Net house materials",
      "per_reactor",
      2400,
      "gdt",
      "none",
      "Steel hoops/cables, shade net, ground fittings for one reactor's net house (≈20k SAR per pair of reactors).",
    ),
    make(
      "site-nethouse-fab",
      "site_construction",
      "Net house fabrication",
      "per_reactor",
      400,
      "gdt",
      "none",
      "Site fabrication / welding / install labour for the net house around a single reactor.",
    ),
    make(
      "site-hardstandings",
      "site_construction",
      "Concrete / hard standings (misc)",
      "lump",
      450,
      "gdt",
      "none",
      "Catch-all lump for harvester/ops/drier hard standings not modelled by the Concrete tab.",
    ),

    /* Buildings */
    make(
      "bld-ops-room",
      "buildings",
      "Ops room (30 × 30 module)",
      "lump",
      1600,
      "gdt",
      "none",
      "Portacabin or modular ops room (controller, server, desk, AC) sized ~30 ft² per the legacy CapEx assumption.",
    ),
    make(
      "bld-drier-room",
      "buildings",
      "Drier room build",
      "per_reactor",
      1000,
      "gdt",
      "none",
      "Drier room shell sized per reactor; TSC components and drying shelving/trays are bundled inside.",
    ),

    /* Ancillary */
    make(
      "anc-ibcs",
      "ancillary",
      "IBCs",
      "lump",
      2000,
      "gdt",
      "none",
      "Intermediate bulk containers for harvest / chemicals / process water.",
    ),
    make(
      "anc-tanks",
      "ancillary",
      "Tanks",
      "lump",
      1500,
      "gdt",
      "none",
      "Site storage tanks for water and nutrient solutions.",
    ),

    /* Logistics & travel */
    make(
      "log-flights",
      "logistics",
      "Flights",
      "lump",
      800,
      "gdt",
      "none",
      "Return flights for GDT staff to attend mobilisation / commissioning.",
    ),
    make(
      "log-logistics",
      "logistics",
      "Logistics",
      "per_reactor",
      1500,
      "gdt",
      "none",
      "Per-reactor freight, customs handling and inland transport of GDT-supplied kit.",
    ),

    /* Training & handover */
    make(
      "train-walkthrough",
      "training",
      "Walkthrough of all hardware at their site",
      "lump",
      1000,
      "gdt",
      "none",
      "On-site walkthrough with the customer to verify every install matches drawings and labels.",
    ),
    make(
      "train-jeddah",
      "training",
      "Training on working reactors in Jeddah",
      "lump",
      500,
      "gdt",
      "none",
      "Hosting the customer's head of production at the Jeddah farm for hands-on training.",
    ),
    make(
      "train-sops",
      "training",
      "SOPs production (chem additions, harvesting, drying)",
      "lump",
      1000,
      "gdt",
      "none",
      "Authoring the project-specific SOP pack covering daily ops, harvest and drying.",
    ),
  ];
}

export function defaultGdtTime(): GdtTimeItem[] {
  return [
    {
      id: "time-landprep",
      label: "Land prep guidelines",
      days: 2,
      workGroup: "Engineering",
      dayRateOverrideUsd: null,
      costCenter: "gdt",
      marginTier: "none",
      enabled: true,
    },
    {
      id: "time-formwork",
      label: "Form working plans",
      days: 2,
      workGroup: "Engineering",
      dayRateOverrideUsd: null,
      costCenter: "gdt",
      marginTier: "none",
      enabled: true,
    },
    {
      id: "time-mep-drawings",
      label: "Guideline drawings for MEP",
      days: 5,
      workGroup: "Engineering",
      dayRateOverrideUsd: null,
      costCenter: "gdt",
      marginTier: "none",
      enabled: true,
    },
    {
      id: "time-elec-schedules",
      label: "Electrical schedules",
      days: 3,
      workGroup: "Engineering",
      dayRateOverrideUsd: null,
      costCenter: "gdt",
      marginTier: "none",
      enabled: true,
    },
    {
      id: "time-site-visits",
      label: "Site visits by project manager (weekly)",
      days: 5,
      workGroup: "Site Ops",
      dayRateOverrideUsd: null,
      costCenter: "gdt",
      marginTier: "none",
      enabled: true,
    },
    {
      id: "time-inoc",
      label: "Inoculation",
      days: 3,
      workGroup: "Bio Ops",
      dayRateOverrideUsd: null,
      costCenter: "gdt",
      marginTier: "none",
      enabled: true,
    },
  ];
}
