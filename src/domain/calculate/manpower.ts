export const MANPOWER_TRADES = [
  "General Labourer",
  "Carpenter / Formwork",
  "Steel Fixer",
  "Concrete Crew / Finisher",
  "Mason / Block Layer",
  "Electrician",
  "Plumber / Pipefitter",
  "Equipment Operator",
  "Foreman / Supervisor",
  "Site Engineer / Manager",
  "Safety Officer / HSE",
] as const;

/** Default hourly rates aligned with legacy PyQt manpower tab */
export const MANPOWER_DEFAULT_RATES_USD_H = [
  5.0, 7.0, 7.5, 6.5, 6.5, 8.0, 7.5, 8.0, 10.0, 12.0, 9.0,
] as const;

export interface ManpowerRow {
  id: string;
  trade: string;
  workers: number;
  rateUsdH: number;
  /** When null, use schedule.days for this row. */
  daysOverride: number | null;
  enabled: boolean;
}

export interface ManpowerSchedule {
  days: number;
  hoursNormalPerDay: number;
  hoursOtPerDay: number;
  otFactor: number;
}

export interface ManpowerOverheads {
  mobilisationUsd: number;
  demobilisationUsd: number;
  dailyOverheadUsd: number;
  miscUsd: number;
}

export interface ManpowerResult {
  totalManhours: number;
  totalLabourCostUsd: number;
  mobCostUsd: number;
  overheadCostUsd: number;
  grandTotalUsd: number;
  breakdownLines: string[];
}

export type ManpowerErrorCode = "BAD_DAYS" | "NEGATIVE_HOURS" | "OT_FACTOR";

export class ManpowerError extends Error {
  constructor(
    public readonly code: ManpowerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ManpowerError";
  }
}

export function defaultRateForTrade(trade: string): number {
  const idx = MANPOWER_TRADES.indexOf(trade as (typeof MANPOWER_TRADES)[number]);
  return idx >= 0 ? (MANPOWER_DEFAULT_RATES_USD_H[idx] ?? 5) : 5;
}

export function defaultManpowerRow(
  trade = "General Labourer",
  rateUsdH?: number,
): ManpowerRow {
  return {
    id: `mp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    trade,
    workers: 1,
    rateUsdH: rateUsdH ?? defaultRateForTrade(trade),
    daysOverride: null,
    enabled: true,
  };
}

export function effectiveManpowerDays(
  row: ManpowerRow,
  scheduleDays: number,
): number {
  return row.daysOverride ?? scheduleDays;
}

export function calculateManpower(opts: {
  rows: ManpowerRow[];
  schedule: ManpowerSchedule;
  overheads: ManpowerOverheads;
}): ManpowerResult {
  const { rows, schedule, overheads } = opts;

  const { days, hoursNormalPerDay, hoursOtPerDay, otFactor } = schedule;
  const {
    mobilisationUsd,
    demobilisationUsd,
    dailyOverheadUsd,
    miscUsd,
  } = overheads;

  if (days <= 0) {
    throw new ManpowerError("BAD_DAYS", "Working days must be greater than zero.");
  }

  if (hoursNormalPerDay < 0 || hoursOtPerDay < 0) {
    throw new ManpowerError("NEGATIVE_HOURS", "Working hours cannot be negative.");
  }

  if (otFactor < 1) {
    throw new ManpowerError(
      "OT_FACTOR",
      "Overtime factor should be at least 1.0.",
    );
  }

  let totalManhours = 0;
  let totalLabourCost = 0;
  const lines: string[] = [];

  lines.push(
    `Default programme: ${days} days, ${hoursNormalPerDay.toFixed(1)} h/day normal, ` +
      `${hoursOtPerDay.toFixed(1)} h/day overtime at x${otFactor.toFixed(2)}.`,
  );
  lines.push("Per-trade details:");
  lines.push("Trade | Workers | Days | Man-hours | Labour cost (USD)");
  lines.push("-".repeat(72));

  for (const row of rows) {
    if (!row.enabled) continue;

    const n = Math.trunc(row.workers);
    const rate = row.rateUsdH;
    const trade = row.trade.trim() || "Unnamed trade";
    const rowDays = effectiveManpowerDays(row, days);

    if (n <= 0 || rate <= 0 || rowDays <= 0) continue;

    const mh = n * rowDays * (hoursNormalPerDay + hoursOtPerDay);
    const normal = n * rowDays * hoursNormalPerDay * rate;
    const ot = n * rowDays * hoursOtPerDay * rate * otFactor;
    const tradeCost = normal + ot;

    totalManhours += mh;
    totalLabourCost += tradeCost;
    const daysNote =
      row.daysOverride !== null ? `${rowDays}` : `${rowDays} (default)`;
    lines.push(
      `${trade} | ${n} | ${daysNote} | ${mh.toFixed(1)} h | $${tradeCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    );
  }

  const mobCost = mobilisationUsd + demobilisationUsd;
  const overheadCost = dailyOverheadUsd * days + miscUsd;
  const grand = totalLabourCost + mobCost + overheadCost;

  lines.push("");
  lines.push(
    `Total labour cost: $${totalLabourCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  );
  lines.push(`Mobilisation + demobilisation: $${mobCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(`Overhead + misc: $${overheadCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  lines.push(
    `Grand total manpower-related cost: $${grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  );

  return {
    totalManhours,
    totalLabourCostUsd: totalLabourCost,
    mobCostUsd: mobCost,
    overheadCostUsd: overheadCost,
    grandTotalUsd: grand,
    breakdownLines: lines,
  };
}
