import type { EquipmentPresetRow } from "@/domain/calculate/equipment";
import {
  MANPOWER_DEFAULT_RATES_USD_H,
  MANPOWER_TRADES,
} from "@/domain/calculate/manpower";
import { EQUIPMENT_DEFAULT_ROWS } from "@/domain/calculate/equipment";
import type { GdtTimeRates, MarginTier } from "@/domain/calculate/lineItems";
import { MARGIN_TIER_PCT } from "@/domain/calculate/lineItems";

/** User-editable planner presets — saved per project. */
export interface PlannerConfig {
  marginTierPct: Record<MarginTier, number>;
  rebarDensityKgM3: {
    low: number;
    medium: number;
    high: number;
  };
  gdtDayRates: GdtTimeRates;
  /** Hourly USD rates when adding a manpower row, keyed by trade name. */
  manpowerTradeRatesUsdH: Record<string, number>;
  /** Fleet lines offered in the Equipment tab add dropdown. */
  equipmentPresets: EquipmentPresetRow[];
}

export function defaultPlannerConfig(): PlannerConfig {
  const manpowerTradeRatesUsdH: Record<string, number> = {};
  MANPOWER_TRADES.forEach((trade, i) => {
    manpowerTradeRatesUsdH[trade] = MANPOWER_DEFAULT_RATES_USD_H[i] ?? 5;
  });

  return {
    marginTierPct: { ...MARGIN_TIER_PCT },
    rebarDensityKgM3: {
      low: 80,
      medium: 100,
      high: 150,
    },
    gdtDayRates: {
      Engineering: 200,
      "Site Ops": 120,
      "Bio Ops": 120,
    },
    manpowerTradeRatesUsdH,
    equipmentPresets: EQUIPMENT_DEFAULT_ROWS.map((r) => ({ ...r })),
  };
}

export function marginTierLabels(
  pct: Record<MarginTier, number>,
): Record<MarginTier, string> {
  return {
    none: `None (${pct.none}%)`,
    low: `Low (${pct.low}%)`,
    med: `Medium (${pct.med}%)`,
    high: `High (${pct.high}%)`,
  };
}

export type RebarDensityPresetId = "low" | "medium" | "high";

export function rebarDensityPresetForValue(
  kgM3: number,
  presets: PlannerConfig["rebarDensityKgM3"],
): RebarDensityPresetId | "custom" {
  if (kgM3 === presets.low) return "low";
  if (kgM3 === presets.medium) return "medium";
  if (kgM3 === presets.high) return "high";
  return "custom";
}

export function rebarDensityKgM3ForPreset(
  id: RebarDensityPresetId,
  presets: PlannerConfig["rebarDensityKgM3"],
): number {
  return presets[id];
}

export function manpowerRateForTrade(
  trade: string,
  config: PlannerConfig,
): number {
  const rate = config.manpowerTradeRatesUsdH[trade];
  if (typeof rate === "number" && Number.isFinite(rate)) return rate;
  const idx = MANPOWER_TRADES.indexOf(trade as (typeof MANPOWER_TRADES)[number]);
  return idx >= 0 ? (MANPOWER_DEFAULT_RATES_USD_H[idx] ?? 5) : 5;
}

export function coercePlannerConfig(raw: unknown): PlannerConfig {
  const base = defaultPlannerConfig();
  if (!raw || typeof raw !== "object") return base;
  const c = raw as Partial<PlannerConfig>;

  const marginTierPct = { ...base.marginTierPct };
  if (c.marginTierPct && typeof c.marginTierPct === "object") {
    for (const tier of ["none", "low", "med", "high"] as const) {
      const v = c.marginTierPct[tier];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        marginTierPct[tier] = v;
      }
    }
  }

  const rebar = { ...base.rebarDensityKgM3 };
  if (c.rebarDensityKgM3 && typeof c.rebarDensityKgM3 === "object") {
    for (const key of ["low", "medium", "high"] as const) {
      const v = c.rebarDensityKgM3[key];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        rebar[key] = v;
      }
    }
  }

  const gdtDayRates = { ...base.gdtDayRates };
  if (c.gdtDayRates && typeof c.gdtDayRates === "object") {
    for (const g of ["Engineering", "Site Ops", "Bio Ops"] as const) {
      const v = c.gdtDayRates[g];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        gdtDayRates[g] = v;
      }
    }
  }

  const manpowerTradeRatesUsdH = { ...base.manpowerTradeRatesUsdH };
  if (c.manpowerTradeRatesUsdH && typeof c.manpowerTradeRatesUsdH === "object") {
    for (const [trade, rate] of Object.entries(c.manpowerTradeRatesUsdH)) {
      if (typeof rate === "number" && Number.isFinite(rate) && rate >= 0) {
        manpowerTradeRatesUsdH[trade] = rate;
      }
    }
  }

  let equipmentPresets = base.equipmentPresets;
  if (Array.isArray(c.equipmentPresets) && c.equipmentPresets.length > 0) {
    equipmentPresets = c.equipmentPresets.map((r, i) => ({
      name: String(r?.name ?? base.equipmentPresets[i]?.name ?? "Plant item"),
      rateUsdH: Number(r?.rateUsdH) || 0,
      fuelLH: Number(r?.fuelLH) || 0,
    }));
  }

  return {
    marginTierPct,
    rebarDensityKgM3: rebar,
    gdtDayRates,
    manpowerTradeRatesUsdH,
    equipmentPresets,
  };
}
