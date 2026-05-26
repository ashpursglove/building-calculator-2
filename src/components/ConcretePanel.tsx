import clsx from "clsx";
import { useEffect, useState } from "react";

import { useProjectStore } from "@/store/projectStore";
import { DisciplineQuoteBar } from "@/components/planner/DisciplineQuoteBar";
import { qty, usd } from "@/components/planner/formatters";
import {
  Btn,
  Field,
  HelpIcon,
  Panel,
  UnitTh,
  GhostNumberInput,
  PlannerHeadRow,
  PlannerTd,
  PlannerTh,
  PlannerThead,
  numInputCls,
  plannerColActions,
  plannerColNumeric,
  plannerColNumericSm,
  plannerColOn,
  plannerTableClass,
  plannerTableNumericInputCls,
} from "@/components/planner/ui";
import { CONCRETE_ELEMENT_LABELS } from "@/domain/concreteKinds";
import type { ConcreteElementType } from "@/domain/calculate/concrete";
import {
  REBAR_DENSITY_PRESETS,
  type RebarDensityPresetId as ConcreteRebarPresetId,
} from "@/domain/calculate/concrete";
import {
  rebarDensityKgM3ForPreset,
  rebarDensityPresetForValue,
  type RebarDensityPresetId,
} from "@/domain/plannerConfig";

const ELEMENT_TYPES: ConcreteElementType[] = [
  "slab",
  "strip",
  "wall",
  "isolated",
];

const HELP = {
  label: "Name for this pour (e.g. 'Reactor slab', 'Ops room footing').",
  type: "Structural element type — drives which dimension fields apply.",
  length: "Length of the element, metres.",
  width: "Width of the element, metres (slab, strip, isolated footing).",
  height: "Wall height, metres (walls only).",
  thickness: "Concrete thickness, centimetres.",
  count: "Number of identical elements (slab, wall, isolated footing).",
};

export function ConcretePanel() {
  const c = useProjectStore((s) => s.concrete);
  const setConcrete = useProjectStore((s) => s.setConcrete);
  const addEl = useProjectStore((s) => s.addConcreteElement);
  const patchEl = useProjectStore((s) => s.patchConcreteElement);
  const removeEl = useProjectStore((s) => s.removeConcreteElement);
  const calc = useProjectStore((s) => s.calculateConcrete);
  const reset = useProjectStore((s) => s.resetConcrete);
  const rebarPresets = useProjectStore((s) => s.config.rebarDensityKgM3);

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <Panel title="Concrete elements">
        <p className="mb-3 text-xs text-zinc-400">
          Add each concrete component separately — slab bases, strip footings,
          walls, isolated pads, etc. Disabled rows stay in the project but are
          excluded from totals.
        </p>
        <div className="overflow-x-auto">
          <table className={plannerTableClass("min-w-[900px]")}>
            <PlannerThead>
              <PlannerHeadRow>
                <PlannerTh className={plannerColOn}>On</PlannerTh>
                <PlannerTh>
                  Label <HelpIcon text={HELP.label} />
                </PlannerTh>
                <PlannerTh>
                  Type <HelpIcon text={HELP.type} />
                </PlannerTh>
                <UnitTh label="Length" unit="m" help={HELP.length} />
                <UnitTh label="Width" unit="m" help={HELP.width} />
                <UnitTh label="Height" unit="m" help={HELP.height} />
                <UnitTh label="Depth" unit="cm" help={HELP.thickness} />
                <UnitTh label="Count" unit="#" help={HELP.count} size="sm" />
                <PlannerTh align="center" className={plannerColActions}>
                  <span className="sr-only">Actions</span>
                </PlannerTh>
              </PlannerHeadRow>
            </PlannerThead>
            <tbody>
              {c.elements.map((el) => (
                <tr
                  key={el.id}
                  className={clsx(
                    "border-b border-zinc-900/80 align-top",
                    !el.enabled && "opacity-50",
                  )}
                >
                  <PlannerTd align="center" className={plannerColOn}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-teal-500"
                      checked={el.enabled}
                      onChange={(ev) =>
                        patchEl(el.id, { enabled: ev.target.checked })
                      }
                    />
                  </PlannerTd>
                  <td className="py-2 pr-2">
                    <input
                      className={clsx(numInputCls(), "min-w-[160px]")}
                      type="text"
                      value={el.label}
                      onChange={(ev) =>
                        patchEl(el.id, { label: ev.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      className={clsx(numInputCls(), "max-w-[150px]")}
                      value={el.elementType}
                      onChange={(ev) =>
                        patchEl(el.id, {
                          elementType: ev.target.value as ConcreteElementType,
                        })
                      }
                    >
                      {ELEMENT_TYPES.map((t, idx) => (
                        <option key={t} value={t}>
                          {CONCRETE_ELEMENT_LABELS[idx]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.001}
                      value={el.lengthM}
                      onChange={(n) => patchEl(el.id, { lengthM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls(
                        el.elementType === "wall" ? "opacity-40" : undefined,
                      )}
                      step={0.001}
                      value={el.widthM}
                      disabled={el.elementType === "wall"}
                      onChange={(n) => patchEl(el.id, { widthM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls(
                        el.elementType !== "wall" ? "opacity-40" : undefined,
                      )}
                      step={0.001}
                      value={el.heightM}
                      disabled={el.elementType !== "wall"}
                      onChange={(n) => patchEl(el.id, { heightM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.1}
                      value={el.thicknessCm}
                      onChange={(n) => patchEl(el.id, { thicknessCm: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumericSm}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls(
                        el.elementType === "strip" ? "opacity-40" : undefined,
                      )}
                      min={0}
                      integer
                      value={el.count}
                      disabled={el.elementType === "strip"}
                      onChange={(n) => patchEl(el.id, { count: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColActions}>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => removeEl(el.id)}
                    >
                      remove
                    </button>
                  </PlannerTd>
                </tr>
              ))}
              {c.elements.length === 0 ?
                <tr>
                  <td
                    colSpan={9}
                    className="py-3 text-center text-xs text-zinc-500"
                  >
                    No concrete elements — add one below.
                  </td>
                </tr>
              : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ELEMENT_TYPES.map((t, idx) => (
            <Btn key={t} onClick={() => addEl(t)}>
              + {CONCRETE_ELEMENT_LABELS[idx]}
            </Btn>
          ))}
        </div>
      </Panel>

      <Panel title="Materials (shared)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Concrete density (kg/m³)"
            help="Wet density of fresh concrete, kg/m³."
          >
            <GhostNumberInput
              step={1}
              value={c.materials.densityKgM3}
              onChange={(n) =>
                setConcrete({
                  materials: { ...c.materials, densityKgM3: n },
                })
              }
            />
          </Field>
          <Field
            label="Concrete USD/m³"
            help="Delivered concrete unit cost, USD per cubic metre."
          >
            <GhostNumberInput
              step={0.01}
              value={c.materials.costUsdM3}
              onChange={(n) =>
                setConcrete({
                  materials: { ...c.materials, costUsdM3: n },
                })
              }
            />
          </Field>
        </div>

        <div className="mt-4 border-t border-zinc-800 pt-4">
          <h3 className="mb-3 text-sm font-medium text-teal-200/90">Rebar</h3>
          <RebarMaterialsFields
            rebarKgM3={c.materials.rebarKgM3}
            rebarCostUsdT={c.materials.rebarCostUsdT}
            rebarPresets={rebarPresets}
            onChange={(patch) =>
              setConcrete({
                materials: { ...c.materials, ...patch },
              })
            }
          />
        </div>
      </Panel>

      <div className="flex gap-2">
        <Btn primary onClick={() => calc()}>
          Calculate
        </Btn>
        <Btn onClick={() => reset()}>Reset</Btn>
      </div>

      <DisciplineQuoteBar
        discipline="concrete"
        rawUsd={c.result?.totalCostUsd ?? 0}
        label="Concrete quote classification"
      />

      {c.result ?
        <Panel title="Concrete results">
          <ul className="text-sm leading-relaxed text-zinc-300">
            <li>Total volume: {qty(c.result.volumeM3, "m³", 3)}</li>
            <li>
              Conc. weight ~{Math.round(c.result.concWeightKg)} kg — concrete{" "}
              {usd(c.result.concCostUsd)} — rebar {usd(c.result.rebarCostUsd)}
            </li>
            <li className="text-lg font-bold text-teal-300">
              {usd(c.result.totalCostUsd)}
            </li>
          </ul>
          {c.result.elements.length > 0 ?
            <details className="mt-2 text-xs text-zinc-400">
              <summary className="cursor-pointer text-zinc-300">
                Per-element breakdown
              </summary>
              <ul className="mt-2 grid gap-1">
                {c.result.elements.map((row) => (
                  <li key={row.id}>
                    {row.label}: {qty(row.volumeM3, "m³", 3)} ·{" "}
                    {usd(row.totalCostUsd)}
                  </li>
                ))}
              </ul>
            </details>
          : null}
        </Panel>
      : null}

      <SweetSandSection />
    </div>
  );
}

function RebarMaterialsFields(props: {
  rebarKgM3: number;
  rebarCostUsdT: number;
  rebarPresets: { low: number; medium: number; high: number };
  onChange: (patch: Partial<{ rebarKgM3: number; rebarCostUsdT: number }>) => void;
}) {
  const derivedPreset = rebarDensityPresetForValue(
    props.rebarKgM3,
    props.rebarPresets,
  );
  const [mode, setMode] = useState<RebarDensityPresetId | "custom">(derivedPreset);

  useEffect(() => {
    setMode(rebarDensityPresetForValue(props.rebarKgM3, props.rebarPresets));
  }, [props.rebarKgM3, props.rebarPresets]);

  const densityHelp =
    mode === "custom"
      ? "Choose Custom to enter a project-specific steel content in kg/m³."
      : REBAR_DENSITY_PRESETS[mode as ConcreteRebarPresetId].help;

  const presetOptions: { id: RebarDensityPresetId; label: string; kgM3: number }[] = [
    { id: "low", label: "Low", kgM3: props.rebarPresets.low },
    { id: "medium", label: "Medium", kgM3: props.rebarPresets.medium },
    { id: "high", label: "High", kgM3: props.rebarPresets.high },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Rebar density" help={densityHelp}>
        <select
          className={clsx(numInputCls(), "max-w-none")}
          value={mode}
          onChange={(ev) => {
            const next = ev.target.value as RebarDensityPresetId | "custom";
            if (next === "custom") {
              setMode("custom");
              return;
            }
            setMode(next);
            props.onChange({
              rebarKgM3: rebarDensityKgM3ForPreset(next, props.rebarPresets),
            });
          }}
        >
          {presetOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.kgM3} kg/m³
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
      </Field>
      {mode === "custom" ?
        <Field
          label="Custom rebar (kg/m³)"
          help="Kg of reinforcement steel per m³ of concrete."
        >
          <GhostNumberInput
            step={0.5}
            min={0}
            value={props.rebarKgM3}
            onChange={(n) => props.onChange({ rebarKgM3: n })}
          />
        </Field>
      : null}
      <Field
        label="Rebar USD/t"
        help="Rebar unit cost in USD per tonne."
      >
        <GhostNumberInput
          step={0.01}
          value={props.rebarCostUsdT}
          onChange={(n) => props.onChange({ rebarCostUsdT: n })}
        />
      </Field>
    </div>
  );
}

function SweetSandSection() {
  const s = useProjectStore((sx) => sx.sand);
  const setSand = useProjectStore((sx) => sx.setSand);
  const calc = useProjectStore((sx) => sx.calculateSand);
  const reset = useProjectStore((sx) => sx.resetSand);

  return (
    <div className="grid gap-4 border-t border-zinc-800 pt-6">
      <h3 className="text-base font-semibold tracking-tight text-teal-300">
        Sweet sand (bedding)
      </h3>
      <p className="-mt-3 text-xs text-zinc-400">
        Geometry is entered manually — it is not auto-derived from the Reactors
        tab so you can keep bedding planning independent of the reactor footprint.
      </p>
      <Panel title="Sand geometry">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Overall length (m)"
            help="Plan length of the bedded area, metres."
          >
            <GhostNumberInput
              step={0.001}
              value={s.lengthTotalM}
              onChange={(n) => setSand({ lengthTotalM: n })}
            />
          </Field>
          <Field label="Width (m)" help="Plan width of the bedded area, metres.">
            <GhostNumberInput
              step={0.001}
              value={s.widthM}
              onChange={(n) => setSand({ widthM: n })}
            />
          </Field>
          <Field
            label="Fill height (cm)"
            help="Loose-laid sand thickness, centimetres."
          >
            <GhostNumberInput
              step={0.1}
              value={s.fillHeightCm}
              onChange={(n) => setSand({ fillHeightCm: n })}
            />
          </Field>
          <Field
            label="Corner radius (cm)"
            help="Radius at bedded area corners; 0 = rectangle."
          >
            <GhostNumberInput
              step={0.1}
              value={s.cornerRadiusCm}
              onChange={(n) => setSand({ cornerRadiusCm: n })}
            />
          </Field>
        </div>
      </Panel>
      <Panel title="Sand material">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Bulk density (kg/m³)"
            help="Sweet-sand bulk density (≈1500–1700 kg/m³)."
          >
            <GhostNumberInput
              step={1}
              value={s.bulkDensityKgM3}
              onChange={(n) => setSand({ bulkDensityKgM3: n })}
            />
          </Field>
          <Field
            label="Cost / tonne (USD)"
            help="Delivered sweet-sand unit cost, USD per tonne."
          >
            <GhostNumberInput
              step={0.1}
              value={s.costPerTonneUsd}
              onChange={(n) => setSand({ costPerTonneUsd: n })}
            />
          </Field>
        </div>
      </Panel>
      <div className="flex gap-2">
        <Btn primary onClick={() => calc()}>
          Calculate sand
        </Btn>
        <Btn onClick={() => reset()}>Reset sand</Btn>
      </div>
      <DisciplineQuoteBar
        discipline="sand"
        rawUsd={s.result?.totalCostUsd ?? 0}
        label="Sweet sand quote classification"
      />
      {s.result ?
        <Panel title="Sand results">
          <ul className="grid gap-1 text-sm">
            <li>Plan area: {qty(s.result.planAreaM2, "m²", 2)}</li>
            <li>Base volume: {qty(s.result.volumeBaseM3, "m³", 3)}</li>
            <li>Corner volume: {qty(s.result.volumeCornerM3, "m³", 3)}</li>
            <li className="font-semibold">
              Total volume: {qty(s.result.volumeTotalM3, "m³", 3)}
            </li>
            <li>
              Weight: {Math.round(s.result.weightKg).toLocaleString()} kg (
              {s.result.weightTons.toFixed(3)} t)
            </li>
            <li className="text-lg font-bold text-teal-300">
              {usd(s.result.totalCostUsd)}
            </li>
          </ul>
        </Panel>
      : null}
    </div>
  );
}
