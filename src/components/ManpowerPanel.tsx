import { useState } from "react";
import clsx from "clsx";

import { useProjectStore } from "@/store/projectStore";
import { DisciplineQuoteBar } from "@/components/planner/DisciplineQuoteBar";
import {
  MANPOWER_TRADES,
  defaultRateForTrade,
} from "@/domain/calculate/manpower";
import { usd } from "@/components/planner/formatters";
import {
  Btn,
  Field,
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

const SCHEDULE_HELP: Record<string, string> = {
  days:
    "Default working days on site. Used for any crew line where Days on site is left blank.",
  hoursNormalPerDay: "Normal (non-overtime) productive hours per working day.",
  hoursOtPerDay:
    "Additional overtime hours beyond the normal shift, per working day.",
  otFactor:
    "Overtime cost multiplier (1.5 = 'time-and-a-half', 2.0 = 'double time').",
};

const OVERHEAD_HELP: Record<string, string> = {
  mobilisationUsd:
    "One-off cost to bring crews and tools to site at project start.",
  demobilisationUsd:
    "One-off cost to release crews and demob equipment from site.",
  dailyOverheadUsd:
    "Site overhead recurring per working day (PPE, water, supervision share).",
  miscUsd: "Catch-all allowance for unmodelled labour costs.",
};

export function ManpowerPanel() {
  const manpower = useProjectStore((s) => s.manpower);
  const setManpower = useProjectStore((s) => s.setManpower);
  const addRow = useProjectStore((s) => s.addManpowerRow);
  const patchRow = useProjectStore((s) => s.patchManpowerRow);
  const removeRow = useProjectStore((s) => s.removeManpowerRow);
  const calc = useProjectStore((s) => s.calculateManpower);
  const reset = useProjectStore((s) => s.resetManpower);

  const [addChoice, setAddChoice] = useState("");

  const defaultDaysLabel = String(manpower.schedule.days);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4">
      <Panel title="Crew list">
        <p className="mb-3 text-xs text-zinc-400">
          Add trades one at a time. Each line can have its own days on site —
          leave Days blank to use the default working days from the schedule
          below ({defaultDaysLabel} days).
        </p>
        <table className={plannerTableClass("min-w-0")}>
          <PlannerThead>
            <PlannerHeadRow>
              <PlannerTh className={plannerColOn}>On</PlannerTh>
              <PlannerTh className="min-w-0">Trade</PlannerTh>
              <PlannerTh align="center" className={plannerColNumericSm}>
                Workers
              </PlannerTh>
              <PlannerTh align="center" className={plannerColNumeric}>
                USD/h
              </PlannerTh>
              <PlannerTh align="center" className={plannerColNumericSm}>
                Days on site
              </PlannerTh>
              <PlannerTh align="center" className={plannerColActions}>
                <span className="sr-only">Actions</span>
              </PlannerTh>
            </PlannerHeadRow>
          </PlannerThead>
          <tbody>
            {manpower.rows.map((row) => (
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
                    aria-label={`Enable ${row.trade}`}
                  />
                </PlannerTd>
                <td className="min-w-0 px-1 py-2">
                  <input
                    className={clsx(numInputCls(), "min-w-0 w-full max-w-none")}
                    type="text"
                    list="manpower-trade-presets"
                    value={row.trade}
                    onChange={(ev) => {
                      const trade = ev.target.value;
                      patchRow(row.id, {
                        trade,
                        rateUsdH: defaultRateForTrade(trade),
                      });
                    }}
                  />
                </td>
                <PlannerTd align="center" className={plannerColNumericSm}>
                  <GhostNumberInput
                    className={plannerTableNumericInputCls()}
                    min={0}
                    integer
                    value={row.workers}
                    onChange={(n) => patchRow(row.id, { workers: n })}
                  />
                </PlannerTd>
                <PlannerTd align="center" className={plannerColNumeric}>
                  <GhostNumberInput
                    className={plannerTableNumericInputCls()}
                    step={0.5}
                    value={row.rateUsdH}
                    onChange={(n) => patchRow(row.id, { rateUsdH: n })}
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
            {manpower.rows.length === 0 ?
              <tr>
                <td
                  colSpan={6}
                  className="py-3 text-center text-xs text-zinc-500"
                >
                  No crew lines yet — choose a trade preset or add a custom line
                  below.
                </td>
              </tr>
            : null}
          </tbody>
        </table>
        <datalist id="manpower-trade-presets">
          {MANPOWER_TRADES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Add crew line
            </span>
            <select
              className={clsx(numInputCls(), "max-w-none")}
              value={addChoice}
              onChange={(ev) => setAddChoice(ev.target.value)}
            >
              <option value="">Select preset or custom…</option>
              {MANPOWER_TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__custom__">Custom blank line…</option>
            </select>
          </label>
          <Btn
            disabled={addChoice === ""}
            onClick={() => {
              if (addChoice === "__custom__") addRow("Custom trade");
              else addRow(addChoice);
              setAddChoice("");
            }}
          >
            Add
          </Btn>
        </div>
      </Panel>
      <Panel title="Schedule defaults">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Default working days", "days"],
              ["Normal h/day", "hoursNormalPerDay"],
              ["OT h/day", "hoursOtPerDay"],
              ["OT factor", "otFactor"],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={label} help={SCHEDULE_HELP[key]}>
              <GhostNumberInput
                step={key === "days" ? 1 : 0.25}
                value={manpower.schedule[key]}
                onChange={(n) =>
                  setManpower({
                    schedule: { ...manpower.schedule, [key]: n },
                  })
                }
              />
            </Field>
          ))}
        </div>
      </Panel>
      <Panel title="Mobilisation & overheads">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["Mobilisation (USD)", "mobilisationUsd"],
              ["Demobilisation (USD)", "demobilisationUsd"],
              ["Daily overhead (USD/day)", "dailyOverheadUsd"],
              ["Misc allow. (USD)", "miscUsd"],
            ] as const
          ).map(([lb, ky]) => (
            <Field key={ky} label={lb} help={OVERHEAD_HELP[ky]}>
              <GhostNumberInput
                step={10}
                value={manpower.overheads[ky]}
                onChange={(n) =>
                  setManpower({
                    overheads: { ...manpower.overheads, [ky]: n },
                  })
                }
              />
            </Field>
          ))}
        </div>
      </Panel>
      <div className="flex gap-2">
        <Btn primary onClick={() => calc()}>Calculate</Btn>
        <Btn onClick={() => reset()}>Reset</Btn>
      </div>
      <DisciplineQuoteBar
        discipline="manpower"
        rawUsd={manpower.result?.grandTotalUsd ?? 0}
        label="Manpower quote classification"
      />
      {manpower.result ?
        <Panel title="Totals">
          <ul className="text-sm leading-relaxed text-zinc-300">
            <li>
              Man-hours: {manpower.result.totalManhours.toFixed(1)} h —
              labour {usd(manpower.result.totalLabourCostUsd)}
            </li>
            <li>Mobilisation bundle: {usd(manpower.result.mobCostUsd)}</li>
            <li>Overheads/misc bundle: {usd(manpower.result.overheadCostUsd)}</li>
            <li className="text-lg font-bold text-teal-300">
              {usd(manpower.result.grandTotalUsd)}
            </li>
          </ul>
          <pre className="mt-4 max-h-96 overflow-auto rounded bg-zinc-950 p-3 text-xs whitespace-pre-wrap text-zinc-500">
            {manpower.result.breakdownLines.join("\n")}
          </pre>
        </Panel>
      : null}
    </div>
  );
}
