import clsx from "clsx";

import { useProjectStore } from "@/store/projectStore";
import { qty, usd } from "@/components/planner/formatters";
import { DisciplineQuoteBar } from "@/components/planner/DisciplineQuoteBar";
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

const HELP = {
  blockSize:
    "Brand/size of the breeze block being supplied. Drives the per-block face area used to compute pallet & block counts.",
  costPerBlock:
    "Net delivered cost per individual block, USD. Quotes from the merchant including delivery to site.",
  groupLabel:
    "Free-text name for this group of identical walls/arcs (e.g. 'Boundary east', 'Reactor enclosure').",
  wallLength: "Length of one wall in this group, metres.",
  wallHeight: "Height of one wall in this group, metres.",
  wallCount: "How many identical walls of these dimensions are built.",
  arcRadius:
    "Radius of the half-arc wall, metres (used to compute the half-circumference π·R).",
  arcHeight: "Vertical height of the arc wall, metres.",
  arcCount: "How many identical half-arc walls.",
};

function ReactorEnvelopeReadout() {
  const reactors = useProjectStore((s) => s.reactors);
  return (
    <Panel title="Reactor walls (from Reactors tab)">
      <p className="mb-3 text-xs text-zinc-400">
        Reactor envelope (length, width, wall height, count) is managed
        centrally on the Reactors tab. The blocks needed for the
        race-track walls are added automatically.
      </p>
      <ul className="grid gap-1 text-sm text-zinc-300 sm:grid-cols-2">
        <li>Count: {reactors.count}</li>
        <li>Length L: {reactors.lengthM} m</li>
        <li>Width W: {reactors.widthM} m</li>
        <li>Wall height H: {reactors.wallHeightM} m</li>
      </ul>
    </Panel>
  );
}

export function BreezePanel(props: { blockNames: string[] }) {
  const breeze = useProjectStore((s) => s.breeze);
  const set = useProjectStore((s) => s.setBreeze);
  const onBlock = useProjectStore((s) => s.onBreezeBlockName);
  const calc = useProjectStore((s) => s.calculateBreeze);
  const reset = useProjectStore((s) => s.resetBreeze);

  const addWall = useProjectStore((s) => s.addBreezeWallGroup);
  const patchWall = useProjectStore((s) => s.patchBreezeWallGroup);
  const removeWall = useProjectStore((s) => s.removeBreezeWallGroup);
  const addArc = useProjectStore((s) => s.addBreezeArcGroup);
  const patchArc = useProjectStore((s) => s.patchBreezeArcGroup);
  const removeArc = useProjectStore((s) => s.removeBreezeArcGroup);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Panel title="Block selection">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Block size" help={HELP.blockSize}>
            <select
              className={clsx(numInputCls(), "max-w-none")}
              value={breeze.blockName}
              onChange={(ev) => onBlock(ev.target.value)}
            >
              {props.blockNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cost per block (USD)" help={HELP.costPerBlock}>
            <GhostNumberInput
              step={0.0001}
              value={breeze.costPerBlock}
              onChange={(n) => set({ costPerBlock: n })}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Straight wall groups">
        <p className="mb-3 text-xs text-zinc-400">
          Add a row for each batch of identical walls (boundary, internal,
          partition, etc.). Disabled rows stay in the project but don't add
          blocks.
        </p>
        <div className="overflow-x-auto">
          <table className={plannerTableClass("min-w-[640px]")}>
            <PlannerThead>
              <PlannerHeadRow>
                <PlannerTh className={plannerColOn}>On</PlannerTh>
                <PlannerTh>
                  Group <HelpIcon text={HELP.groupLabel} />
                </PlannerTh>
                <UnitTh label="Length" unit="m" help={HELP.wallLength} />
                <UnitTh label="Height" unit="m" help={HELP.wallHeight} />
                <UnitTh label="Count" unit="#" help={HELP.wallCount} size="sm" />
                <PlannerTh align="center" className={plannerColActions}>
                  <span className="sr-only">Actions</span>
                </PlannerTh>
              </PlannerHeadRow>
            </PlannerThead>
            <tbody>
              {breeze.walls.map((w) => (
                <tr
                  key={w.id}
                  className={clsx(
                    "border-b border-zinc-900/80 align-top",
                    !w.enabled && "opacity-50",
                  )}
                >
                  <PlannerTd align="center" className={plannerColOn}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-teal-500"
                      checked={w.enabled}
                      onChange={(ev) =>
                        patchWall(w.id, { enabled: ev.target.checked })
                      }
                      aria-label={`Enable ${w.label}`}
                    />
                  </PlannerTd>
                  <td className="py-2 pr-2">
                    <input
                      className={clsx(numInputCls(), "min-w-[180px]")}
                      type="text"
                      value={w.label}
                      onChange={(ev) =>
                        patchWall(w.id, { label: ev.target.value })
                      }
                    />
                  </td>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.001}
                      value={w.lengthM}
                      onChange={(n) => patchWall(w.id, { lengthM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.001}
                      value={w.heightM}
                      onChange={(n) => patchWall(w.id, { heightM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumericSm}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      min={0}
                      integer
                      value={w.count}
                      onChange={(n) => patchWall(w.id, { count: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColActions}>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => removeWall(w.id)}
                    >
                      remove
                    </button>
                  </PlannerTd>
                </tr>
              ))}
              {breeze.walls.length === 0 ?
                <tr>
                  <td colSpan={6} className="py-3 text-center text-xs text-zinc-500">
                    No straight walls — add one below if you need any.
                  </td>
                </tr>
              : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Btn onClick={() => addWall()}>+ Add wall group</Btn>
        </div>
      </Panel>

      <Panel title="Half-circle arc groups">
        <p className="mb-3 text-xs text-zinc-400">
          Half-circle arc walls — typical use is reactor end caps that are not
          on the central Reactors tab (e.g. a small standalone tank).
        </p>
        <div className="overflow-x-auto">
          <table className={plannerTableClass("min-w-[640px]")}>
            <PlannerThead>
              <PlannerHeadRow>
                <PlannerTh className={plannerColOn}>On</PlannerTh>
                <PlannerTh>
                  Group <HelpIcon text={HELP.groupLabel} />
                </PlannerTh>
                <UnitTh label="Radius" unit="m" help={HELP.arcRadius} />
                <UnitTh label="Height" unit="m" help={HELP.arcHeight} />
                <UnitTh label="Count" unit="#" help={HELP.arcCount} size="sm" />
                <PlannerTh align="center" className={plannerColActions}>
                  <span className="sr-only">Actions</span>
                </PlannerTh>
              </PlannerHeadRow>
            </PlannerThead>
            <tbody>
              {breeze.arcs.map((a) => (
                <tr
                  key={a.id}
                  className={clsx(
                    "border-b border-zinc-900/80 align-top",
                    !a.enabled && "opacity-50",
                  )}
                >
                  <PlannerTd align="center" className={plannerColOn}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-teal-500"
                      checked={a.enabled}
                      onChange={(ev) =>
                        patchArc(a.id, { enabled: ev.target.checked })
                      }
                      aria-label={`Enable ${a.label}`}
                    />
                  </PlannerTd>
                  <td className="py-2 pr-2">
                    <input
                      className={clsx(numInputCls(), "min-w-[180px]")}
                      type="text"
                      value={a.label}
                      onChange={(ev) =>
                        patchArc(a.id, { label: ev.target.value })
                      }
                    />
                  </td>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.001}
                      value={a.radiusM}
                      onChange={(n) => patchArc(a.id, { radiusM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.001}
                      value={a.heightM}
                      onChange={(n) => patchArc(a.id, { heightM: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColNumericSm}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      min={0}
                      integer
                      value={a.count}
                      onChange={(n) => patchArc(a.id, { count: n })}
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColActions}>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => removeArc(a.id)}
                    >
                      remove
                    </button>
                  </PlannerTd>
                </tr>
              ))}
              {breeze.arcs.length === 0 ?
                <tr>
                  <td colSpan={6} className="py-3 text-center text-xs text-zinc-500">
                    No arc groups.
                  </td>
                </tr>
              : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Btn onClick={() => addArc()}>+ Add arc group</Btn>
        </div>
      </Panel>

      <ReactorEnvelopeReadout />

      <div className="flex gap-2">
        <Btn primary onClick={() => calc()}>
          Calculate
        </Btn>
        <Btn onClick={() => reset()}>Reset</Btn>
      </div>

      <DisciplineQuoteBar
        discipline="blocks"
        rawUsd={breeze.result?.totalCostUsd ?? 0}
        label="Blockwork quote classification"
      />

      {breeze.result ?
        <Panel title="Results">
          <ul className="grid gap-1 text-sm text-zinc-300">
            <li>Straight wall area: {qty(breeze.result.wallAreaM2, "m²", 2)}</li>
            <li>Arc wall area: {qty(breeze.result.arcAreaM2, "m²", 2)}</li>
            <li>Reactor area: {qty(breeze.result.reactorAreaM2, "m²", 2)}</li>
            <li className="font-semibold text-teal-200">
              Total area: {qty(breeze.result.totalAreaM2, "m²", 2)}
            </li>
            <li>
              Blocks: {breeze.result.blocksRequired.toLocaleString()} —
              pallets: {breeze.result.palletsRequired} — leftover blocks:{" "}
              {breeze.result.leftoverBlocks}
            </li>
            <li className="text-lg font-bold text-teal-300">
              {usd(breeze.result.totalCostUsd)}
            </li>
          </ul>
          {breeze.result.wallGroups.length + breeze.result.arcGroups.length >
          0 ?
            <details className="mt-2 text-xs text-zinc-400">
              <summary className="cursor-pointer text-zinc-300">
                Per-group breakdown
              </summary>
              <ul className="mt-2 grid gap-1">
                {breeze.result.wallGroups.map((g) => (
                  <li key={g.id}>
                    Wall · {g.label}: {qty(g.areaM2, "m²", 2)} ·{" "}
                    {g.blocks.toLocaleString()} blocks · {usd(g.costUsd)}
                  </li>
                ))}
                {breeze.result.arcGroups.map((g) => (
                  <li key={g.id}>
                    Arc · {g.label}: {qty(g.areaM2, "m²", 2)} ·{" "}
                    {g.blocks.toLocaleString()} blocks · {usd(g.costUsd)}
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
