/**
 * Hollow / solid blocks and pallets — ported from Python `block_data.py`.
 */

export interface BlockType {
  name: string;
  lengthM: number;
  heightM: number;
  thicknessM: number;
  blocksPerPallet: number;
  defaultCostUsd: number;
}

export const BLOCK_TYPES: Record<string, BlockType> = {
  "40 x 20 x 20 cm (hollow)": {
    name: "40 x 20 x 20 cm (hollow)",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    blocksPerPallet: 108,
    defaultCostUsd: 0.55,
  },
  "40 x 20 x 15 cm (hollow)": {
    name: "40 x 20 x 15 cm (hollow)",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.15,
    blocksPerPallet: 120,
    defaultCostUsd: 0.5,
  },
  "40 x 20 x 10 cm (hollow)": {
    name: "40 x 20 x 10 cm (hollow)",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.1,
    blocksPerPallet: 150,
    defaultCostUsd: 0.45,
  },
  "30 x 20 x 20 cm (hollow)": {
    name: "30 x 20 x 20 cm (hollow)",
    lengthM: 0.3,
    heightM: 0.2,
    thicknessM: 0.2,
    blocksPerPallet: 144,
    defaultCostUsd: 0.48,
  },
  "20 x 20 x 20 cm (hollow)": {
    name: "20 x 20 x 20 cm (hollow)",
    lengthM: 0.2,
    heightM: 0.2,
    thicknessM: 0.2,
    blocksPerPallet: 216,
    defaultCostUsd: 0.4,
  },
  "50 x 20 x 20 cm (hollow)": {
    name: "50 x 20 x 20 cm (hollow)",
    lengthM: 0.5,
    heightM: 0.2,
    thicknessM: 0.2,
    blocksPerPallet: 86,
    defaultCostUsd: 0.7,
  },
  "40 x 20 x 20 cm (solid)": {
    name: "40 x 20 x 20 cm (solid)",
    lengthM: 0.4,
    heightM: 0.2,
    thicknessM: 0.2,
    blocksPerPallet: 96,
    defaultCostUsd: 0.85,
  },
  "30 x 20 x 20 cm (solid)": {
    name: "30 x 20 x 20 cm (solid)",
    lengthM: 0.3,
    heightM: 0.2,
    thicknessM: 0.2,
    blocksPerPallet: 128,
    defaultCostUsd: 0.75,
  },
  "AAC 60 x 20 x 20 cm": {
    name: "AAC 60 x 20 x 20 cm",
    lengthM: 0.6,
    heightM: 0.2,
    thicknessM: 0.2,
    blocksPerPallet: 72,
    defaultCostUsd: 1.6,
  },
  "AAC 60 x 25 x 20 cm": {
    name: "AAC 60 x 25 x 20 cm",
    lengthM: 0.6,
    heightM: 0.25,
    thicknessM: 0.2,
    blocksPerPallet: 60,
    defaultCostUsd: 1.9,
  },
};

export function getBlockNames(): string[] {
  return Object.keys(BLOCK_TYPES);
}

export function getBlockType(name: string): BlockType {
  const b = BLOCK_TYPES[name];
  if (!b) throw new Error(`Unknown block type: ${name}`);
  return b;
}
