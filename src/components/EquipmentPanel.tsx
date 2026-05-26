import { useState } from "react";
import clsx from "clsx";

import { useProjectStore } from "@/store/projectStore";
import { DisciplineQuoteBar } from "@/components/planner/DisciplineQuoteBar";
import { usd } from "@/components/planner/formatters";
import {
  Btn,
  Field,
  HelpIcon,
  Panel,
  GhostNumberInput,
  GhostOptionalNumberInput,
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

const FLEET_HELP = {
  name: "Description of the piece of plant (e.g. '20-tonne excavator', 'Single-drum roller').",
  count: "Number of units of this machine on site at the same time.",
  rate:
    "All-in hire rate per machine-hour, USD/h (includes operator if quoted that way).",
  fuel:
    "Average fuel consumption per machine, litres per hour. Use the manufacturer's figure or supplier estimate.",
  util:
    "Utilisation factor — % of each working hour the machine is actually under load (50–80% is typical).",
  days:
    "Days this plant item is on hire. Leave blank to use the default working days from the schedule below.",
};

const SCHEDULE_HELP = {
  days:
    "Default working days on hire. Used for any fleet line where Days on site is left blank.",
  hoursPerDay: "Working hours per machine per day (typical shift length).",
  fuelPriceUsdL: "Delivered diesel price at site, USD/litre.",
};

const OVERHEAD_HELP = {
  mob: "One-off cost to deliver the plant fleet to site.",
  demob: "One-off cost to return the fleet at the end of the works.",
  daily:
    "Daily plant overhead (servicing, lubricants, minor consumables) USD/day.",
  misc: "Catch-all allowance for unmodelled plant costs.",
};

export function EquipmentPanel() {
  const eq = useProjectStore((s) => s.equipment);
  const setEq = useProjectStore((s) => s.setEquipment);
  const addRow = useProjectStore((s) => s.addEquipmentRow);
  const patchRow = useProjectStore((s) => s.patchEquipmentRow);
  const removeRow = useProjectStore((s) => s.removeEquipmentRow);
  const calc = useProjectStore((s) => s.calculateEquipment);
  const reset = useProjectStore((s) => s.resetEquipment);
  const equipmentPresets = useProjectStore((s) => s.config.equipmentPresets);

  const [addChoice, setAddChoice] = useState("");
  const defaultDaysLabel = String(eq.days);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4">
      <Panel title="Fleet">
        <p className="mb-3 text-xs text-zinc-400">
          Add plant one line at a time. Each item can have its own days on site
          — leave Days blank to use the default from the schedule below (
          {defaultDaysLabel} days).
        </p>
        <table className={clsx(plannerTableClass("min-w-0"), "text-xs")}>
          <PlannerThead>
            <PlannerHeadRow>
              <PlannerTh className={plannerColOn}>On</PlannerTh>
              <PlannerTh className="min-w-0">
                Name <HelpIcon text={FLEET_HELP.name} />
              </PlannerTh>
              <PlannerTh align="center" className={plannerColNumericSm}>
                Units <HelpIcon text={FLEET_HELP.count} />
              </PlannerTh>
              <PlannerTh align="center" className={plannerColNumeric}>
                USD/h <HelpIcon text={FLEET_HELP.rate} />
              </PlannerTh>
              <PlannerTh align="center" className={plannerColNumeric}>
                L/h <HelpIcon text={FLEET_HELP.fuel} />
              </PlannerTh>
              <PlannerTh align="center" className={plannerColNumericSm}>
                % <HelpIcon text={FLEET_HELP.util} />
              </PlannerTh>
              <PlannerTh align="center" className={plannerColNumericSm}>
                Days <HelpIcon text={FLEET_HELP.days} />
              </PlannerTh>
              <PlannerTh align="center" className={plannerColActions}>
                <span className="sr-only">Actions</span>
              </PlannerTh>
            </PlannerHeadRow>
          </PlannerThead>
          <tbody>
            {eq.rows.map((row) => (
              <tr
                key={row.id}
                className={clsx(
                  "border-b border-zinc-800",
                  !row.enabled && "opacity-50",
                )}
              >
                <PlannerTd align="center" className={plannerColOn}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-teal-500"
                    checked={row.enabled}
                    onChange={(ev) =>
                      patchRow(row.id, { enabled: ev.target.checked })
                    }
                    aria-label={`Enable ${row.name}`}
                  />
                </PlannerTd>
                <td className="min-w-0 px-1 py-2">
                  <input
                    className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                    type="text"
                    value={row.name}
                    onChange={(e) =>
                      patchRow(row.id, { name: e.target.value })
                    }
                  />
                </td>
                <PlannerTd align="center" className={plannerColNumericSm}>
                  <GhostNumberInput
                    className={plannerTableNumericInputCls()}
                    min={0}
                    integer
                    value={row.count}
                    onChange={(n) => patchRow(row.id, { count: n })}
                  />
                </PlannerTd>
                <PlannerTd align="center" className={plannerColNumeric}>
                  <GhostNumberInput
                    className={plannerTableNumericInputCls()}
                    step={5}
                    value={row.rateUsdH}
                    onChange={(n) => patchRow(row.id, { rateUsdH: n })}
                  />
                </PlannerTd>
                <PlannerTd align="center" className={plannerColNumeric}>
                  <GhostNumberInput
                    className={plannerTableNumericInputCls()}
                    step={0.5}
                    value={row.fuelLH}
                    onChange={(n) => patchRow(row.id, { fuelLH: n })}
                  />
                </PlannerTd>
                <PlannerTd align="center" className={plannerColNumericSm}>
                  <GhostNumberInput
                    className={plannerTableNumericInputCls()}
                    step={5}
                    value={row.utilPct}
                    onChange={(n) => patchRow(row.id, { utilPct: n })}
                  />
                </PlannerTd>
                <PlannerTd align="center" className={plannerColNumericSm}>
                  <GhostOptionalNumberInput
                    className={plannerTableNumericInputCls()}
                    step={1}
                    min={1}
                    emptyPlaceholder={defaultDaysLabel}
                    value={row.daysOverride}
                    onChange={(n) => patchRow(row.id, { daysOverride: n })}
                  />
                </PlannerTd>
                <PlannerTd align="center" className={plannerColActions}>
                  <button
                    type="button"
                    className="text-xs text-rose-400 hover:text-rose-300"
                    onClick={() => removeRow(row.id)}
                  >
                    remove
                  </button>
                </PlannerTd>
              </tr>
            ))}
            {eq.rows.length === 0 ?
              <tr>
                <td
                  colSpan={8}
                  className="py-3 text-center text-xs text-zinc-500"
                >
                  No fleet lines yet — choose a preset or add a custom line
                  below.
                </td>
              </tr>
            : null}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Add fleet line
            </span>
            <select
              className={clsx(numInputCls(), "max-w-none")}
              value={addChoice}
              onChange={(ev) => setAddChoice(ev.target.value)}
            >
              <option value="">Select preset or custom…</option>
              {equipmentPresets.map((p, idx) => (
                <option key={p.name} value={String(idx)}>
                  {p.name}
                </option>
              ))}
              <option value="__custom__">Custom blank line…</option>
            </select>
          </label>
          <Btn
            disabled={addChoice === ""}
            onClick={() => {
              if (addChoice === "__custom__") addRow();
              else addRow(Number(addChoice));
              setAddChoice("");
            }}
          >
            Add
          </Btn>
        </div>
      </Panel>
      <Panel title="Operating schedule defaults">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Default working days" help={SCHEDULE_HELP.days}>
            <GhostNumberInput
              min={1}
              integer
              value={eq.days}
              onChange={(n) => setEq({ days: n })}
            />
          </Field>
          <Field label="Hours / day" help={SCHEDULE_HELP.hoursPerDay}>
            <GhostNumberInput
              step={0.5}
              value={eq.hoursPerDay}
              onChange={(n) => setEq({ hoursPerDay: n })}
            />
          </Field>
          <Field label="Fuel USD/L" help={SCHEDULE_HELP.fuelPriceUsdL}>
            <GhostNumberInput
              step={0.005}
              value={eq.fuelPriceUsdL}
              onChange={(n) => setEq({ fuelPriceUsdL: n })}
            />
          </Field>
        </div>
      </Panel>
      <Panel title="Overheads">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mobilisation (USD)" help={OVERHEAD_HELP.mob}>
            <GhostNumberInput
              value={eq.mobilisationUsd}
              onChange={(n) => setEq({ mobilisationUsd: n })}
            />
          </Field>
          <Field label="Demobilisation (USD)" help={OVERHEAD_HELP.demob}>
            <GhostNumberInput
              value={eq.demobilisationUsd}
              onChange={(n) => setEq({ demobilisationUsd: n })}
            />
          </Field>
          <Field label="Daily plant OH (USD/day)" help={OVERHEAD_HELP.daily}>
            <GhostNumberInput
              value={eq.dailyPlantOverheadUsd}
              onChange={(n) => setEq({ dailyPlantOverheadUsd: n })}
            />
          </Field>
          <Field label="Misc plant (USD)" help={OVERHEAD_HELP.misc}>
            <GhostNumberInput
              value={eq.miscPlantUsd}
              onChange={(n) => setEq({ miscPlantUsd: n })}
            />
          </Field>
        </div>
      </Panel>
      <div className="flex gap-2">
        <Btn primary onClick={() => calc()}>Calculate</Btn>
        <Btn onClick={() => reset()}>Reset</Btn>
      </div>
      <DisciplineQuoteBar
        discipline="equipment"
        rawUsd={eq.result?.grandTotalUsd ?? 0}
        label="Equipment quote classification"
      />
      {eq.result ?
        <Panel title="Results">
          <ul className="text-sm leading-relaxed text-zinc-300">
            <li>
              Effective hours {eq.result.totalHours.toFixed(1)} h — hire{" "}
              {usd(eq.result.totalHireCostUsd)} — litres{" "}
              {eq.result.totalFuelLitres.toFixed(1)}
            </li>
            <li className="text-lg font-bold text-teal-300">
              Total {usd(eq.result.grandTotalUsd)}
            </li>
          </ul>
          <pre className="mt-4 max-h-96 overflow-auto rounded bg-zinc-950 p-3 text-xs whitespace-pre-wrap text-zinc-500">
            {eq.result.breakdownLines.join("\n")}
          </pre>
        </Panel>
      : null}
    </div>
  );
}
