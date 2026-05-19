export interface SweetSandInputs {
  lengthTotalM: number;
  widthM: number;
  fillHeightCm: number;
  cornerRadiusCm: number;
  bulkDensityKgM3: number;
  costPerTonneUsd: number;
}

export interface SweetSandResult {
  rectLengthM: number;
  arcRadiusM: number;
  planAreaM2: number;
  volumeBaseM3: number;
  volumeCornerM3: number;
  volumeTotalM3: number;
  weightKg: number;
  weightTons: number;
  totalCostUsd: number;
}

export type SweetSandErrorCode = "BAD_INPUTS" | "LENGTH_NOT_GT_WIDTH";

export class SweetSandError extends Error {
  constructor(
    public readonly code: SweetSandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SweetSandError";
  }
}

export function calculateSweetSand(
  inputs: SweetSandInputs,
): SweetSandResult {
  const {
    lengthTotalM,
    widthM,
    fillHeightCm,
    cornerRadiusCm,
    bulkDensityKgM3,
    costPerTonneUsd,
  } = inputs;

  const H = fillHeightCm / 100;
  const rCorner = cornerRadiusCm / 100;

  if (
    lengthTotalM <= 0 ||
    widthM <= 0 ||
    H <= 0 ||
    bulkDensityKgM3 <= 0 ||
    costPerTonneUsd < 0
  ) {
    throw new SweetSandError(
      "BAD_INPUTS",
      "Length, width, fill height and density must be > 0; cost/tonne must be ≥ 0.",
    );
  }

  if (!(lengthTotalM > widthM)) {
    throw new SweetSandError(
      "LENGTH_NOT_GT_WIDTH",
      "Overall length (L) must be greater than width (W) so a straight section exists.",
    );
  }

  const Lrect = lengthTotalM - widthM;
  const R = widthM / 2;
  const areaRect = widthM * Lrect;
  const areaCircle = Math.PI * R * R;
  const planAreaM2 = areaRect + areaCircle;
  const volumeBaseM3 = planAreaM2 * H;

  let volumeCornerM3 = 0;
  if (rCorner > 0) {
    const perimeterOuter = 2 * Lrect + 2 * Math.PI * R;
    const perimeterCenter = 2 * Lrect;
    const perimeterTotal = perimeterOuter + perimeterCenter;
    const filletCrossSection = (Math.PI * rCorner * rCorner) / 4;
    volumeCornerM3 = perimeterTotal * filletCrossSection;
  }

  const volumeTotalM3 = volumeBaseM3 + volumeCornerM3;
  const weightKg = volumeTotalM3 * bulkDensityKgM3;
  const weightTons = weightKg / 1000;
  const totalCostUsd = weightTons * costPerTonneUsd;

  return {
    rectLengthM: Lrect,
    arcRadiusM: R,
    planAreaM2,
    volumeBaseM3,
    volumeCornerM3,
    volumeTotalM3,
    weightKg,
    weightTons,
    totalCostUsd,
  };
}
