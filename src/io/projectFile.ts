import type { ConstructionState } from "@/store/projectStore";
import {
  createInitialState,
  defaultEquipmentRows,
  emptyGeometry,
} from "@/store/projectStore";
import {
  MANPOWER_DEFAULT_RATES_USD_H,
  MANPOWER_TRADES,
} from "@/domain/calculate/manpower";
import {
  LINE_ITEM_CATEGORY_REMAP,
  LINE_ITEM_RETIRED_IDS,
  defaultGdtTime,
  defaultGdtTimeRates,
  defaultLineItems,
  type GdtTimeItem,
  type LineItem,
} from "@/domain/calculate/lineItems";
import {
  defaultBreezeArcGroup,
  defaultBreezeWallGroup,
  seedBreezeArcGroups,
  seedBreezeWallGroups,
  type BreezeArcGroup,
  type BreezeWallGroup,
} from "@/domain/calculate/breezeBlock";
import {
  defaultPlatform,
  defaultTrenchGroup,
  seedPlatforms,
  seedTrenches,
  type EarthworksPlatform,
  type EarthworksTrenchGroup,
} from "@/domain/calculate/landPrep";
import type {
  ConcreteAggregateResult,
  ConcreteElementItem,
  ConcreteElementType,
  ConcreteGeometry,
} from "@/domain/calculate/concrete";
import {
  defaultConcreteElement,
  seedConcreteElements,
} from "@/domain/calculate/concrete";
import {
  defaultDisciplineClassifications,
  type DisciplineClassifications,
  type DisciplineKey,
} from "@/domain/calculate/quoteRollup";
import type { CostCenter, MarginTier } from "@/domain/calculate/lineItems";

/**
 * On-disk `.gctp.json` (GDT Construction project).
 * Bump version when the shape changes + migrate.
 */
export const LATEST_VERSION = 4 as const;
const SUPPORTED_VERSIONS = [1, 2, 3, 4] as const;

interface EquipmentPersistBlob {
  rows: {
    name: string;
    count: number;
    rateUsdH: number;
    fuelLH: number;
    utilPct: number;
  }[];
  days: number;
  hoursPerDay: number;
  fuelPriceUsdL: number;
  mobilisationUsd: number;
  demobilisationUsd: number;
  dailyPlantOverheadUsd: number;
  miscPlantUsd: number;
  result: ConstructionState["equipment"]["result"];
}

export interface ConstructionProjectFileV4 {
  version: typeof LATEST_VERSION;
  meta: ConstructionState["meta"];
  reactors: ConstructionState["reactors"];
  earthworksFromReactors: boolean;
  lineItems: LineItem[];
  gdtTime: ConstructionState["gdtTime"];
  disciplineClassifications: DisciplineClassifications;
  breeze: ConstructionState["breeze"];
  sand: ConstructionState["sand"];
  concrete: ConstructionState["concrete"];
  land: ConstructionState["land"];
  manpower: ConstructionState["manpower"];
  equipmentPersist: EquipmentPersistBlob;
}

/** @deprecated Use ConstructionProjectFileV4 */
export type ConstructionProjectFileV3 = Omit<
  ConstructionProjectFileV4,
  "version" | "disciplineClassifications"
> & { version: 3 };

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function numericOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export class ProjectParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectParseError";
  }
}

export function serialiseFromState(state: ConstructionState): string {
  const file: ConstructionProjectFileV4 = {
    version: LATEST_VERSION,
    meta: clone(state.meta),
    reactors: clone(state.reactors),
    earthworksFromReactors: state.earthworksFromReactors,
    lineItems: clone(state.lineItems),
    gdtTime: clone(state.gdtTime),
    disciplineClassifications: clone(state.disciplineClassifications),
    breeze: clone(state.breeze),
    sand: clone(state.sand),
    concrete: clone(state.concrete),
    land: clone(state.land),
    manpower: clone(state.manpower),
    equipmentPersist: {
      rows: state.equipment.rows.map((r) => ({ ...r })),
      days: state.equipment.days,
      hoursPerDay: state.equipment.hoursPerDay,
      fuelPriceUsdL: state.equipment.fuelPriceUsdL,
      mobilisationUsd: state.equipment.mobilisationUsd,
      demobilisationUsd: state.equipment.demobilisationUsd,
      dailyPlantOverheadUsd: state.equipment.dailyPlantOverheadUsd,
      miscPlantUsd: state.equipment.miscPlantUsd,
      result: state.equipment.result ? clone(state.equipment.result) : null,
    },
  };
  return JSON.stringify(file, null, 2);
}

export function parseToState(text: string): ConstructionState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new ProjectParseError(
      `File is not valid JSON: ${(e as Error).message}`,
    );
  }
  if (!raw || typeof raw !== "object") {
    throw new ProjectParseError("File root must be an object.");
  }
  const obj = raw as Record<string, unknown>;
  const ver = obj.version;
  if (
    typeof ver !== "number" ||
    !SUPPORTED_VERSIONS.includes(ver as 1 | 2 | 3 | 4)
  ) {
    throw new ProjectParseError(
      `Unsupported project version ${String(ver)}.`,
    );
  }
  const base = createInitialState();
  const parsed = raw as Partial<ConstructionProjectFileV4> & {
    breeze?: Record<string, unknown>;
    land?: Record<string, unknown>;
    concrete?: Record<string, unknown>;
  };
  try {
    return {
      ...base,
      meta: coerceMeta(parsed.meta, base.meta),
      reactors: coerceReactors(parsed.reactors, base.reactors),
      earthworksFromReactors:
        typeof parsed.earthworksFromReactors === "boolean"
          ? parsed.earthworksFromReactors
          : base.earthworksFromReactors,
      lineItems: coerceLineItems(parsed.lineItems),
      gdtTime: coerceGdtTime(parsed.gdtTime),
      disciplineClassifications: coerceDisciplineClassifications(
        parsed.disciplineClassifications,
      ),
      breeze: coerceBreeze(parsed.breeze ?? base.breeze),
      sand: parsed.sand ? clone(parsed.sand as ConstructionState["sand"]) : base.sand,
      concrete: coerceConcrete(parsed.concrete),
      land: coerceLand(parsed.land ?? base.land),
      manpower: coerceManpower(parsed.manpower ?? base.manpower),
      equipment: coerceEquipment(
        parsed.equipmentPersist ??
          ({
            rows: base.equipment.rows,
            days: base.equipment.days,
            hoursPerDay: base.equipment.hoursPerDay,
            fuelPriceUsdL: base.equipment.fuelPriceUsdL,
            mobilisationUsd: base.equipment.mobilisationUsd,
            demobilisationUsd: base.equipment.demobilisationUsd,
            dailyPlantOverheadUsd: base.equipment.dailyPlantOverheadUsd,
            miscPlantUsd: base.equipment.miscPlantUsd,
            result: base.equipment.result,
          } satisfies EquipmentPersistBlob),
      ),
      toast: null,
    };
  } catch (e) {
    throw new ProjectParseError(
      `Invalid project payload: ${(e as Error).message}`,
    );
  }
}

function coerceMeta(
  m: unknown,
  fallback: ConstructionState["meta"],
): ConstructionState["meta"] {
  if (!m || typeof m !== "object") return { ...fallback };
  const o = m as Record<string, unknown>;
  return {
    title:
      typeof o.title === "string" ? o.title : fallback.title,
    client: typeof o.client === "string" ? o.client : fallback.client,
    site: typeof o.site === "string" ? o.site : fallback.site,
    author: typeof o.author === "string" ? o.author : fallback.author,
    revision:
      typeof o.revision === "string" ? o.revision : fallback.revision,
  };
}

function coerceReactors(
  r: unknown,
  fallback: ConstructionState["reactors"],
): ConstructionState["reactors"] {
  if (!r || typeof r !== "object") return { ...fallback };
  const obj = r as Record<string, unknown>;
  const numOr = (
    k:
      | "count"
      | "lengthM"
      | "widthM"
      | "wallHeightM"
      | "workingDepthM"
      | "excavationDepthCm"
      | "footingThicknessCm"
      | "sandBeddingCm"
      | "overdigM",
  ): number => {
    const v = obj[k];
    return typeof v === "number" && Number.isFinite(v) ? v : fallback[k];
  };
  return {
    count: Math.max(0, Math.trunc(numOr("count"))),
    lengthM: numOr("lengthM"),
    widthM: numOr("widthM"),
    wallHeightM: numOr("wallHeightM"),
    workingDepthM: numOr("workingDepthM"),
    excavationDepthCm: numOr("excavationDepthCm"),
    footingThicknessCm: numOr("footingThicknessCm"),
    sandBeddingCm: numOr("sandBeddingCm"),
    overdigM: numOr("overdigM"),
    costCenter:
      obj.costCenter === "gdt" || obj.costCenter === "contractor"
        ? obj.costCenter
        : fallback.costCenter,
    marginTier: isMarginTier(obj.marginTier)
      ? obj.marginTier
      : fallback.marginTier,
  };
}

function coerceLineItems(items: unknown): LineItem[] {
  if (!Array.isArray(items)) return defaultLineItems();
  const out: LineItem[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string") continue;
    if (LINE_ITEM_RETIRED_IDS.has(r.id)) continue;
    const declared =
      typeof r.category === "string" && isCategory(r.category)
        ? (r.category as LineItem["category"])
        : "site_construction";
    const remapped = LINE_ITEM_CATEGORY_REMAP[r.id] ?? declared;
    out.push({
      id: r.id,
      category: remapped,
      label: typeof r.label === "string" ? r.label : "Item",
      mode:
        r.mode === "per_reactor" || r.mode === "lump" ? r.mode : "lump",
      unitCostUsd: numericOr(r.unitCostUsd, 0),
      qty: numericOr(r.qty, 1),
      costCenter:
        r.costCenter === "gdt" || r.costCenter === "contractor"
          ? r.costCenter
          : "gdt",
      marginTier: isMarginTier(r.marginTier) ? r.marginTier : "none",
      note: typeof r.note === "string" ? r.note : undefined,
      enabled: r.enabled === false ? false : true,
    });
  }
  return out.length ? out : defaultLineItems();
}

function coerceGdtTime(blob: unknown): ConstructionState["gdtTime"] {
  if (!blob || typeof blob !== "object") {
    return { items: defaultGdtTime(), rates: defaultGdtTimeRates() };
  }
  const o = blob as Record<string, unknown>;
  const ratesRaw = o.rates;
  const rates =
    ratesRaw && typeof ratesRaw === "object"
      ? {
          Engineering: numericOr(
            (ratesRaw as Record<string, unknown>).Engineering,
            defaultGdtTimeRates().Engineering,
          ),
          "Site Ops": numericOr(
            (ratesRaw as Record<string, unknown>)["Site Ops"],
            defaultGdtTimeRates()["Site Ops"],
          ),
          "Bio Ops": numericOr(
            (ratesRaw as Record<string, unknown>)["Bio Ops"],
            defaultGdtTimeRates()["Bio Ops"],
          ),
        }
      : defaultGdtTimeRates();

  const items: GdtTimeItem[] = [];
  if (Array.isArray(o.items)) {
    for (const raw of o.items) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      if (typeof r.id !== "string") continue;
      items.push({
        id: r.id,
        label: typeof r.label === "string" ? r.label : "Task",
        days: numericOr(r.days, 0),
        workGroup:
          r.workGroup === "Engineering" ||
          r.workGroup === "Site Ops" ||
          r.workGroup === "Bio Ops"
            ? r.workGroup
            : "Engineering",
        dayRateOverrideUsd:
          r.dayRateOverrideUsd === null ||
          (typeof r.dayRateOverrideUsd === "number" &&
            Number.isFinite(r.dayRateOverrideUsd))
            ? (r.dayRateOverrideUsd as number | null)
            : null,
        marginTier: isMarginTier(r.marginTier) ? r.marginTier : "none",
        costCenter:
          r.costCenter === "gdt" || r.costCenter === "contractor"
            ? r.costCenter
            : "gdt",
        enabled: r.enabled === false ? false : true,
      });
    }
  }
  return {
    items: items.length ? items : defaultGdtTime(),
    rates,
  };
}

function coerceDisciplineClassifications(
  blob: unknown,
): DisciplineClassifications {
  const defaults = defaultDisciplineClassifications();
  if (!blob || typeof blob !== "object") return defaults;
  const o = blob as Record<string, unknown>;
  const keys: DisciplineKey[] = [
    "blocks",
    "sand",
    "concrete",
    "earthworks",
    "manpower",
    "equipment",
  ];
  const out = { ...defaults };
  for (const key of keys) {
    const raw = o[key];
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const costCenter: CostCenter =
      r.costCenter === "gdt" || r.costCenter === "contractor"
        ? r.costCenter
        : defaults[key].costCenter;
    const marginTier: MarginTier = isMarginTier(r.marginTier)
      ? r.marginTier
      : defaults[key].marginTier;
    out[key] = { costCenter, marginTier };
  }
  return out;
}

function isCategory(value: string): value is LineItem["category"] {
  return (
    value === "site_construction" ||
    value === "site_mep" ||
    value === "harvesting" ||
    value === "buildings" ||
    value === "ancillary" ||
    value === "reactor_mep" ||
    value === "tech" ||
    value === "logistics" ||
    value === "training"
  );
}

function isMarginTier(value: unknown): value is LineItem["marginTier"] {
  return (
    value === "none" ||
    value === "low" ||
    value === "med" ||
    value === "high"
  );
}

function coerceLand(raw: unknown): ConstructionState["land"] {
  const base = createInitialState().land;
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;

  const platforms = coercePlatforms(obj.platforms, obj);
  const trenches = coerceTrenches(obj.trenches, obj);

  return {
    platforms,
    trenches,
    compactionTargetPct: numericOr(
      obj.compactionTargetPct,
      base.compactionTargetPct,
    ),
    liftThicknessCm: numericOr(obj.liftThicknessCm, base.liftThicknessCm),
    rollerWidthM: numericOr(obj.rollerWidthM, base.rollerWidthM),
    passesPerLift: Math.max(
      1,
      Math.trunc(numericOr(obj.passesPerLift, base.passesPerLift)),
    ),
    costPerM3Cut: numericOr(obj.costPerM3Cut, base.costPerM3Cut),
    costPerM2Pass: numericOr(obj.costPerM2Pass, base.costPerM2Pass),
    result: (obj.result as ConstructionState["land"]["result"]) ?? null,
  };
}

function coercePlatforms(
  arr: unknown,
  parent: Record<string, unknown>,
): EarthworksPlatform[] {
  if (Array.isArray(arr)) {
    const out: EarthworksPlatform[] = [];
    for (const raw of arr) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      out.push({
        id: typeof r.id === "string" ? r.id : defaultPlatform().id,
        label: typeof r.label === "string" ? r.label : "Platform",
        areaM2: numericOr(r.areaM2, 0),
        depthCm: numericOr(r.depthCm, 0),
        enabled: r.enabled === false ? false : true,
      });
    }
    return out.length ? out : seedPlatforms();
  }
  if (
    typeof parent.siteAreaM2 === "number" ||
    typeof parent.siteDepthCm === "number"
  ) {
    return [
      {
        id: "plat-migrated",
        label: "Main platform cut",
        areaM2: numericOr(parent.siteAreaM2, 0),
        depthCm: numericOr(parent.siteDepthCm, 0),
        enabled: true,
      },
    ];
  }
  return seedPlatforms();
}

function coerceTrenches(
  arr: unknown,
  parent: Record<string, unknown>,
): EarthworksTrenchGroup[] {
  if (Array.isArray(arr)) {
    const out: EarthworksTrenchGroup[] = [];
    for (const raw of arr) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      out.push({
        id: typeof r.id === "string" ? r.id : defaultTrenchGroup().id,
        label: typeof r.label === "string" ? r.label : "Trench",
        lengthM: numericOr(r.lengthM, 0),
        widthM: numericOr(r.widthM, 0),
        depthCm: numericOr(r.depthCm, 0),
        count: Math.max(0, Math.trunc(numericOr(r.count, 0))),
        enabled: r.enabled === false ? false : true,
      });
    }
    return out.length ? out : seedTrenches();
  }
  if (
    typeof parent.trenchLengthM === "number" ||
    typeof parent.trenchWidthM === "number"
  ) {
    return [
      {
        id: "trench-migrated",
        label: "Service trench",
        lengthM: numericOr(parent.trenchLengthM, 0),
        widthM: numericOr(parent.trenchWidthM, 0),
        depthCm: numericOr(parent.trenchDepthCm, 0),
        count: Math.max(0, Math.trunc(numericOr(parent.trenchCount, 0))),
        enabled: true,
      },
    ];
  }
  return seedTrenches();
}

function coerceBreeze(raw: unknown): ConstructionState["breeze"] {
  const base = createInitialState().breeze;
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const walls = coerceBreezeWalls(obj.walls, obj);
  const arcs = coerceBreezeArcs(obj.arcs, obj);
  return {
    blockName:
      typeof obj.blockName === "string" ? obj.blockName : base.blockName,
    costPerBlock: numericOr(obj.costPerBlock, base.costPerBlock),
    walls,
    arcs,
    result: (obj.result as ConstructionState["breeze"]["result"]) ?? null,
  };
}

function coerceBreezeWalls(
  arr: unknown,
  parent: Record<string, unknown>,
): BreezeWallGroup[] {
  if (Array.isArray(arr)) {
    const out: BreezeWallGroup[] = [];
    for (const raw of arr) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      out.push({
        id:
          typeof r.id === "string" ? r.id : defaultBreezeWallGroup().id,
        label: typeof r.label === "string" ? r.label : "Wall group",
        lengthM: numericOr(r.lengthM, 0),
        heightM: numericOr(r.heightM, 0),
        count: Math.max(0, Math.trunc(numericOr(r.count, 0))),
        enabled: r.enabled === false ? false : true,
      });
    }
    return out.length ? out : seedBreezeWallGroups();
  }
  if (
    typeof parent.wallLengthM === "number" ||
    typeof parent.wallHeightM === "number"
  ) {
    return [
      {
        id: "wall-migrated",
        label: "Wall group",
        lengthM: numericOr(parent.wallLengthM, 0),
        heightM: numericOr(parent.wallHeightM, 0),
        count: Math.max(0, Math.trunc(numericOr(parent.wallCount, 1))),
        enabled: true,
      },
    ];
  }
  return seedBreezeWallGroups();
}

function coerceBreezeArcs(
  arr: unknown,
  parent: Record<string, unknown>,
): BreezeArcGroup[] {
  if (Array.isArray(arr)) {
    const out: BreezeArcGroup[] = [];
    for (const raw of arr) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      out.push({
        id: typeof r.id === "string" ? r.id : defaultBreezeArcGroup().id,
        label: typeof r.label === "string" ? r.label : "Arc group",
        radiusM: numericOr(r.radiusM, 0),
        heightM: numericOr(r.heightM, 0),
        count: Math.max(0, Math.trunc(numericOr(r.count, 0))),
        enabled: r.enabled === false ? false : true,
      });
    }
    return out.length ? out : seedBreezeArcGroups();
  }
  if (
    typeof parent.arcRadiusM === "number" ||
    typeof parent.arcHeightM === "number"
  ) {
    return [
      {
        id: "arc-migrated",
        label: "Arc group",
        radiusM: numericOr(parent.arcRadiusM, 0),
        heightM: numericOr(parent.arcHeightM, 0),
        count: Math.max(0, Math.trunc(numericOr(parent.arcCount, 0))),
        enabled: true,
      },
    ];
  }
  return seedBreezeArcGroups();
}

const CONCRETE_TYPES: ConcreteElementType[] = [
  "slab",
  "strip",
  "wall",
  "isolated",
];

function legacyConcreteToElement(
  elementIndex: number,
  geometry: ConcreteGeometry,
): ConcreteElementItem {
  const t = CONCRETE_TYPES[Math.max(0, Math.min(3, elementIndex))] ?? "slab";
  switch (t) {
    case "strip":
      return {
        ...defaultConcreteElement("strip"),
        label: "Strip footing (migrated)",
        lengthM: geometry.strip.lengthM,
        widthM: geometry.strip.widthM,
        thicknessCm: geometry.strip.thicknessCm,
      };
    case "wall":
      return {
        ...defaultConcreteElement("wall"),
        label: "Wall (migrated)",
        lengthM: geometry.wall.lengthM,
        heightM: geometry.wall.heightM,
        thicknessCm: geometry.wall.thicknessCm,
        count: geometry.wall.count,
      };
    case "isolated":
      return {
        ...defaultConcreteElement("isolated"),
        label: "Isolated footing (migrated)",
        lengthM: geometry.iso.lengthM,
        widthM: geometry.iso.widthM,
        thicknessCm: geometry.iso.thicknessCm,
        count: geometry.iso.count,
      };
    default:
      return {
        ...defaultConcreteElement("slab"),
        label: "Slab / base (migrated)",
        lengthM: geometry.slab.lengthM,
        widthM: geometry.slab.widthM,
        thicknessCm: geometry.slab.thicknessCm,
        count: geometry.slab.count,
      };
  }
}

function coerceConcreteElements(arr: unknown): ConcreteElementItem[] {
  if (!Array.isArray(arr)) return seedConcreteElements();
  const out: ConcreteElementItem[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const elementType =
      r.elementType === "slab" ||
      r.elementType === "strip" ||
      r.elementType === "wall" ||
      r.elementType === "isolated"
        ? r.elementType
        : "slab";
    out.push({
      id:
        typeof r.id === "string"
          ? r.id
          : defaultConcreteElement(elementType).id,
      label: typeof r.label === "string" ? r.label : "Concrete element",
      elementType,
      enabled: r.enabled === false ? false : true,
      lengthM: numericOr(r.lengthM, 0),
      widthM: numericOr(r.widthM, 0),
      heightM: numericOr(r.heightM, 0),
      thicknessCm: numericOr(r.thicknessCm, 0),
      count: Math.max(0, Math.trunc(numericOr(r.count, 0))),
    });
  }
  return out.length ? out : seedConcreteElements();
}

function coerceConcrete(raw: unknown): ConstructionState["concrete"] {
  const base = createInitialState().concrete;
  if (!raw || typeof raw !== "object") return base;
  const copy = raw as Record<string, unknown>;

  let elements: ConcreteElementItem[];
  if (Array.isArray(copy.elements)) {
    elements = coerceConcreteElements(copy.elements);
  } else if (
    typeof copy.elementIndex === "number" ||
    (copy.geometry && typeof copy.geometry === "object")
  ) {
    const g =
      copy.geometry && typeof copy.geometry === "object"
        ? (copy.geometry as ConcreteGeometry)
        : emptyGeometry();
    const idx =
      typeof copy.elementIndex === "number" ? copy.elementIndex : 0;
    elements = [legacyConcreteToElement(idx, g)];
  } else {
    elements = seedConcreteElements();
  }

  const materials =
    copy.materials && typeof copy.materials === "object"
      ? { ...(copy.materials as ConstructionState["concrete"]["materials"]) }
      : base.materials;

  let result: ConcreteAggregateResult | null = null;
  if (copy.result && typeof copy.result === "object") {
    const r = copy.result as Record<string, unknown>;
    if (Array.isArray(r.elements)) {
      result = r as unknown as ConcreteAggregateResult;
    } else if (typeof r.volumeM3 === "number") {
      const legacy = r;
      result = {
        elements: [
          {
            id: "legacy-result",
            label: "Migrated element",
            elementType:
              legacy.elementType === "strip" ||
              legacy.elementType === "wall" ||
              legacy.elementType === "isolated"
                ? legacy.elementType
                : "slab",
            volumeM3: numericOr(legacy.volumeM3, 0),
            formAreaM2: numericOr(legacy.formAreaM2, 0),
            concWeightKg: numericOr(legacy.concWeightKg, 0),
            rebarKg: numericOr(legacy.rebarKg, 0),
            rebarTons: numericOr(legacy.rebarTons, 0),
            concCostUsd: numericOr(legacy.concCostUsd, 0),
            rebarCostUsd: numericOr(legacy.rebarCostUsd, 0),
            totalCostUsd: numericOr(legacy.totalCostUsd, 0),
          },
        ],
        volumeM3: numericOr(legacy.volumeM3, 0),
        formAreaM2: numericOr(legacy.formAreaM2, 0),
        concWeightKg: numericOr(legacy.concWeightKg, 0),
        rebarKg: numericOr(legacy.rebarKg, 0),
        rebarTons: numericOr(legacy.rebarTons, 0),
        concCostUsd: numericOr(legacy.concCostUsd, 0),
        rebarCostUsd: numericOr(legacy.rebarCostUsd, 0),
        totalCostUsd: numericOr(legacy.totalCostUsd, 0),
      };
    }
  }

  return { elements, materials, result };
}

function coerceManpower(
  m: ConstructionState["manpower"],
): ConstructionState["manpower"] {
  const copy = clone(m);
  while (copy.trades.length < MANPOWER_TRADES.length) {
    const i = copy.trades.length;
    copy.trades.push({
      workers: 0,
      rateUsdH: MANPOWER_DEFAULT_RATES_USD_H[i] ?? 5,
    });
  }
  return copy;
}

function coerceEquipment(
  blob: EquipmentPersistBlob,
): ConstructionState["equipment"] {
  const rows =
    blob.rows?.length
      ? blob.rows.map((r) => ({
          name: String(r.name ?? ""),
          count: Number(r.count) || 0,
          rateUsdH: Number(r.rateUsdH) || 0,
          fuelLH: Number(r.fuelLH) || 0,
          utilPct: Number(r.utilPct) || 0,
        }))
      : defaultEquipmentRows();

  return {
    rows,
    days: Number(blob.days) || 30,
    hoursPerDay: Number(blob.hoursPerDay) || 8,
    fuelPriceUsdL: Number(blob.fuelPriceUsdL) ?? 0.5,
    mobilisationUsd: Number(blob.mobilisationUsd) || 0,
    demobilisationUsd: Number(blob.demobilisationUsd) || 0,
    dailyPlantOverheadUsd: Number(blob.dailyPlantOverheadUsd) || 0,
    miscPlantUsd: Number(blob.miscPlantUsd) || 0,
    result: blob.result ? clone(blob.result) : null,
  };
}
