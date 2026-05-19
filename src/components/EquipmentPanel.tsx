import { useProjectStore } from "@/store/projectStore";
import { DisciplineQuoteBar } from "@/components/planner/DisciplineQuoteBar";
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

const FLEET_HELP = {
  name: "Description of the piece of plant (e.g. '20-tonne excavator', 'Single-drum roller').",
  count: "Number of units of this machine on site at the same time.",
  rate:
    "All-in hire rate per machine-hour, USD/h (includes operator if quoted that way).",
  fuel:
    "Average fuel consumption per machine, litres per hour. Use the manufacturer's figure or supplier estimate.",
  util:
    "Utilisation factor — % of each working hour the machine is actually under load (50–80% is typical).",
};

const SCHEDULE_HELP = {
  days: "Working days the fleet is on hire.",
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
  const rowPatch = useProjectStore((s) => s.updateEquipRow);
  const calc = useProjectStore((s) => s.calculateEquipment);
  const reset = useProjectStore((s) => s.resetEquipment);

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <Panel title="Fleet">
        <div className="overflow-x-auto">
          <table className={plannerTableClass("min-w-[640px] text-xs")}>
            <PlannerThead>
              <PlannerHeadRow>
                <PlannerTh>
                  Name <HelpIcon text={FLEET_HELP.name} />
                </PlannerTh>
                <PlannerTh align="right">
                  Units <HelpIcon text={FLEET_HELP.count} />
                </PlannerTh>
                <PlannerTh align="right">
                  USD/h <HelpIcon text={FLEET_HELP.rate} />
                </PlannerTh>
                <PlannerTh align="right">
                  L/h <HelpIcon text={FLEET_HELP.fuel} />
                </PlannerTh>
                <PlannerTh align="right">
                  % <HelpIcon text={FLEET_HELP.util} />
                </PlannerTh>
              </PlannerHeadRow>
            </PlannerThead>
            <tbody>
              {eq.rows.map((r, idx) => (
                <tr key={idx} className="border-b border-zinc-800">
                  <td className="py-2 pr-2">
                    <input className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100"
                      type="text"
                      value={r.name}
                      onChange={(e) =>
                        rowPatch(idx, { name: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <GhostNumberInput
                      min={0}
                      integer
                      value={r.count}
                      onChange={(n) => rowPatch(idx, { count: n })}
                    />
                  </td>
                  <td className="py-2">
                    <GhostNumberInput
                      step={5}
                      value={r.rateUsdH}
                      onChange={(n) => rowPatch(idx, { rateUsdH: n })}
                    />
                  </td>
                  <td className="py-2">
                    <GhostNumberInput
                      step={0.5}
                      value={r.fuelLH}
                      onChange={(n) => rowPatch(idx, { fuelLH: n })}
                    />
                  </td>
                  <td className="py-2">
                    <GhostNumberInput
                      step={5}
                      value={r.utilPct}
                      onChange={(n) => rowPatch(idx, { utilPct: n })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Operating schedule">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Days" help={SCHEDULE_HELP.days}>
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
