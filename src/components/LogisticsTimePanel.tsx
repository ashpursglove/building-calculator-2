import clsx from "clsx";
import { useMemo } from "react";

import { useProjectStore } from "@/store/projectStore";
import { usd } from "@/components/planner/formatters";
import { LineItemTable } from "@/components/planner/LineItemTable";
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
  plannerColCapNumeric,
  plannerColCapNumericLg,
  plannerColCapNumericSm,
  plannerColCapSelect,
  plannerColCapSelectWide,
  plannerColOn,
  plannerTableClass,
  plannerTableNumericInputCls,
} from "@/components/planner/ui";
import {
  COST_CENTER_LABELS,
  type CostCenter,
  type GdtWorkGroup,
  type MarginTier,
} from "@/domain/calculate/lineItems";
import { marginTierLabels } from "@/domain/plannerConfig";

const WORK_GROUPS: GdtWorkGroup[] = ["Engineering", "Site Ops", "Bio Ops"];

const WORK_GROUP_HELP: Record<GdtWorkGroup, string> = {
  Engineering:
    "Design / drafting / specification work performed by GDT engineering staff.",
  "Site Ops":
    "Project management & on-site supervision performed by GDT site team.",
  "Bio Ops":
    "Biology / inoculation / growth support performed by GDT bio-ops staff.",
};

const TASK_HELP =
  "Free-text task name (e.g. 'Form working plans', 'Site visits by PM').";
const DAYS_HELP = "Number of GDT person-days for this task.";
const OVERRIDE_HELP =
  "Optional per-task day rate that overrides the work group's default rate. Leave blank to use the work group rate.";

export function LogisticsTimePanel() {
  return (
    <div className="mx-auto grid min-w-0 w-full max-w-6xl gap-4">
      <LineItemTable
        category="logistics"
        title="Logistics & travel"
        description="Flights, freight/logistics per reactor, customs — typically GDT scope."
      />
      <LineItemTable
        category="training"
        title="Training & handover"
        description="Walkthroughs, training in Jeddah, SOP production — GDT high-margin lines."
      />
      <GdtTimeSection />
    </div>
  );
}

function GdtTimeSection() {
  const items = useProjectStore((s) => s.gdtTime.items);
  const rates = useProjectStore((s) => s.gdtTime.rates);
  const patch = useProjectStore((s) => s.patchGdtTimeItem);
  const add = useProjectStore((s) => s.addGdtTimeItem);
  const remove = useProjectStore((s) => s.removeGdtTimeItem);
  const setRate = useProjectStore((s) => s.setGdtTimeRate);
  const marginPct = useProjectStore((s) => s.config.marginTierPct);
  const marginLabels = useMemo(
    () => marginTierLabels(marginPct),
    [marginPct],
  );

  let totalDays = 0;
  let raw = 0;
  let withMargin = 0;
  for (const item of items) {
    if (!item.enabled) continue;
    const days = Math.max(0, item.days);
    const rate =
      item.dayRateOverrideUsd !== null ?
        item.dayRateOverrideUsd
      : rates[item.workGroup];
    const cost = days * rate;
    totalDays += days;
    raw += cost;
    withMargin += cost * (1 + marginPct[item.marginTier] / 100);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-teal-200">
          GDT internal time
        </h2>
        <div className="text-xs text-zinc-400">
          {totalDays} day{totalDays === 1 ? "" : "s"} ·{" "}
          <span className="text-zinc-200">{usd(raw)}</span> raw ·{" "}
          <span className="text-teal-300">{usd(withMargin)}</span> with margin
        </div>
      </header>

      <Panel title="Day rates by work group (USD/day)">
        <div className="grid gap-3 sm:grid-cols-3">
          {WORK_GROUPS.map((g) => (
            <Field key={g} label={g} help={WORK_GROUP_HELP[g]}>
              <GhostNumberInput
                step={1}
                min={0}
                value={rates[g]}
                onChange={(n) => setRate(g, n)}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <table className={clsx("mt-4", plannerTableClass("min-w-0"))}>
          <PlannerThead>
            <PlannerHeadRow>
              <PlannerTh className={plannerColOn}>On</PlannerTh>
              <PlannerTh className="min-w-0">
                Task <HelpIcon text={TASK_HELP} />
              </PlannerTh>
              <PlannerTh align="center" className={plannerColCapNumericSm}>
                Days <HelpIcon text={DAYS_HELP} />
              </PlannerTh>
              <PlannerTh className={plannerColCapSelectWide}>Work group</PlannerTh>
              <PlannerTh align="center" className={plannerColCapNumeric}>
                Override $/day <HelpIcon text={OVERRIDE_HELP} />
              </PlannerTh>
              <PlannerTh className={plannerColCapSelectWide}>Cost center</PlannerTh>
              <PlannerTh className={plannerColCapSelect}>Margin</PlannerTh>
              <PlannerTh align="center" className={plannerColCapNumericLg}>
                Raw / quote
              </PlannerTh>
              <PlannerTh align="center" className={plannerColActions}>
                <span className="sr-only">Actions</span>
              </PlannerTh>
            </PlannerHeadRow>
          </PlannerThead>
          <tbody>
            {items.map((item) => {
              const rate =
                item.dayRateOverrideUsd !== null ?
                  item.dayRateOverrideUsd
                : rates[item.workGroup];
              const raw = Math.max(0, item.days) * rate;
              const sub = raw * (1 + marginPct[item.marginTier] / 100);
              return (
                <tr
                  key={item.id}
                  className={clsx(
                    "border-b border-zinc-900/80 align-top",
                    !item.enabled && "opacity-50",
                  )}
                >
                  <PlannerTd align="center" className={plannerColOn}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-teal-500"
                      checked={item.enabled}
                      onChange={(ev) =>
                        patch(item.id, { enabled: ev.target.checked })
                      }
                      aria-label={`Enable ${item.label}`}
                    />
                  </PlannerTd>
                  <td className="min-w-0 px-1 py-2">
                    <input
                      className={clsx(numInputCls(), "min-w-0 w-full max-w-none")}
                      type="text"
                      value={item.label}
                      onChange={(ev) =>
                        patch(item.id, { label: ev.target.value })
                      }
                    />
                  </td>
                  <PlannerTd align="center" className={plannerColCapNumericSm}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.5}
                      min={0}
                      value={item.days}
                      onChange={(n) => patch(item.id, { days: n })}
                    />
                  </PlannerTd>
                  <td className={clsx("px-1 py-2", plannerColCapSelectWide)}>
                    <select
                      className={clsx(numInputCls(), "w-full max-w-none text-xs")}
                      value={item.workGroup}
                      onChange={(ev) =>
                        patch(item.id, {
                          workGroup: ev.target.value as GdtWorkGroup,
                        })
                      }
                    >
                      {WORK_GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>
                  <PlannerTd align="center" className={plannerColCapNumeric}>
                    <GhostOptionalNumberInput
                      className={plannerTableNumericInputCls()}
                      step={1}
                      min={0}
                      value={item.dayRateOverrideUsd}
                      onChange={(n) =>
                        patch(item.id, { dayRateOverrideUsd: n })
                      }
                    />
                  </PlannerTd>
                  <td className={clsx("px-1 py-2", plannerColCapSelectWide)}>
                    <select
                      className={clsx(numInputCls(), "w-full max-w-none text-xs")}
                      value={item.costCenter}
                      onChange={(ev) =>
                        patch(item.id, {
                          costCenter: ev.target.value as CostCenter,
                        })
                      }
                    >
                      <option value="gdt">{COST_CENTER_LABELS.gdt}</option>
                      <option value="contractor">
                        {COST_CENTER_LABELS.contractor}
                      </option>
                    </select>
                  </td>
                  <td className={clsx("px-1 py-2", plannerColCapSelect)}>
                    <select
                      className={clsx(numInputCls(), "w-full max-w-none text-xs")}
                      value={item.marginTier}
                      onChange={(ev) =>
                        patch(item.id, {
                          marginTier: ev.target.value as MarginTier,
                        })
                      }
                    >
                      {(["none", "low", "med", "high"] as const).map((tier) => (
                        <option key={tier} value={tier}>
                          {marginLabels[tier]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <PlannerTd align="center" className={plannerColCapNumericLg}>
                    <div className="font-mono text-zinc-300">{usd(raw)}</div>
                    <div className="font-mono text-xs text-teal-300">{usd(sub)}</div>
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColActions}>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => remove(item.id)}
                    >
                      remove
                    </button>
                  </PlannerTd>
                </tr>
              );
            })}
            {items.length === 0 ?
              <tr>
                <td colSpan={9} className="py-3 text-center text-xs text-zinc-500">
                  No GDT time tasks — add one below.
                </td>
              </tr>
            : null}
          </tbody>
        </table>

      <div className="mt-3 flex gap-2">
        <Btn onClick={() => add()}>+ Add task</Btn>
      </div>
    </section>
  );
}
