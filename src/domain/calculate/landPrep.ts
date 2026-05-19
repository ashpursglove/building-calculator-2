export interface EarthworksPlatform {
  id: string;
  label: string;
  areaM2: number;
  depthCm: number;
  enabled: boolean;
}

export interface EarthworksTrenchGroup {
  id: string;
  label: string;
  lengthM: number;
  widthM: number;
  depthCm: number;
  count: number;
  enabled: boolean;
}

export interface LandPrepInputs {
  platforms: EarthworksPlatform[];
  trenches: EarthworksTrenchGroup[];
  liftThicknessCm: number;
  passesPerLift: number;
  costPerM3Cut: number;
  costPerM2Pass: number;
  /**
   * Optional bulk excavation volume injected from the Reactors tab when the
   * "use reactor data" toggle is on. Added to platform + trench volumes.
   */
  reactorExcavationVolumeM3?: number;
  /**
   * Optional bulk compaction area added under reactor pads (m²).
   */
  reactorCompactionAreaM2?: number;
}

export interface EarthworksGroupBreakdown {
  id: string;
  label: string;
  volumeM3: number;
  compactionAreaM2: number;
  costUsd: number;
}

export interface LandPrepResult {
  platformVolumeM3: number;
  trenchVolumeM3: number;
  /** Bulk excavation volume sourced from the Reactors tab (0 if not linked). */
  reactorVolumeM3: number;
  totalCutVolumeM3: number;
  platformCompAreaM2: number;
  trenchCompAreaM2: number;
  /** Reactor pad compaction area sourced from Reactors tab (0 if not linked). */
  reactorCompAreaM2: number;
  totalCompAreaM2: number;
  /** Lift count derived from the largest platform depth (representative). */
  liftsPlatform: number;
  /** Lift count derived from the largest trench depth (representative). */
  liftsTrench: number;
  totalAreaPassesM2: number;
  cutCostUsd: number;
  compactionCostUsd: number;
  totalCostUsd: number;
  platformGroups: EarthworksGroupBreakdown[];
  trenchGroups: EarthworksGroupBreakdown[];
}

export type LandPrepErrorCode =
  | "NEGATIVE_DIM"
  | "BAD_LIFT"
  | "BAD_PASSES";

export class LandPrepError extends Error {
  constructor(
    public readonly code: LandPrepErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "LandPrepError";
  }
}

/**
 * Multi-group earthworks calculation:
 * - Each platform: V = area × depth, compaction footprint = area.
 * - Each trench group: V = L × W × D × count, compaction = base + side strips.
 * - Reactor link adds bulk volume + compaction area from the Reactors tab.
 * - Compaction passes use a representative lift count (deepest dig in each set).
 */
export function calculateLandPrep(inputs: LandPrepInputs): LandPrepResult {
  const {
    platforms,
    trenches,
    liftThicknessCm,
    passesPerLift,
    costPerM3Cut,
    costPerM2Pass,
    reactorExcavationVolumeM3 = 0,
    reactorCompactionAreaM2 = 0,
  } = inputs;

  const Hlift = liftThicknessCm / 100;
  if (Hlift <= 0) {
    throw new LandPrepError("BAD_LIFT", "Compaction lift thickness must be > 0.");
  }
  if (passesPerLift <= 0) {
    throw new LandPrepError(
      "BAD_PASSES",
      "Passes per lift must be at least 1.",
    );
  }

  let Vplatform = 0;
  let AcompPlatform = 0;
  let maxPlatformDepthM = 0;
  const platformGroups: EarthworksGroupBreakdown[] = [];
  for (const p of platforms) {
    if (!p.enabled) {
      platformGroups.push({
        id: p.id,
        label: p.label || "Platform",
        volumeM3: 0,
        compactionAreaM2: 0,
        costUsd: 0,
      });
      continue;
    }
    if (p.areaM2 < 0 || p.depthCm < 0) {
      throw new LandPrepError(
        "NEGATIVE_DIM",
        `Platform "${p.label}": area and depth cannot be negative.`,
      );
    }
    const H = p.depthCm / 100;
    const V = p.areaM2 * H;
    Vplatform += V;
    AcompPlatform += p.areaM2;
    maxPlatformDepthM = Math.max(maxPlatformDepthM, H);
    platformGroups.push({
      id: p.id,
      label: p.label || "Platform",
      volumeM3: V,
      compactionAreaM2: p.areaM2,
      costUsd: 0,
    });
  }

  let Vtrench = 0;
  let AcompTrench = 0;
  let maxTrenchDepthM = 0;
  const trenchGroups: EarthworksGroupBreakdown[] = [];
  for (const t of trenches) {
    if (!t.enabled) {
      trenchGroups.push({
        id: t.id,
        label: t.label || "Trench",
        volumeM3: 0,
        compactionAreaM2: 0,
        costUsd: 0,
      });
      continue;
    }
    if (
      t.lengthM < 0 ||
      t.widthM < 0 ||
      t.depthCm < 0 ||
      t.count < 0
    ) {
      throw new LandPrepError(
        "NEGATIVE_DIM",
        `Trench "${t.label}": dimensions / count cannot be negative.`,
      );
    }
    if (
      t.count > 0 &&
      t.lengthM > 0 &&
      t.widthM > 0 &&
      t.depthCm > 0
    ) {
      const H = t.depthCm / 100;
      const V = t.lengthM * t.widthM * H * t.count;
      const base = t.lengthM * t.widthM * t.count;
      const sides = 2 * t.lengthM * H * t.count;
      Vtrench += V;
      AcompTrench += base + sides;
      maxTrenchDepthM = Math.max(maxTrenchDepthM, H);
      trenchGroups.push({
        id: t.id,
        label: t.label || "Trench",
        volumeM3: V,
        compactionAreaM2: base + sides,
        costUsd: 0,
      });
    } else {
      trenchGroups.push({
        id: t.id,
        label: t.label || "Trench",
        volumeM3: 0,
        compactionAreaM2: 0,
        costUsd: 0,
      });
    }
  }

  const Vreactor = Math.max(0, reactorExcavationVolumeM3);
  const AcompReactor = Math.max(0, reactorCompactionAreaM2);

  const Vcut = Vplatform + Vtrench + Vreactor;
  const AcompTotal = AcompPlatform + AcompTrench + AcompReactor;

  const liftsPlatform =
    maxPlatformDepthM > 0 ? Math.ceil(maxPlatformDepthM / Hlift) : 0;
  const liftsTrench =
    maxTrenchDepthM > 0 ? Math.ceil(maxTrenchDepthM / Hlift) : 0;

  const ApostPlatform = AcompPlatform * liftsPlatform * passesPerLift;
  const ApostTrench = AcompTrench * liftsTrench * passesPerLift;
  const ApostReactor = AcompReactor * liftsPlatform * passesPerLift;
  const ApostTotal = ApostPlatform + ApostTrench + ApostReactor;

  const cutCostUsd = Vcut * costPerM3Cut;
  const compactionCostUsd = ApostTotal * costPerM2Pass;
  const totalCostUsd = cutCostUsd + compactionCostUsd;

  // Distribute proportional cost back into the breakdowns for the report.
  const distributeCost = (group: EarthworksGroupBreakdown): void => {
    if (Vcut <= 0 && AcompTotal <= 0) {
      group.costUsd = 0;
      return;
    }
    const vShare = Vcut > 0 ? group.volumeM3 / Vcut : 0;
    const aShare = AcompTotal > 0 ? group.compactionAreaM2 / AcompTotal : 0;
    group.costUsd = vShare * cutCostUsd + aShare * compactionCostUsd;
  };
  platformGroups.forEach(distributeCost);
  trenchGroups.forEach(distributeCost);

  return {
    platformVolumeM3: Vplatform,
    trenchVolumeM3: Vtrench,
    reactorVolumeM3: Vreactor,
    totalCutVolumeM3: Vcut,
    platformCompAreaM2: AcompPlatform,
    trenchCompAreaM2: AcompTrench,
    reactorCompAreaM2: AcompReactor,
    totalCompAreaM2: AcompTotal,
    liftsPlatform,
    liftsTrench,
    totalAreaPassesM2: ApostTotal,
    cutCostUsd,
    compactionCostUsd,
    totalCostUsd,
    platformGroups,
    trenchGroups,
  };
}

export function defaultPlatform(label = "Platform"): EarthworksPlatform {
  return {
    id: `plat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    label,
    areaM2: 0,
    depthCm: 0,
    enabled: true,
  };
}

export function defaultTrenchGroup(label = "Service trench"): EarthworksTrenchGroup {
  return {
    id: `trench-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    label,
    lengthM: 0,
    widthM: 0,
    depthCm: 0,
    count: 0,
    enabled: true,
  };
}

export function seedPlatforms(): EarthworksPlatform[] {
  return [
    {
      id: "plat-default",
      label: "Main platform cut",
      areaM2: 0,
      depthCm: 0,
      enabled: true,
    },
  ];
}

export function seedTrenches(): EarthworksTrenchGroup[] {
  return [
    {
      id: "trench-default",
      label: "Electrical / plumbing trench",
      lengthM: 0,
      widthM: 0,
      depthCm: 0,
      count: 0,
      enabled: true,
    },
  ];
}
