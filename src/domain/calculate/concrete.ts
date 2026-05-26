/** Element type combo index aligned with legacy PyQt concrete tab. */
export type ConcreteElementType = "slab" | "strip" | "wall" | "isolated";

export interface ConcreteMaterials {
  densityKgM3: number;
  costUsdM3: number;
  rebarKgM3: number;
  rebarCostUsdT: number;
}

/** Typical rebar content levels (kg steel per m³ of concrete). */
export const REBAR_DENSITY_PRESETS = {
  low: {
    label: "Low",
    kgM3: 80,
    help: "Lightly reinforced — thin slabs, minimum mesh, simple footings (~80 kg/m³).",
  },
  medium: {
    label: "Medium",
    kgM3: 100,
    help: "Typical site concrete — standard footings, slabs and general pours (~100 kg/m³).",
  },
  high: {
    label: "High",
    kgM3: 150,
    help: "Heavily reinforced — walls, loaded footings, retaining elements (~150 kg/m³).",
  },
} as const;

export type RebarDensityPresetId = keyof typeof REBAR_DENSITY_PRESETS;

export function rebarDensityPresetForValue(kgM3: number): RebarDensityPresetId | "custom" {
  for (const [id, preset] of Object.entries(REBAR_DENSITY_PRESETS) as [
    RebarDensityPresetId,
    (typeof REBAR_DENSITY_PRESETS)[RebarDensityPresetId],
  ][]) {
    if (kgM3 === preset.kgM3) return id;
  }
  return "custom";
}

/** @deprecated Legacy single-element geometry blob — used only for migration. */
export interface ConcreteGeometry {
  slab: {
    lengthM: number;
    widthM: number;
    thicknessCm: number;
    count: number;
  };
  strip: {
    lengthM: number;
    widthM: number;
    thicknessCm: number;
  };
  wall: {
    lengthM: number;
    heightM: number;
    thicknessCm: number;
    count: number;
  };
  iso: {
    lengthM: number;
    widthM: number;
    thicknessCm: number;
    count: number;
  };
}

/** One concrete pour / element on the quote. */
export interface ConcreteElementItem {
  id: string;
  label: string;
  elementType: ConcreteElementType;
  enabled: boolean;
  lengthM: number;
  widthM: number;
  /** Wall height (m); unused for strip. */
  heightM: number;
  thicknessCm: number;
  /** Slab / wall / isolated footing count; ignored for strip. */
  count: number;
}

export interface ConcreteElementResult {
  id: string;
  label: string;
  elementType: ConcreteElementType;
  volumeM3: number;
  formAreaM2: number;
  concWeightKg: number;
  rebarKg: number;
  rebarTons: number;
  concCostUsd: number;
  rebarCostUsd: number;
  totalCostUsd: number;
}

export interface ConcreteAggregateResult {
  elements: ConcreteElementResult[];
  volumeM3: number;
  formAreaM2: number;
  concWeightKg: number;
  rebarKg: number;
  rebarTons: number;
  concCostUsd: number;
  rebarCostUsd: number;
  totalCostUsd: number;
}

/** @deprecated Single-element result — kept for type compatibility during migration. */
export interface ConcreteResult {
  elementType: ConcreteElementType;
  volumeM3: number;
  formAreaM2: number;
  concWeightKg: number;
  rebarKg: number;
  rebarTons: number;
  concCostUsd: number;
  rebarCostUsd: number;
  totalCostUsd: number;
}

export type ConcreteErrorCode = "BAD_MATERIALS" | "BAD_GEOMETRY";

export class ConcreteError extends Error {
  constructor(
    public readonly code: ConcreteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ConcreteError";
  }
}

function geometryFromItem(item: ConcreteElementItem): ConcreteGeometry {
  const t = item.thicknessCm;
  const L = item.lengthM;
  const W = item.widthM;
  const H = item.heightM;
  const N = Math.max(0, Math.trunc(item.count));
  switch (item.elementType) {
    case "slab":
      return {
        slab: { lengthM: L, widthM: W, thicknessCm: t, count: N },
        strip: { lengthM: 0, widthM: 0, thicknessCm: 0 },
        wall: { lengthM: 0, heightM: 0, thicknessCm: 0, count: 1 },
        iso: { lengthM: 0, widthM: 0, thicknessCm: 0, count: 1 },
      };
    case "strip":
      return {
        slab: { lengthM: 0, widthM: 0, thicknessCm: 0, count: 1 },
        strip: { lengthM: L, widthM: W, thicknessCm: t },
        wall: { lengthM: 0, heightM: 0, thicknessCm: 0, count: 1 },
        iso: { lengthM: 0, widthM: 0, thicknessCm: 0, count: 1 },
      };
    case "wall":
      return {
        slab: { lengthM: 0, widthM: 0, thicknessCm: 0, count: 1 },
        strip: { lengthM: 0, widthM: 0, thicknessCm: 0 },
        wall: { lengthM: L, heightM: H, thicknessCm: t, count: N },
        iso: { lengthM: 0, widthM: 0, thicknessCm: 0, count: 1 },
      };
    default:
      return {
        slab: { lengthM: 0, widthM: 0, thicknessCm: 0, count: 1 },
        strip: { lengthM: 0, widthM: 0, thicknessCm: 0 },
        wall: { lengthM: 0, heightM: 0, thicknessCm: 0, count: 1 },
        iso: { lengthM: L, widthM: W, thicknessCm: t, count: N },
      };
  }
}

export function calculateConcreteElement(
  item: ConcreteElementItem,
  materials: ConcreteMaterials,
): ConcreteElementResult {
  const base = calculateConcrete({
    elementType: item.elementType,
    geometry: geometryFromItem(item),
    materials,
  });
  return {
    id: item.id,
    label: item.label,
    elementType: item.elementType,
    volumeM3: base.volumeM3,
    formAreaM2: base.formAreaM2,
    concWeightKg: base.concWeightKg,
    rebarKg: base.rebarKg,
    rebarTons: base.rebarTons,
    concCostUsd: base.concCostUsd,
    rebarCostUsd: base.rebarCostUsd,
    totalCostUsd: base.totalCostUsd,
  };
}

export function calculateConcreteElements(
  items: readonly ConcreteElementItem[],
  materials: ConcreteMaterials,
): ConcreteAggregateResult {
  const elements: ConcreteElementResult[] = [];
  let volumeM3 = 0;
  let formAreaM2 = 0;
  let concWeightKg = 0;
  let rebarKg = 0;
  let concCostUsd = 0;
  let rebarCostUsd = 0;

  for (const item of items) {
    if (!item.enabled) continue;
    const row = calculateConcreteElement(item, materials);
    elements.push(row);
    volumeM3 += row.volumeM3;
    formAreaM2 += row.formAreaM2;
    concWeightKg += row.concWeightKg;
    rebarKg += row.rebarKg;
    concCostUsd += row.concCostUsd;
    rebarCostUsd += row.rebarCostUsd;
  }

  return {
    elements,
    volumeM3,
    formAreaM2,
    concWeightKg,
    rebarKg,
    rebarTons: rebarKg / 1000,
    concCostUsd,
    rebarCostUsd,
    totalCostUsd: concCostUsd + rebarCostUsd,
  };
}

export function defaultConcreteElement(
  elementType: ConcreteElementType = "slab",
  label?: string,
): ConcreteElementItem {
  const labels: Record<ConcreteElementType, string> = {
    slab: "Slab / base",
    strip: "Strip footing",
    wall: "Wall",
    isolated: "Isolated footing",
  };
  return {
    id: `conc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    label: label ?? labels[elementType],
    elementType,
    enabled: true,
    lengthM: 0,
    widthM: 0,
    heightM: 0,
    thicknessCm: 0,
    count: 0,
  };
}

export function seedConcreteElements(): ConcreteElementItem[] {
  return [defaultConcreteElement("slab", "Slab / base")];
}

export function calculateConcrete(opts: {
  elementType: ConcreteElementType;
  geometry: ConcreteGeometry;
  materials: ConcreteMaterials;
}): ConcreteResult {
  const { elementType, geometry, materials } = opts;

  const { densityKgM3, costUsdM3, rebarKgM3, rebarCostUsdT } = materials;

  if (densityKgM3 <= 0 || costUsdM3 < 0 || rebarKgM3 < 0 || rebarCostUsdT < 0) {
    throw new ConcreteError(
      "BAD_MATERIALS",
      "Density must be > 0; costs and rebar intensity must be ≥ 0.",
    );
  }

  let volumeM3 = 0;
  let formAreaM2 = 0;

  if (elementType === "slab") {
    const { lengthM: L, widthM: W, thicknessCm: Tcm, count: N } =
      geometry.slab;
    const T = Tcm / 100;
    if (L <= 0 || W <= 0 || T <= 0 || N <= 0) {
      throw new ConcreteError(
        "BAD_GEOMETRY",
        "Slab: length, width, thickness and count must all be > 0.",
      );
    }
    volumeM3 = L * W * T * N;
    formAreaM2 = 2 * (L + W) * T * N;
  } else if (elementType === "strip") {
    const { lengthM: L, widthM: W, thicknessCm: Tcm } = geometry.strip;
    const T = Tcm / 100;
    if (L <= 0 || W <= 0 || T <= 0) {
      throw new ConcreteError(
        "BAD_GEOMETRY",
        "Strip footing: length, width and thickness must all be > 0.",
      );
    }
    volumeM3 = L * W * T;
    formAreaM2 = 2 * L * T;
  } else if (elementType === "wall") {
    const { lengthM: L, heightM: H, thicknessCm: Tcm, count: N } =
      geometry.wall;
    const T = Tcm / 100;
    if (L <= 0 || H <= 0 || T <= 0 || N <= 0) {
      throw new ConcreteError(
        "BAD_GEOMETRY",
        "Wall: length, height, thickness and count must all be > 0.",
      );
    }
    volumeM3 = L * H * T * N;
    formAreaM2 = 2 * L * H * N;
  } else {
    const { lengthM: L, widthM: W, thicknessCm: Tcm, count: N } = geometry.iso;
    const T = Tcm / 100;
    if (L <= 0 || W <= 0 || T <= 0 || N <= 0) {
      throw new ConcreteError(
        "BAD_GEOMETRY",
        "Isolated footing: dimensions and count must all be > 0.",
      );
    }
    volumeM3 = L * W * T * N;
    formAreaM2 = 2 * (L + W) * T * N;
  }

  const concWeightKg = volumeM3 * densityKgM3;
  const concCostUsd = volumeM3 * costUsdM3;
  const rebarKg = volumeM3 * rebarKgM3;
  const rebarTons = rebarKg / 1000;
  const rebarCostUsd = rebarTons * rebarCostUsdT;
  const totalCostUsd = concCostUsd + rebarCostUsd;

  return {
    elementType,
    volumeM3,
    formAreaM2,
    concWeightKg,
    rebarKg,
    rebarTons,
    concCostUsd,
    rebarCostUsd,
    totalCostUsd,
  };
}
