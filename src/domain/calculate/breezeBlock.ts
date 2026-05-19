import type { BlockType } from "@/domain/blockTypes";

export interface BreezeWallGroup {
  id: string;
  label: string;
  /** Wall length (m). */
  lengthM: number;
  /** Wall height (m). */
  heightM: number;
  /** Number of identical walls in this group. */
  count: number;
  enabled: boolean;
}

export interface BreezeArcGroup {
  id: string;
  label: string;
  /** Arc radius (m). */
  radiusM: number;
  /** Arc wall height (m). */
  heightM: number;
  /** Number of identical half-arc walls. */
  count: number;
  enabled: boolean;
}

export interface BreezeInputs {
  block: BlockType;
  costPerBlock: number;
  walls: BreezeWallGroup[];
  arcs: BreezeArcGroup[];
  /** Reactor walls supplied by the central Reactors tab. */
  reactorLengthM: number;
  reactorWidthM: number;
  reactorHeightM: number;
  reactorCount: number;
}

export interface BreezeGroupBreakdown {
  id: string;
  label: string;
  areaM2: number;
  blocks: number;
  costUsd: number;
}

export interface BreezeResult {
  wallAreaM2: number;
  arcAreaM2: number;
  reactorAreaM2: number;
  totalAreaM2: number;
  blocksRequired: number;
  palletsRequired: number;
  leftoverBlocks: number;
  totalCostUsd: number;
  /** Per-group breakdown for the audit trail / PDF report. */
  wallGroups: BreezeGroupBreakdown[];
  arcGroups: BreezeGroupBreakdown[];
}

export function calculateBreezeBlock(inputs: BreezeInputs): BreezeResult {
  const {
    block,
    costPerBlock,
    walls,
    arcs,
    reactorLengthM,
    reactorWidthM,
    reactorHeightM,
    reactorCount,
  } = inputs;
  const face = block.lengthM * block.heightM;

  const buildBreakdown = (
    id: string,
    label: string,
    area: number,
  ): BreezeGroupBreakdown => {
    const blocks = face > 0 && area > 0 ? Math.ceil(area / face) : 0;
    return { id, label, areaM2: area, blocks, costUsd: blocks * costPerBlock };
  };

  const wallGroups: BreezeGroupBreakdown[] = [];
  let wallArea = 0;
  for (const w of walls) {
    if (!w.enabled) continue;
    if (w.lengthM > 0 && w.heightM > 0 && w.count > 0) {
      const a = w.lengthM * w.heightM * w.count;
      wallArea += a;
      wallGroups.push(buildBreakdown(w.id, w.label || "Wall group", a));
    } else {
      wallGroups.push(buildBreakdown(w.id, w.label || "Wall group", 0));
    }
  }

  const arcGroups: BreezeGroupBreakdown[] = [];
  let arcAreaTotal = 0;
  for (const a of arcs) {
    if (!a.enabled) continue;
    if (a.radiusM > 0 && a.heightM > 0 && a.count > 0) {
      const area = Math.PI * a.radiusM * a.heightM * a.count;
      arcAreaTotal += area;
      arcGroups.push(buildBreakdown(a.id, a.label || "Arc group", area));
    } else {
      arcGroups.push(buildBreakdown(a.id, a.label || "Arc group", 0));
    }
  }

  let reactorAreaTotal = 0;
  if (
    reactorLengthM > 0 &&
    reactorWidthM > 0 &&
    reactorHeightM > 0 &&
    reactorCount > 0
  ) {
    const R = reactorWidthM / 2;
    const straightLength = 3 * reactorLengthM;
    const archLength = 2 * Math.PI * R;
    const wallLengthPerReactor = straightLength + archLength;
    reactorAreaTotal = wallLengthPerReactor * reactorHeightM * reactorCount;
  }

  const totalAreaM2 = wallArea + arcAreaTotal + reactorAreaTotal;
  const blocksRequired =
    face > 0 && totalAreaM2 > 0 ? Math.ceil(totalAreaM2 / face) : 0;

  const bpp = Math.max(1, block.blocksPerPallet);
  let palletsRequired = 0;
  let leftoverBlocks = 0;
  if (blocksRequired > 0) {
    palletsRequired = Math.ceil(blocksRequired / bpp);
    leftoverBlocks = palletsRequired * bpp - blocksRequired;
  }

  const totalCostUsd = blocksRequired * costPerBlock;

  return {
    wallAreaM2: wallArea,
    arcAreaM2: arcAreaTotal,
    reactorAreaM2: reactorAreaTotal,
    totalAreaM2,
    blocksRequired,
    palletsRequired,
    leftoverBlocks,
    totalCostUsd,
    wallGroups,
    arcGroups,
  };
}

export function defaultBreezeWallGroup(label = "Boundary wall"): BreezeWallGroup {
  return {
    id: `wall-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    label,
    lengthM: 0,
    heightM: 0,
    count: 0,
    enabled: true,
  };
}

export function defaultBreezeArcGroup(label = "Corner arc"): BreezeArcGroup {
  return {
    id: `arc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    label,
    radiusM: 0,
    heightM: 0,
    count: 1,
    enabled: true,
  };
}

export function seedBreezeWallGroups(): BreezeWallGroup[] {
  return [
    {
      id: "wall-default",
      label: "Boundary / dividing wall",
      lengthM: 0,
      heightM: 0,
      count: 0,
      enabled: true,
    },
  ];
}

export function seedBreezeArcGroups(): BreezeArcGroup[] {
  return [
    {
      id: "arc-default",
      label: "Corner arc",
      radiusM: 0,
      heightM: 0,
      count: 0,
      enabled: true,
    },
  ];
}
