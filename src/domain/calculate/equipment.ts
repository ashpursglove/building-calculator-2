/** Default equipment placeholders from legacy PyQt equipment tab */

export interface EquipmentPresetRow {
  name: string;
  rateUsdH: number;
  fuelLH: number;
}

export const EQUIPMENT_DEFAULT_ROWS: EquipmentPresetRow[] = [
  { name: "20t Excavator", rateUsdH: 90, fuelLH: 18 },
  { name: "Wheel Loader", rateUsdH: 80, fuelLH: 15 },
  { name: "Vibratory Roller", rateUsdH: 60, fuelLH: 10 },
  { name: "Water Tanker", rateUsdH: 55, fuelLH: 8 },
  { name: "Concrete Pump", rateUsdH: 120, fuelLH: 20 },
  { name: "Mobile Crane", rateUsdH: 150, fuelLH: 22 },
  { name: "Tipper Truck", rateUsdH: 70, fuelLH: 14 },
  { name: "Telehandler / Forklift", rateUsdH: 65, fuelLH: 9 },
];

export interface EquipmentRowInputs {
  name: string;
  count: number;
  rateUsdH: number;
  fuelLH: number;
  utilPct: number;
}

export interface EquipmentResult {
  totalHours: number;
  totalHireCostUsd: number;
  totalFuelLitres: number;
  totalFuelCostUsd: number;
  mobCostUsd: number;
  overheadCostUsd: number;
  grandTotalUsd: number;
  breakdownLines: string[];
}

export type EquipmentErrorCode = "BAD_SCHEDULE";

export class EquipmentError extends Error {
  constructor(
    public readonly code: EquipmentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EquipmentError";
  }
}

export function calculateEquipment(opts: {
  rows: EquipmentRowInputs[];
  days: number;
  hoursPerDay: number;
  fuelPriceUsdL: number;
  mobilisationUsd: number;
  demobilisationUsd: number;
  dailyPlantOverheadUsd: number;
  miscPlantUsd: number;
}): EquipmentResult {
  const {
    rows,
    days,
    hoursPerDay,
    fuelPriceUsdL,
    mobilisationUsd,
    demobilisationUsd,
    dailyPlantOverheadUsd,
    miscPlantUsd,
  } = opts;

  if (days <= 0) {
    throw new EquipmentError("BAD_SCHEDULE", "Working days must be greater than zero.");
  }

  if (hoursPerDay < 0 || fuelPriceUsdL < 0) {
    throw new EquipmentError(
      "BAD_SCHEDULE",
      "Operating hours/day and fuel price cannot be negative.",
    );
  }

  const scheduleHours = days * hoursPerDay;

  let totalHours = 0;
  let hire = 0;
  let litres = 0;
  let fuelCost = 0;
  const lines: string[] = [];

  lines.push(
    `Schedule: ${days} days × ${hoursPerDay.toFixed(1)} h/day = ${scheduleHours.toFixed(1)} h per unit.`,
  );
  lines.push(`Fuel price: $${fuelPriceUsdL.toFixed(3)} per litre.`);
  lines.push("");
  lines.push("Per-equipment details:");
  lines.push("Name | Units | Utilisation | Hours | Fuel (L) | Hire cost (USD) | Fuel cost (USD)");
  lines.push("-".repeat(90));

  for (let i = 0; i < rows.length; i++) {
    let name = rows[i].name.trim();
    if (!name) name = `Item ${i + 1}`;
    const count = Math.max(0, Math.trunc(rows[i].count));
    const rate = rows[i].rateUsdH;
    const lph = rows[i].fuelLH;
    const util = rows[i].utilPct;

    if (count <= 0 || rate <= 0 || util <= 0 || hoursPerDay === 0) {
      continue;
    }

    const u = util / 100;
    const hoursEffective = count * scheduleHours * u;
    const hireRow = hoursEffective * rate;
    const fuelRow = hoursEffective * lph;

    totalHours += hoursEffective;
    hire += hireRow;
    litres += fuelRow;
    fuelCost += fuelRow * fuelPriceUsdL;

    lines.push(
      `${name} | ${count} | ${util.toFixed(1)}% | ${hoursEffective.toFixed(1)} h | ` +
        `${fuelRow.toFixed(1)} L | $${hireRow.toFixed(2)} | $${(fuelRow * fuelPriceUsdL).toFixed(2)}`,
    );
  }

  const mob = mobilisationUsd + demobilisationUsd;
  const oh = dailyPlantOverheadUsd * days + miscPlantUsd;
  const grand = hire + fuelCost + mob + oh;

  lines.push("");
  lines.push(`Total operating hours (all machines): ${totalHours.toFixed(1)} h`);
  lines.push(`Total hire cost: $${hire.toFixed(2)}`);
  lines.push(`Total fuel consumption: ${litres.toFixed(1)} L`);
  lines.push(`Total fuel cost: $${fuelCost.toFixed(2)}`);
  lines.push(`Mobilisation + demobilisation: $${mob.toFixed(2)}`);
  lines.push(`Plant overhead + misc: $${oh.toFixed(2)}`);
  lines.push(`Grand total equipment cost: $${grand.toFixed(2)}`);

  return {
    totalHours,
    totalHireCostUsd: hire,
    totalFuelLitres: litres,
    totalFuelCostUsd: fuelCost,
    mobCostUsd: mob,
    overheadCostUsd: oh,
    grandTotalUsd: grand,
    breakdownLines: lines,
  };
}
