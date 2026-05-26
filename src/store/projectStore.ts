import type {
  BreezeArcGroup,
  BreezeInputs,
  BreezeResult,
  BreezeWallGroup,
} from "@/domain/calculate/breezeBlock";
import {
  calculateBreezeBlock,
  defaultBreezeArcGroup,
  defaultBreezeWallGroup,
  seedBreezeArcGroups,
  seedBreezeWallGroups,
} from "@/domain/calculate/breezeBlock";
import type { SweetSandResult } from "@/domain/calculate/sweetSand";
import {
  SweetSandError,
  calculateSweetSand,
} from "@/domain/calculate/sweetSand";
import type {
  ConcreteAggregateResult,
  ConcreteElementItem,
  ConcreteGeometry,
  ConcreteMaterials,
} from "@/domain/calculate/concrete";
import {
  ConcreteError,
  calculateConcreteElements,
  defaultConcreteElement,
  seedConcreteElements,
} from "@/domain/calculate/concrete";
import type {
  EarthworksPlatform,
  EarthworksTrenchGroup,
  LandPrepResult,
} from "@/domain/calculate/landPrep";
import {
  LandPrepError,
  calculateLandPrep,
  defaultPlatform,
  defaultTrenchGroup,
  seedPlatforms,
  seedTrenches,
} from "@/domain/calculate/landPrep";
import type { EquipmentResult, EquipmentRow } from "@/domain/calculate/equipment";
import type { ManpowerResult, ManpowerRow } from "@/domain/calculate/manpower";
import {
  ManpowerError,
  calculateManpower,
  defaultManpowerRow,
} from "@/domain/calculate/manpower";
import {
  EquipmentError,
  calculateEquipment,
  defaultEquipmentRow,
} from "@/domain/calculate/equipment";
import { getBlockType, getBlockNames } from "@/domain/blockTypes";
import type {
  ReactorConfig,
  ReactorDerivedGeometry,
} from "@/domain/calculate/reactors";
import {
  computeReactorGeometry,
  defaultReactorConfig,
} from "@/domain/calculate/reactors";
import type {
  GdtTimeItem,
  GdtTimeRates,
  LineItem,
  LineItemCategory,
} from "@/domain/calculate/lineItems";
import {
  aggregateGdtTime,
  aggregateLineItems,
  defaultGdtTime,
  defaultLineItems,
} from "@/domain/calculate/lineItems";
import { findLineItemPreset } from "@/domain/calculate/lineItemPresets";
import {
  computeQuoteRollup,
  defaultDisciplineClassifications,
  type DisciplineClassifications,
  type DisciplineKey,
  type QuoteClassification,
} from "@/domain/calculate/quoteRollup";
import {
  defaultPlannerConfig,
  manpowerRateForTrade,
  type PlannerConfig,
} from "@/domain/plannerConfig";
import { create } from "zustand";

export type ToastMessage =
  | {
      variant: "ok" | "err";
      text: string;
    }
  | null;

export interface ProjectMeta {
  /** Primary project name on title block */
  title: string;
  client: string;
  site: string;
  author: string;
  revision: string;
}

export interface ConstructionState {
  meta: ProjectMeta;
  toast: ToastMessage;
  /** Central reactor configuration — drives count + optional earthworks link. */
  reactors: ReactorConfig;
  /** When true, Earthworks pulls reactor excavation volume + compaction area. */
  earthworksFromReactors: boolean;
  /** Generic line items (Site MEP, Buildings, Reactor MEP, Tech, Logistics, Training). */
  lineItems: LineItem[];
  /** GDT internal time records (engineering/site ops/bio ops days). */
  gdtTime: { items: GdtTimeItem[]; rates: GdtTimeRates };
  breeze: {
    blockName: string;
    costPerBlock: number;
    walls: BreezeWallGroup[];
    arcs: BreezeArcGroup[];
    result: BreezeResult | null;
  };
  sand: {
    lengthTotalM: number;
    widthM: number;
    fillHeightCm: number;
    cornerRadiusCm: number;
    bulkDensityKgM3: number;
    costPerTonneUsd: number;
    result: SweetSandResult | null;
  };
  concrete: {
    elements: ConcreteElementItem[];
    materials: ConcreteMaterials;
    result: ConcreteAggregateResult | null;
  };
  land: {
    platforms: EarthworksPlatform[];
    trenches: EarthworksTrenchGroup[];
    compactionTargetPct: number;
    liftThicknessCm: number;
    rollerWidthM: number;
    passesPerLift: number;
    costPerM3Cut: number;
    costPerM2Pass: number;
    result: LandPrepResult | null;
  };
  manpower: {
    rows: ManpowerRow[];
    schedule: {
      days: number;
      hoursNormalPerDay: number;
      hoursOtPerDay: number;
      otFactor: number;
    };
    overheads: {
      mobilisationUsd: number;
      demobilisationUsd: number;
      dailyOverheadUsd: number;
      miscUsd: number;
    };
    result: ManpowerResult | null;
  };
  equipment: {
    rows: EquipmentRow[];
    days: number;
    hoursPerDay: number;
    fuelPriceUsdL: number;
    mobilisationUsd: number;
    demobilisationUsd: number;
    dailyPlantOverheadUsd: number;
    miscPlantUsd: number;
    result: EquipmentResult | null;
  };
  disciplineClassifications: DisciplineClassifications;
  /** Editable presets (margins, default rates, rebar levels, etc.). */
  config: PlannerConfig;
}

export function emptyGeometry(): ConcreteGeometry {
  return {
    slab: { lengthM: 0, widthM: 0, thicknessCm: 0, count: 1 },
    strip: { lengthM: 0, widthM: 0, thicknessCm: 0 },
    wall: { lengthM: 0, heightM: 0, thicknessCm: 0, count: 1 },
    iso: { lengthM: 0, widthM: 0, thicknessCm: 0, count: 1 },
  };
}

export const defaultEquipmentRows = (): EquipmentRow[] =>
  defaultPlannerConfig().equipmentPresets.map((preset) =>
    defaultEquipmentRow(preset),
  );

export function createInitialState(): ConstructionState {
  const config = defaultPlannerConfig();
  const firstBlockName = getBlockNames()[0] ?? "";
  const block = firstBlockName ? getBlockType(firstBlockName) : undefined;

  return {
    meta: {
      title: "Untitled construction estimate",
      client: "",
      site: "",
      author: "",
      revision: "A",
    },
    toast: null,
    reactors: defaultReactorConfig(),
    earthworksFromReactors: true,
    lineItems: defaultLineItems(),
    gdtTime: { items: defaultGdtTime(), rates: { ...config.gdtDayRates } },
    breeze: {
      blockName: firstBlockName,
      costPerBlock: block?.defaultCostUsd ?? 0,
      walls: seedBreezeWallGroups(),
      arcs: seedBreezeArcGroups(),
      result: null,
    },
    sand: {
      lengthTotalM: 0,
      widthM: 0,
      fillHeightCm: 0,
      cornerRadiusCm: 0,
      bulkDensityKgM3: 1600,
      costPerTonneUsd: 13.3,
      result: null,
    },
    concrete: {
      elements: seedConcreteElements(),
      materials: {
        densityKgM3: 2400,
        costUsdM3: 60,
        rebarKgM3: config.rebarDensityKgM3.medium,
        rebarCostUsdT: 640,
      },
      result: null,
    },
    land: {
      platforms: seedPlatforms(),
      trenches: seedTrenches(),
      compactionTargetPct: 95,
      liftThicknessCm: 20,
      rollerWidthM: 2,
      passesPerLift: 4,
      costPerM3Cut: 3,
      costPerM2Pass: 0.01,
      result: null,
    },
    manpower: {
      rows: [],
      schedule: {
        days: 30,
        hoursNormalPerDay: 8,
        hoursOtPerDay: 0,
        otFactor: 1.5,
      },
      overheads: {
        mobilisationUsd: 0,
        demobilisationUsd: 0,
        dailyOverheadUsd: 0,
        miscUsd: 0,
      },
      result: null,
    },
    equipment: {
      rows: [],
      days: 30,
      hoursPerDay: 8,
      fuelPriceUsdL: 0.5,
      mobilisationUsd: 0,
      demobilisationUsd: 0,
      dailyPlantOverheadUsd: 0,
      miscPlantUsd: 0,
      result: null,
    },
    disciplineClassifications: defaultDisciplineClassifications(),
    config,
  };
}

export interface SummaryTotals {
  blockCost: number;
  sandCost: number;
  concreteCost: number;
  landCost: number;
  manpowerCost: number;
  equipmentCost: number;
  lineItemsRaw: number;
  lineItemsWithMargin: number;
  lineItemsByCategory: Record<LineItemCategory, number>;
  gdtTimeRaw: number;
  gdtTimeWithMargin: number;
  gdtScopeRaw: number;
  contractorScopeRaw: number;
  gdtScopeQuote: number;
  contractorScopeQuote: number;
  total: number;
  totalWithMargin: number;
  totalMarginUsd: number;
}

/** Pure summary calculation — used by both the store and React components. */
export function computeSummaryTotals(s: ConstructionState): SummaryTotals {
  const blockCost = s.breeze.result?.totalCostUsd ?? 0;
  const sandCost = s.sand.result?.totalCostUsd ?? 0;
  const concreteCost = s.concrete.result?.totalCostUsd ?? 0;
  const landCost = s.land.result?.totalCostUsd ?? 0;
  const manpowerCost = s.manpower.result?.grandTotalUsd ?? 0;
  const equipmentCost = s.equipment.result?.grandTotalUsd ?? 0;

  const liBreak = aggregateLineItems(
    s.lineItems,
    s.reactors.count,
    s.config.marginTierPct,
  );
  const timeBreak = aggregateGdtTime(
    s.gdtTime.items,
    s.gdtTime.rates,
    s.config.marginTierPct,
  );
  const rollup = computeQuoteRollup(s);

  return {
    blockCost,
    sandCost,
    concreteCost,
    landCost,
    manpowerCost,
    equipmentCost,
    lineItemsRaw: liBreak.rawUsd,
    lineItemsWithMargin: liBreak.withMarginUsd,
    lineItemsByCategory: rollup.lineItemsByCategory,
    gdtTimeRaw: timeBreak.rawUsd,
    gdtTimeWithMargin: timeBreak.withMarginUsd,
    gdtScopeRaw: rollup.gdtScopeRawUsd,
    contractorScopeRaw: rollup.contractorScopeRawUsd,
    gdtScopeQuote: rollup.gdtScopeQuoteUsd,
    contractorScopeQuote: rollup.contractorScopeQuoteUsd,
    total: rollup.totalRawUsd,
    totalWithMargin: rollup.totalQuoteUsd,
    totalMarginUsd: rollup.totalMarginUsd,
  };
}

interface Store extends ConstructionState {
  dismissToast: () => void;
  showToast: (t: Exclude<ToastMessage, null>) => void;
  setMetaTitle: (t: string) => void;
  setMeta: (patch: Partial<ProjectMeta>) => void;
  replaceAll: (next: ConstructionState) => void;
  resetWorkspace: () => void;

  setReactors: (patch: Partial<ReactorConfig>) => void;
  resetReactors: () => void;
  applyReactorClassificationToLineItems: () => void;
  reactorGeometry: () => ReactorDerivedGeometry;
  setEarthworksFromReactors: (v: boolean) => void;

  upsertLineItem: (item: LineItem) => void;
  patchLineItem: (id: string, patch: Partial<LineItem>) => void;
  removeLineItem: (id: string) => void;
  addLineItem: (category: LineItemCategory) => string;
  addLineItemFromPreset: (
    category: LineItemCategory,
    presetId: string,
  ) => string;
  resetLineItems: () => void;

  upsertGdtTimeItem: (item: GdtTimeItem) => void;
  patchGdtTimeItem: (id: string, patch: Partial<GdtTimeItem>) => void;
  removeGdtTimeItem: (id: string) => void;
  addGdtTimeItem: () => string;
  setGdtTimeRate: (key: keyof GdtTimeRates, rate: number) => void;
  resetGdtTime: () => void;

  setBreeze: (partial: Partial<ConstructionState["breeze"]>) => void;
  onBreezeBlockName: (name: string) => void;
  calculateBreeze: () => void;
  resetBreeze: () => void;
  addBreezeWallGroup: () => string;
  patchBreezeWallGroup: (id: string, patch: Partial<BreezeWallGroup>) => void;
  removeBreezeWallGroup: (id: string) => void;
  addBreezeArcGroup: () => string;
  patchBreezeArcGroup: (id: string, patch: Partial<BreezeArcGroup>) => void;
  removeBreezeArcGroup: (id: string) => void;

  setSand: (partial: Partial<ConstructionState["sand"]>) => void;
  calculateSand: () => void;
  resetSand: () => void;

  setConcrete: (partial: Partial<ConstructionState["concrete"]>) => void;
  addConcreteElement: (elementType?: ConcreteElementItem["elementType"]) => string;
  patchConcreteElement: (
    id: string,
    patch: Partial<ConcreteElementItem>,
  ) => void;
  removeConcreteElement: (id: string) => void;
  calculateConcrete: () => void;
  resetConcrete: () => void;

  setLand: (partial: Partial<ConstructionState["land"]>) => void;
  calculateLand: () => void;
  resetLand: () => void;
  addPlatform: () => string;
  patchPlatform: (id: string, patch: Partial<EarthworksPlatform>) => void;
  removePlatform: (id: string) => void;
  addTrenchGroup: () => string;
  patchTrenchGroup: (id: string, patch: Partial<EarthworksTrenchGroup>) => void;
  removeTrenchGroup: (id: string) => void;

  setManpower: (partial: Partial<ConstructionState["manpower"]>) => void;
  addManpowerRow: (trade?: string) => string;
  patchManpowerRow: (id: string, patch: Partial<ManpowerRow>) => void;
  removeManpowerRow: (id: string) => void;
  calculateManpower: () => void;
  resetManpower: () => void;

  setEquipment: (partial: Partial<ConstructionState["equipment"]>) => void;
  addEquipmentRow: (presetIndex?: number) => string;
  patchEquipmentRow: (id: string, patch: Partial<EquipmentRow>) => void;
  removeEquipmentRow: (id: string) => void;
  calculateEquipment: () => void;
  resetEquipment: () => void;

  setDisciplineClassification: (
    key: DisciplineKey,
    patch: Partial<QuoteClassification>,
  ) => void;

  setPlannerConfig: (patch: Partial<PlannerConfig>) => void;
  resetPlannerConfig: () => void;

  summaryTotals: () => SummaryTotals;
}

function breezeInputsFrom(
  slice: ConstructionState["breeze"],
  reactors: ReactorConfig,
): BreezeInputs | null {
  try {
    const block = getBlockType(slice.blockName);
    return {
      block,
      costPerBlock: slice.costPerBlock,
      walls: slice.walls,
      arcs: slice.arcs,
      reactorLengthM: reactors.lengthM,
      reactorWidthM: reactors.widthM,
      reactorHeightM: reactors.wallHeightM,
      reactorCount: Math.max(0, Math.trunc(reactors.count)),
    };
  } catch {
    return null;
  }
}

export const useProjectStore = create<Store>((set, get) => ({
  ...createInitialState(),
  dismissToast: () => set({ toast: null }),
  showToast: (toast) => set({ toast }),
  setMetaTitle: (title) => set((s) => ({ meta: { ...s.meta, title } })),
  setMeta: (patch) =>
    set((s) => ({ meta: { ...s.meta, ...patch } })),
  replaceAll: (next) =>
    set(() => ({
      ...next,
      config: next.config ?? defaultPlannerConfig(),
      disciplineClassifications:
        next.disciplineClassifications ?? defaultDisciplineClassifications(),
      toast: null,
    })),
  resetWorkspace: () => set(createInitialState()),

  setReactors: (patch) =>
    set((s) => ({ reactors: { ...s.reactors, ...patch } })),
  resetReactors: () => set(() => ({ reactors: defaultReactorConfig() })),
  applyReactorClassificationToLineItems: () =>
    set((s) => {
      const { costCenter, marginTier } = s.reactors;
      return {
        lineItems: s.lineItems.map((li) =>
          li.mode === "per_reactor" ?
            { ...li, costCenter, marginTier }
          : li,
        ),
      };
    }),
  reactorGeometry: () => computeReactorGeometry(get().reactors),
  setEarthworksFromReactors: (v) => set(() => ({ earthworksFromReactors: v })),

  upsertLineItem: (item) =>
    set((s) => {
      const existing = s.lineItems.findIndex((li) => li.id === item.id);
      if (existing === -1) {
        return { lineItems: [...s.lineItems, item] };
      }
      const copy = s.lineItems.slice();
      copy[existing] = item;
      return { lineItems: copy };
    }),
  patchLineItem: (id, patch) =>
    set((s) => ({
      lineItems: s.lineItems.map((li) =>
        li.id === id ? { ...li, ...patch } : li,
      ),
    })),
  removeLineItem: (id) =>
    set((s) => ({
      lineItems: s.lineItems.filter((li) => li.id !== id),
    })),
  addLineItem: (category) => {
    const id = `${category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    set((s) => ({
      lineItems: [
        ...s.lineItems,
        {
          id,
          category,
          label: "New item",
          mode: "lump",
          unitCostUsd: 0,
          qty: 1,
          costCenter: s.reactors.costCenter,
          marginTier: s.reactors.marginTier,
          enabled: true,
        },
      ],
    }));
    return id;
  },
  addLineItemFromPreset: (category, presetId) => {
    const preset = findLineItemPreset(category, presetId);
    const id = `${presetId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    set((s) => ({
      lineItems: [
        ...s.lineItems,
        {
          id,
          category,
          label: preset?.label ?? "New item",
          mode: preset?.mode ?? "lump",
          unitCostUsd: preset?.unitCostUsd ?? 0,
          qty: 1,
          costCenter: s.reactors.costCenter,
          marginTier: s.reactors.marginTier,
          note: preset?.note,
          enabled: true,
        },
      ],
    }));
    return id;
  },
  resetLineItems: () => set(() => ({ lineItems: defaultLineItems() })),

  upsertGdtTimeItem: (item) =>
    set((s) => {
      const existing = s.gdtTime.items.findIndex((t) => t.id === item.id);
      if (existing === -1) {
        return {
          gdtTime: { ...s.gdtTime, items: [...s.gdtTime.items, item] },
        };
      }
      const copy = s.gdtTime.items.slice();
      copy[existing] = item;
      return { gdtTime: { ...s.gdtTime, items: copy } };
    }),
  patchGdtTimeItem: (id, patch) =>
    set((s) => ({
      gdtTime: {
        ...s.gdtTime,
        items: s.gdtTime.items.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      },
    })),
  removeGdtTimeItem: (id) =>
    set((s) => ({
      gdtTime: {
        ...s.gdtTime,
        items: s.gdtTime.items.filter((t) => t.id !== id),
      },
    })),
  addGdtTimeItem: () => {
    const id = `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    set((s) => ({
      gdtTime: {
        ...s.gdtTime,
        items: [
          ...s.gdtTime.items,
          {
            id,
            label: "New task",
            days: 1,
            workGroup: "Engineering",
            dayRateOverrideUsd: null,
            marginTier: "none",
            costCenter: "gdt",
            enabled: true,
          },
        ],
      },
    }));
    return id;
  },
  setGdtTimeRate: (key, rate) =>
    set((s) => ({
      gdtTime: {
        ...s.gdtTime,
        rates: { ...s.gdtTime.rates, [key]: rate },
      },
    })),
  resetGdtTime: () =>
    set((s) => ({
      gdtTime: {
        items: defaultGdtTime(),
        rates: { ...s.config.gdtDayRates },
      },
    })),

  summaryTotals: () => computeSummaryTotals(get()),

  setDisciplineClassification: (key, patch) =>
    set((s) => ({
      disciplineClassifications: {
        ...s.disciplineClassifications,
        [key]: { ...s.disciplineClassifications[key], ...patch },
      },
    })),

  setPlannerConfig: (patch) =>
    set((s) => ({
      config: {
        ...s.config,
        ...patch,
        marginTierPct: patch.marginTierPct
          ? { ...s.config.marginTierPct, ...patch.marginTierPct }
          : s.config.marginTierPct,
        rebarDensityKgM3: patch.rebarDensityKgM3
          ? { ...s.config.rebarDensityKgM3, ...patch.rebarDensityKgM3 }
          : s.config.rebarDensityKgM3,
        gdtDayRates: patch.gdtDayRates
          ? { ...s.config.gdtDayRates, ...patch.gdtDayRates }
          : s.config.gdtDayRates,
        manpowerTradeRatesUsdH: patch.manpowerTradeRatesUsdH
          ? { ...s.config.manpowerTradeRatesUsdH, ...patch.manpowerTradeRatesUsdH }
          : s.config.manpowerTradeRatesUsdH,
        equipmentPresets: patch.equipmentPresets ?? s.config.equipmentPresets,
      },
    })),
  resetPlannerConfig: () =>
    set(() => ({ config: defaultPlannerConfig() })),

  setBreeze: (partial) =>
    set((s) => ({
      breeze: { ...s.breeze, ...partial },
    })),
  onBreezeBlockName: (blockName) => {
    try {
      const bt = getBlockType(blockName);
      set((s) => ({
        breeze: {
          ...s.breeze,
          blockName,
          costPerBlock: bt.defaultCostUsd,
        },
      }));
    } catch {
      set((s) => ({ breeze: { ...s.breeze, blockName } }));
    }
  },
  calculateBreeze: () => {
    const st = get();
    const inp = breezeInputsFrom(st.breeze, st.reactors);
    if (!inp) {
      set({ toast: { variant: "err", text: "Select a valid block size." } });
      return;
    }
    const result = calculateBreezeBlock(inp);
    set((s) => ({
      breeze: { ...s.breeze, result },
      toast: null,
    }));
  },
  resetBreeze: () => {
    const firstBlockName = getBlockNames()[0] ?? "";
    const block = firstBlockName ? getBlockType(firstBlockName) : undefined;
    set((s) => ({
      breeze: {
        ...s.breeze,
        blockName: firstBlockName,
        costPerBlock: block?.defaultCostUsd ?? 0,
        walls: seedBreezeWallGroups(),
        arcs: seedBreezeArcGroups(),
        result: null,
      },
    }));
  },

  addBreezeWallGroup: () => {
    const w = defaultBreezeWallGroup(`Wall group ${Date.now() % 1000}`);
    set((s) => ({ breeze: { ...s.breeze, walls: [...s.breeze.walls, w] } }));
    return w.id;
  },
  patchBreezeWallGroup: (id: string, patch: Partial<BreezeWallGroup>) =>
    set((s) => ({
      breeze: {
        ...s.breeze,
        walls: s.breeze.walls.map((w) =>
          w.id === id ? { ...w, ...patch } : w,
        ),
      },
    })),
  removeBreezeWallGroup: (id: string) =>
    set((s) => ({
      breeze: { ...s.breeze, walls: s.breeze.walls.filter((w) => w.id !== id) },
    })),
  addBreezeArcGroup: () => {
    const a = defaultBreezeArcGroup(`Arc group ${Date.now() % 1000}`);
    set((s) => ({ breeze: { ...s.breeze, arcs: [...s.breeze.arcs, a] } }));
    return a.id;
  },
  patchBreezeArcGroup: (id: string, patch: Partial<BreezeArcGroup>) =>
    set((s) => ({
      breeze: {
        ...s.breeze,
        arcs: s.breeze.arcs.map((a) =>
          a.id === id ? { ...a, ...patch } : a,
        ),
      },
    })),
  removeBreezeArcGroup: (id: string) =>
    set((s) => ({
      breeze: { ...s.breeze, arcs: s.breeze.arcs.filter((a) => a.id !== id) },
    })),

  setSand: (partial) => set((s) => ({ sand: { ...s.sand, ...partial } })),
  calculateSand: () => {
    const slice = get().sand;
    try {
      const result = calculateSweetSand({
        lengthTotalM: slice.lengthTotalM,
        widthM: slice.widthM,
        fillHeightCm: slice.fillHeightCm,
        cornerRadiusCm: slice.cornerRadiusCm,
        bulkDensityKgM3: slice.bulkDensityKgM3,
        costPerTonneUsd: slice.costPerTonneUsd,
      });
      set((s) => ({ sand: { ...s.sand, result }, toast: null }));
    } catch (e) {
      const msg =
        e instanceof SweetSandError ? e.message : `${e}`;
      set({ toast: { variant: "err", text: msg } });
    }
  },
  resetSand: () =>
    set(() => ({
      sand: createInitialState().sand,
    })),

  setConcrete: (partial) =>
    set((s) => ({ concrete: { ...s.concrete, ...partial } })),
  addConcreteElement: (elementType = "slab") => {
    const el = defaultConcreteElement(elementType);
    set((s) => ({
      concrete: { ...s.concrete, elements: [...s.concrete.elements, el] },
    }));
    return el.id;
  },
  patchConcreteElement: (id, patch) =>
    set((s) => ({
      concrete: {
        ...s.concrete,
        elements: s.concrete.elements.map((el) =>
          el.id === id ? { ...el, ...patch } : el,
        ),
      },
    })),
  removeConcreteElement: (id) =>
    set((s) => ({
      concrete: {
        ...s.concrete,
        elements: s.concrete.elements.filter((el) => el.id !== id),
      },
    })),
  calculateConcrete: () => {
    const { elements, materials } = get().concrete;
    try {
      const result = calculateConcreteElements(elements, materials);
      set((s) => ({ concrete: { ...s.concrete, result }, toast: null }));
    } catch (e) {
      const msg =
        e instanceof ConcreteError ? e.message : `${e}`;
      set({ toast: { variant: "err", text: msg } });
    }
  },
  resetConcrete: () =>
    set(() => ({
      concrete: createInitialState().concrete,
    })),

  setLand: (partial) => set((s) => ({ land: { ...s.land, ...partial } })),
  calculateLand: () => {
    const st = get();
    const L = st.land;
    const linkedReactor = st.earthworksFromReactors
      ? computeReactorGeometry(st.reactors)
      : null;
    try {
      const result = calculateLandPrep({
        platforms: L.platforms,
        trenches: L.trenches.map((t) => ({
          ...t,
          count: Math.max(0, Math.trunc(t.count)),
        })),
        liftThicknessCm: L.liftThicknessCm,
        passesPerLift: Math.max(1, Math.trunc(L.passesPerLift)),
        costPerM3Cut: L.costPerM3Cut,
        costPerM2Pass: L.costPerM2Pass,
        reactorExcavationVolumeM3: linkedReactor?.totalExcavationVolumeM3 ?? 0,
        reactorCompactionAreaM2: linkedReactor?.totalExcavationFootprintM2 ?? 0,
      });
      set((s) => ({ land: { ...s.land, result }, toast: null }));
    } catch (e) {
      const msg =
        e instanceof LandPrepError ? e.message : `${e}`;
      set({ toast: { variant: "err", text: msg } });
    }
  },
  resetLand: () =>
    set(() => ({
      land: createInitialState().land,
    })),

  addPlatform: () => {
    const p = defaultPlatform(`Platform ${Date.now() % 1000}`);
    set((s) => ({
      land: { ...s.land, platforms: [...s.land.platforms, p] },
    }));
    return p.id;
  },
  patchPlatform: (id: string, patch: Partial<EarthworksPlatform>) =>
    set((s) => ({
      land: {
        ...s.land,
        platforms: s.land.platforms.map((p) =>
          p.id === id ? { ...p, ...patch } : p,
        ),
      },
    })),
  removePlatform: (id: string) =>
    set((s) => ({
      land: {
        ...s.land,
        platforms: s.land.platforms.filter((p) => p.id !== id),
      },
    })),
  addTrenchGroup: () => {
    const t = defaultTrenchGroup(`Trench ${Date.now() % 1000}`);
    set((s) => ({ land: { ...s.land, trenches: [...s.land.trenches, t] } }));
    return t.id;
  },
  patchTrenchGroup: (id: string, patch: Partial<EarthworksTrenchGroup>) =>
    set((s) => ({
      land: {
        ...s.land,
        trenches: s.land.trenches.map((t) =>
          t.id === id ? { ...t, ...patch } : t,
        ),
      },
    })),
  removeTrenchGroup: (id: string) =>
    set((s) => ({
      land: {
        ...s.land,
        trenches: s.land.trenches.filter((t) => t.id !== id),
      },
    })),

  setManpower: (partial) =>
    set((s) => ({
      manpower: {
        ...s.manpower,
        ...partial,
        rows: partial.rows !== undefined ? partial.rows : s.manpower.rows,
        schedule:
          partial.schedule !== undefined ? partial.schedule : s.manpower.schedule,
        overheads:
          partial.overheads !== undefined
            ? partial.overheads
            : s.manpower.overheads,
      },
    })),
  addManpowerRow: (trade) => {
    const cfg = get().config;
    const tradeName = trade ?? "General Labourer";
    const row = defaultManpowerRow(
      tradeName,
      manpowerRateForTrade(tradeName, cfg),
    );
    set((s) => ({
      manpower: { ...s.manpower, rows: [...s.manpower.rows, row] },
    }));
    return row.id;
  },
  patchManpowerRow: (id, patch) =>
    set((s) => ({
      manpower: {
        ...s.manpower,
        rows: s.manpower.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    })),
  removeManpowerRow: (id) =>
    set((s) => ({
      manpower: {
        ...s.manpower,
        rows: s.manpower.rows.filter((r) => r.id !== id),
      },
    })),
  calculateManpower: () => {
    const m = get().manpower;
    try {
      const result = calculateManpower({
        rows: m.rows,
        schedule: m.schedule,
        overheads: m.overheads,
      });
      set((s) => ({ manpower: { ...s.manpower, result }, toast: null }));
    } catch (e) {
      const msg =
        e instanceof ManpowerError ? e.message : `${e}`;
      set({ toast: { variant: "err", text: msg } });
    }
  },
  resetManpower: () =>
    set(() => ({
      manpower: createInitialState().manpower,
    })),

  setEquipment: (partial) =>
    set((s) => ({ equipment: { ...s.equipment, ...partial } })),
  addEquipmentRow: (presetIndex) => {
    const preset =
      presetIndex !== undefined
        ? get().config.equipmentPresets[presetIndex]
        : undefined;
    const row = defaultEquipmentRow(preset);
    set((s) => ({
      equipment: { ...s.equipment, rows: [...s.equipment.rows, row] },
    }));
    return row.id;
  },
  patchEquipmentRow: (id, patch) =>
    set((s) => ({
      equipment: {
        ...s.equipment,
        rows: s.equipment.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    })),
  removeEquipmentRow: (id) =>
    set((s) => ({
      equipment: {
        ...s.equipment,
        rows: s.equipment.rows.filter((r) => r.id !== id),
      },
    })),
  calculateEquipment: () => {
    const e = get().equipment;
    try {
      const result = calculateEquipment({
        rows: e.rows,
        days: Math.trunc(e.days),
        hoursPerDay: e.hoursPerDay,
        fuelPriceUsdL: e.fuelPriceUsdL,
        mobilisationUsd: e.mobilisationUsd,
        demobilisationUsd: e.demobilisationUsd,
        dailyPlantOverheadUsd: e.dailyPlantOverheadUsd,
        miscPlantUsd: e.miscPlantUsd,
      });
      set((s) => ({ equipment: { ...s.equipment, result }, toast: null }));
    } catch (err) {
      const msg =
        err instanceof EquipmentError ? err.message : `${err}`;
      set({ toast: { variant: "err", text: msg } });
    }
  },
  resetEquipment: () =>
    set(() => ({
      equipment: createInitialState().equipment,
    })),
}));
