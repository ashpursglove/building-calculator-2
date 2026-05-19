/**
 * Central reactor configuration that drives multiple disciplines.
 *
 * A reactor in the GDT race-track geometry has a rectangular section of length
 * `Lrect = lengthTotalM - widthM` capped by a semicircle on each end of radius
 * `R = widthM / 2`, giving a footprint = `widthM * Lrect + π R²`.
 *
 * Excavation footprint extends each reactor by `overdigM` on every side and is
 * cut to a depth of `excavationDepthCm` below natural grade. The bedding /
 * concrete footing sits inside that excavation.
 */

import type { CostCenter, MarginTier } from "@/domain/calculate/lineItems";

export interface ReactorConfig {
  /** Number of reactors on this site. Drives per-reactor line items. */
  count: number;

  /** Overall reactor length (outer race-track L). */
  lengthM: number;
  /** Reactor width (also = diameter of the end semicircles). */
  widthM: number;
  /** Reactor wall height above slab. */
  wallHeightM: number;

  /** Working depth of the reactor (used for liner area + volume estimates). */
  workingDepthM: number;

  /** Excavation depth below grade (cm), drives Earthworks when linked. */
  excavationDepthCm: number;
  /** Concrete bedding / footing slab thickness under the reactor (cm). */
  footingThicknessCm: number;
  /** Sweet sand bedding under the liner (cm) — informational only here. */
  sandBeddingCm: number;
  /** Excavation over-dig per side (m), drives Earthworks when linked. */
  overdigM: number;

  /** Default quote classification for per-reactor CapEx lines (see Reactors tab). */
  costCenter: CostCenter;
  marginTier: MarginTier;
}

export interface ReactorDerivedGeometry {
  /** Single reactor footprint (race-track). */
  footprintM2: number;
  /** Internal plan area (same as footprint for our envelope). */
  planAreaPerReactorM2: number;
  /** Sum of footprints over all reactors. */
  totalFootprintM2: number;
  /** Footprint enlarged by `overdigM` per side (single reactor). */
  excavationFootprintPerM2: number;
  /** Sum of excavation footprints over all reactors. */
  totalExcavationFootprintM2: number;
  /** Total wet excavation volume (m³) across the site. */
  totalExcavationVolumeM3: number;
  /** Wetted liner surface area for ONE reactor (base + side walls). */
  linerAreaPerReactorM2: number;
  /** Total liner surface area across all reactors. */
  totalLinerAreaM2: number;
  /** Internal water-holding volume of ONE reactor at working depth. */
  workingVolumePerReactorM3: number;
  /** Site-wide reactor working volume. */
  totalWorkingVolumeM3: number;
}

export function defaultReactorConfig(): ReactorConfig {
  return {
    count: 0,
    lengthM: 100,
    widthM: 5,
    wallHeightM: 0.5,
    workingDepthM: 0.3,
    excavationDepthCm: 60,
    footingThicknessCm: 0,
    sandBeddingCm: 0,
    overdigM: 0.5,
    costCenter: "gdt",
    marginTier: "none",
  };
}

export function computeReactorGeometry(
  cfg: ReactorConfig,
): ReactorDerivedGeometry {
  const safeCount = Math.max(0, Math.trunc(cfg.count));
  const L = Math.max(0, cfg.lengthM);
  const W = Math.max(0, cfg.widthM);
  const R = W / 2;
  const Lrect = Math.max(0, L - W);
  const footprint = Lrect * W + Math.PI * R * R;
  const totalFootprint = footprint * safeCount;

  const over = Math.max(0, cfg.overdigM);
  const excLength = L + 2 * over;
  const excWidth = W + 2 * over;
  const excRect = Math.max(0, excLength - excWidth) * excWidth;
  const excR = excWidth / 2;
  const excFootprint = excRect + Math.PI * excR * excR;
  const totalExcFootprint = excFootprint * safeCount;

  const Hexc = Math.max(0, cfg.excavationDepthCm) / 100;
  const totalExcVolume = totalExcFootprint * Hexc;

  const linerWalls = (2 * Lrect + 2 * Math.PI * R) * Math.max(0, cfg.workingDepthM);
  const linerBase = footprint;
  const linerPer = linerBase + linerWalls;
  const totalLiner = linerPer * safeCount;

  const workingPerR = footprint * Math.max(0, cfg.workingDepthM);
  const totalWorking = workingPerR * safeCount;

  return {
    footprintM2: footprint,
    planAreaPerReactorM2: footprint,
    totalFootprintM2: totalFootprint,
    excavationFootprintPerM2: excFootprint,
    totalExcavationFootprintM2: totalExcFootprint,
    totalExcavationVolumeM3: totalExcVolume,
    linerAreaPerReactorM2: linerPer,
    totalLinerAreaM2: totalLiner,
    workingVolumePerReactorM3: workingPerR,
    totalWorkingVolumeM3: totalWorking,
  };
}
