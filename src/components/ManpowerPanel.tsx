import { useProjectStore } from "@/store/projectStore";
import { DisciplineQuoteBar } from "@/components/planner/DisciplineQuoteBar";
import {
  MANPOWER_DEFAULT_RATES_USD_H,
  MANPOWER_TRADES,
} from "@/domain/calculate/manpower";
import { usd } from "@/components/planner/formatters";
import {
  Btn,
  Field,
  HelpIcon,
  Panel,
  GhostNumberInput,
  PlannerHeadRow,
  PlannerTh,
  PlannerThead,
  plannerTableClass,
} from "@/components/planner/ui";

const TRADE_HELP: Record<string, string> = {
  Foreman: "Site foreman / lead — runs the crew, sets out work, signs off quality.",
  Mason: "Block-layer or bricklayer building walls and arches.",
  "Steel fixer": "Reinforcement-cage assembly and placement for concrete elements.",
  Carpenter: "Formwork construction, prop setting and strike-off.",
  "Concrete worker":
    "Pours, screeds and finishes concrete — also handles vibration and curing.",
  Plumber: "Process and sanitary piping, fittings and pressure testing.",
  Electrician: "Electrical installation, cabling, terminations and earthing.",
  "Equipment operator":
    "Operator for excavator, roller, telehandler or other site plant.",
  Welder: "MIG/TIG/stick welding for structural and process pipework.",
  "General labourer":
    "Unskilled / semi-skilled site help — material handling, clean-up, mixing.",
};

const SCHEDULE_HELP: Record<string, string> = {
  days: "Total calendar working days for this trade-mix on site.",
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
  const calc = useProjectStore((s) => s.calculateManpower);
  const reset = useProjectStore((s) => s.resetManpower);

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <Panel title="Trades">
        <div className="overflow-x-auto">
          <table className={plannerTableClass("min-w-[480px]")}>
            <PlannerThead>
              <PlannerHeadRow>
                <PlannerTh>Trade</PlannerTh>
                <PlannerTh align="right">Workers</PlannerTh>
                <PlannerTh align="right">USD/h</PlannerTh>
              </PlannerHeadRow>
            </PlannerThead>
            <tbody>
              {MANPOWER_TRADES.map((trade, idx) => (
                <tr key={trade} className="border-b border-zinc-800">
                  <td className="max-w-[12rem] py-2 pr-3 text-xs text-zinc-300">
                    <span className="inline-flex items-center gap-1.5">
                      {trade}
                      {TRADE_HELP[trade] ?
                        <HelpIcon text={TRADE_HELP[trade]} />
                      : null}
                    </span>
                  </td>
                  <td className="py-2">
                    <GhostNumberInput
                      min={0}
                      integer
                      value={manpower.trades[idx]?.workers ?? 0}
                      onChange={(nv) => {
                        const next = manpower.trades.map((t, j) =>
                          j === idx ? { workers: nv, rateUsdH: t.rateUsdH } : t,
                        );
                        setManpower({ trades: next });
                      }}
                    />
                  </td>
                  <td className="py-2">
                    <GhostNumberInput
                      step={0.5}
                      value={
                        manpower.trades[idx]?.rateUsdH ??
                        MANPOWER_DEFAULT_RATES_USD_H[idx] ??
                        5
                      }
                      onChange={(nv) => {
                        const next = manpower.trades.map((t, j) =>
                          j === idx ?
                            { workers: t.workers, rateUsdH: nv }
                          : t,
                        );
                        setManpower({ trades: next });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Schedule">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["Working days", "days"],
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
