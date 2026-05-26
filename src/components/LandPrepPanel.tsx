import clsx from "clsx";
import { useMemo } from "react";

import { useProjectStore } from "@/store/projectStore";
import { DisciplineQuoteBar } from "@/components/planner/DisciplineQuoteBar";
import { usd } from "@/components/planner/formatters";
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
import { computeReactorGeometry } from "@/domain/calculate/reactors";

const HELP = {
  link:
    "When enabled, the Reactors tab supplies the bulk excavation volume and compaction footprint for the reactor pads.",
  groupLabel:
    "Free-text name for this section (e.g. 'Reactor pad east', 'Ops room slab').",
  platformArea:
    "Disturbed plan area for this pad/cut, m². Surveyor area, not the building footprint.",
  platformDepth: "Depth of cut below natural ground, cm.",
  trenchLength: "Length of one trench in this group, metres.",
  trenchWidth: "Width of one trench, metres (excavator bucket width).",
  trenchDepth: "Depth of trench below natural ground, cm.",
  trenchCount:
    "Number of identical trenches in this group (set 0 to disable without removing).",
  compactionTarget:
    "Modified Proctor target percentage. 95% is a common spec for slab subgrade.",
  liftThickness:
    "Layer thickness in cm placed and compacted at a time. Smaller lifts = more passes.",
  rollerWidth: "Effective working width of the roller drum, metres.",
  passesPerLift:
    "Number of roller passes required to achieve the target density on each lift.",
  costPerM3Cut:
    "All-in unit rate for cut + haul + disposal of material, USD per m³.",
  costPerM2Pass:
    "Unit rate for one roller pass over one m² of compaction surface, USD.",
};

export function LandPrepPanel() {
  const l = useProjectStore((s) => s.land);
  const setLand = useProjectStore((s) => s.setLand);
  const calc = useProjectStore((s) => s.calculateLand);
  const reset = useProjectStore((s) => s.resetLand);
  const reactors = useProjectStore((s) => s.reactors);
  const linked = useProjectStore((s) => s.earthworksFromReactors);
  const setLinked = useProjectStore((s) => s.setEarthworksFromReactors);
  const geom = useMemo(() => computeReactorGeometry(reactors), [reactors]);

  const addPlatform = useProjectStore((s) => s.addPlatform);
  const patchPlatform = useProjectStore((s) => s.patchPlatform);
  const removePlatform = useProjectStore((s) => s.removePlatform);
  const addTrench = useProjectStore((s) => s.addTrenchGroup);
  const patchTrench = useProjectStore((s) => s.patchTrenchGroup);
  const removeTrench = useProjectStore((s) => s.removeTrenchGroup);

  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <Panel title="Reactor excavation link">
        <label className="flex items-start gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-teal-500"
            checked={linked}
            onChange={(ev) => setLinked(ev.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium">
              Use reactors from the Reactors tab
              <HelpIcon text={HELP.link} />
            </span>
            <span className="block text-xs text-zinc-400">
              {reactors.count} reactor pad
              {reactors.count === 1 ? "" : "s"} at{" "}
              {reactors.excavationDepthCm} cm depth add bulk excavation volume
              and compaction area on top of any platforms / trenches below.
            </span>
          </span>
        </label>
        {linked ?
          <ul className="mt-3 grid gap-1 text-xs text-zinc-400 sm:grid-cols-2">
            <li>
              Excavation footprint (total):{" "}
              <span className="text-zinc-200">
                {geom.totalExcavationFootprintM2.toFixed(2)} m²
              </span>
            </li>
            <li>
              Excavation volume (total):{" "}
              <span className="text-zinc-200">
                {geom.totalExcavationVolumeM3.toFixed(2)} m³
              </span>
            </li>
          </ul>
        : null}
      </Panel>

      <Panel title="Platform cuts">
        <p className="mb-3 text-xs text-zinc-400">
          Add a row for each platform / pad outside the reactor footprints —
          access tracks, ops-room pad, drier slab, hard standings, etc.
        </p>
        <div className="overflow-x-auto">
          <table className={plannerTableClass("min-w-[640px]")}>
            <PlannerThead>
              <PlannerHeadRow>
                <PlannerTh className={plannerColOn}>On</PlannerTh>
                <PlannerTh>
                  Label <HelpIcon text={HELP.groupLabel} />
                </PlannerTh>
                <UnitTh label="Area" unit="m²" help={HELP.platformArea} />
                <UnitTh label="Depth" unit="cm" help={HELP.platformDepth} />
                <PlannerTh align="center" className={plannerColActions}>
                  <span className="sr-only">Actions</span>
                </PlannerTh>
              </PlannerHeadRow>
            </PlannerThead>
            <tbody>
              {l.platforms.map((p) => (
                <tr
                  key={p.id}
                  className={clsx(
                    "border-b border-zinc-900/80 align-top",
                    !p.enabled && "opacity-50",
                  )}
                >
                  <PlannerTd align="center" className={plannerColOn}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-teal-500"
                      checked={p.enabled}
                      onChange={(ev) =>
                        patchPlatform(p.id, { enabled: ev.target.checked })
                      }
                    />
                  </PlannerTd>
                  <td className="py-2 pr-2">
                    <input
                      className={clsx(numInputCls(), "min-w-[200px]")}
                      type="text"
                      value={p.label}
                      onChange={(ev) =>
                        patchPlatform(p.id, { label: ev.target.value })
                      }
                    />
                  </td>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.1}
                      value={p.areaM2}
                      onChange={(n) => patchPlatform(p.id, { areaM2: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.1}
                      value={p.depthCm}
                      onChange={(n) => patchPlatform(p.id, { depthCm: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColActions}>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => removePlatform(p.id)}
                    >
                      remove
                    </button>
                  </PlannerTd>
                </tr>
              ))}
              {l.platforms.length === 0 ?
                <tr>
                  <td colSpan={5} className="py-3 text-center text-xs text-zinc-500">
                    No platforms — add one below.
                  </td>
                </tr>
              : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Btn onClick={() => addPlatform()}>+ Add platform</Btn>
        </div>
      </Panel>

      <Panel title="Trench groups">
        <p className="mb-3 text-xs text-zinc-400">
          One row per type of service trench (electrical, plumbing, drainage).
          Set Count to 0 to mute without removing.
        </p>
        <div className="overflow-x-auto">
          <table className={plannerTableClass("min-w-[720px]")}>
            <PlannerThead>
              <PlannerHeadRow>
                <PlannerTh className={plannerColOn}>On</PlannerTh>
                <PlannerTh>
                  Label <HelpIcon text={HELP.groupLabel} />
                </PlannerTh>
                <UnitTh label="Length" unit="m" help={HELP.trenchLength} />
                <UnitTh label="Width" unit="m" help={HELP.trenchWidth} />
                <UnitTh label="Depth" unit="cm" help={HELP.trenchDepth} />
                <UnitTh label="Count" unit="#" help={HELP.trenchCount} size="sm" />
                <PlannerTh align="center" className={plannerColActions}>
                  <span className="sr-only">Actions</span>
                </PlannerTh>
              </PlannerHeadRow>
            </PlannerThead>
            <tbody>
              {l.trenches.map((t) => (
                <tr
                  key={t.id}
                  className={clsx(
                    "border-b border-zinc-900/80 align-top",
                    !t.enabled && "opacity-50",
                  )}
                >
                  <PlannerTd align="center" className={plannerColOn}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-teal-500"
                      checked={t.enabled}
                      onChange={(ev) =>
                        patchTrench(t.id, { enabled: ev.target.checked })
                      }
                    />
                  </PlannerTd>
                  <td className="py-2 pr-2">
                    <input
                      className={clsx(numInputCls(), "min-w-[200px]")}
                      type="text"
                      value={t.label}
                      onChange={(ev) =>
                        patchTrench(t.id, { label: ev.target.value })
                      }
                    />
                  </td>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.1}
                      value={t.lengthM}
                      onChange={(n) => patchTrench(t.id, { lengthM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.01}
                      value={t.widthM}
                      onChange={(n) => patchTrench(t.id, { widthM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={1}
                      value={t.depthCm}
                      onChange={(n) => patchTrench(t.id, { depthCm: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumericSm}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      min={0}
                      integer
                      value={t.count}
                      onChange={(n) => patchTrench(t.id, { count: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColActions}>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => removeTrench(t.id)}
                    >
                      remove
                    </button>
                  </PlannerTd>
                </tr>
              ))}
              {l.trenches.length === 0 ?
                <tr>
                  <td colSpan={7} className="py-3 text-center text-xs text-zinc-500">
                    No trench groups — add one below if needed.
                  </td>
                </tr>
              : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Btn onClick={() => addTrench()}>+ Add trench group</Btn>
        </div>
      </Panel>

      <Panel title="Compaction & rates">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Compaction target %" help={HELP.compactionTarget}>
            <GhostNumberInput
              value={l.compactionTargetPct}
              onChange={(n) => setLand({ compactionTargetPct: n })}
            />
          </Field>
          <Field label="Lift thickness (cm)" help={HELP.liftThickness}>
            <GhostNumberInput
              value={l.liftThicknessCm}
              onChange={(n) => setLand({ liftThicknessCm: n })}
            />
          </Field>
          <Field label="Roller width (m)" help={HELP.rollerWidth}>
            <GhostNumberInput
              step={0.1}
              value={l.rollerWidthM}
              onChange={(n) => setLand({ rollerWidthM: n })}
            />
          </Field>
          <Field label="Passes per lift" help={HELP.passesPerLift}>
            <GhostNumberInput
              min={1}
              integer
              value={l.passesPerLift}
              onChange={(n) => setLand({ passesPerLift: n })}
            />
          </Field>
          <Field label="Excavate USD/m³" help={HELP.costPerM3Cut}>
            <GhostNumberInput
              step={0.01}
              value={l.costPerM3Cut}
              onChange={(n) => setLand({ costPerM3Cut: n })}
            />
          </Field>
          <Field label="Compaction USD/(m²·pass)" help={HELP.costPerM2Pass}>
            <GhostNumberInput
              step={0.0001}
              value={l.costPerM2Pass}
              onChange={(n) => setLand({ costPerM2Pass: n })}
            />
          </Field>
        </div>
      </Panel>

      <div className="flex gap-2">
        <Btn primary onClick={() => calc()}>
          Calculate
        </Btn>
        <Btn onClick={() => reset()}>Reset</Btn>
      </div>

      <DisciplineQuoteBar
        discipline="earthworks"
        rawUsd={l.result?.totalCostUsd ?? 0}
        label="Earthworks quote classification"
      />

      {l.result ?
        <Panel title="Results">
          <ul className="text-sm leading-relaxed text-zinc-300">
            <li>Platform volume: {l.result.platformVolumeM3.toFixed(3)} m³</li>
            <li>Trench volume: {l.result.trenchVolumeM3.toFixed(3)} m³</li>
            <li>
              Reactor pad volume: {l.result.reactorVolumeM3.toFixed(3)} m³
            </li>
            <li>Total cut volume: {l.result.totalCutVolumeM3.toFixed(3)} m³</li>
            <li>
              Lifts: platform {l.result.liftsPlatform}, trench{" "}
              {l.result.liftsTrench} — compaction area-pass{" "}
              {l.result.totalAreaPassesM2.toFixed(2)}
            </li>
            <li className="text-lg font-bold text-teal-300">
              Total {usd(l.result.totalCostUsd)}
            </li>
          </ul>
          {l.result.platformGroups.length + l.result.trenchGroups.length > 0 ?
            <details className="mt-2 text-xs text-zinc-400">
              <summary className="cursor-pointer text-zinc-300">
                Per-group breakdown
              </summary>
              <ul className="mt-2 grid gap-1">
                {l.result.platformGroups.map((g) => (
                  <li key={g.id}>
                    Platform · {g.label}: {g.volumeM3.toFixed(2)} m³ ·{" "}
                    {g.compactionAreaM2.toFixed(2)} m² · {usd(g.costUsd)}
                  </li>
                ))}
                {l.result.trenchGroups.map((g) => (
                  <li key={g.id}>
                    Trench · {g.label}: {g.volumeM3.toFixed(2)} m³ ·{" "}
                    {g.compactionAreaM2.toFixed(2)} m² · {usd(g.costUsd)}
                  </li>
                ))}
              </ul>
            </details>
          : null}
        </Panel>
      : null}
    </div>
  );
}
