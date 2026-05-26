import { useMemo, useState } from "react";
import clsx from "clsx";

import { useProjectStore } from "@/store/projectStore";
import { usd } from "@/components/planner/formatters";
import {
  Btn,
  GhostNumberInput,
  HelpIcon,
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
  lineItemRawCost,
  type CostCenter,
  type LineItem,
  type LineItemCategory,
  type LineItemMode,
  type MarginTier,
} from "@/domain/calculate/lineItems";
import { marginTierLabels } from "@/domain/plannerConfig";
import { LINE_ITEM_PRESETS } from "@/domain/calculate/lineItemPresets";

interface Props {
  category: LineItemCategory;
  title: string;
  description?: string;
}

const MODE_LABELS: Record<LineItemMode, string> = {
  per_reactor: "per reactor",
  lump: "lump",
};

export function LineItemTable({ category, title, description }: Props) {
  const allItems = useProjectStore((s) => s.lineItems);
  const items = useMemo(
    () => allItems.filter((li) => li.category === category),
    [allItems, category],
  );
  const reactorCount = useProjectStore((s) => s.reactors.count);
  const patchItem = useProjectStore((s) => s.patchLineItem);
  const removeItem = useProjectStore((s) => s.removeLineItem);
  const addItem = useProjectStore((s) => s.addLineItem);
  const addFromPreset = useProjectStore((s) => s.addLineItemFromPreset);
  const marginPct = useProjectStore((s) => s.config.marginTierPct);
  const marginLabels = useMemo(
    () => marginTierLabels(marginPct),
    [marginPct],
  );

  const presets = LINE_ITEM_PRESETS[category];
  const hasPresets = presets.length > 0;
  const [addChoice, setAddChoice] = useState("");

  let raw = 0;
  let withMargin = 0;
  for (const item of items) {
    const c = lineItemRawCost(item, reactorCount);
    raw += c;
    withMargin += c * (1 + marginPct[item.marginTier] / 100);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-teal-200">{title}</h2>
        <div className="text-xs text-zinc-400">
          {items.length} item{items.length === 1 ? "" : "s"} · GDT internal{" "}
          <span className="text-zinc-200">{usd(raw)}</span> · client quote{" "}
          <span className="text-teal-300">{usd(withMargin)}</span>
        </div>
      </header>
      {description ?
        <p className="-mt-2 mb-3 text-xs text-zinc-500">{description}</p>
      : null}

      <table className={plannerTableClass("min-w-0")}>
          <PlannerThead>
            <PlannerHeadRow>
              <PlannerTh className={plannerColOn}>On</PlannerTh>
              <PlannerTh className="min-w-0">Item</PlannerTh>
              <PlannerTh className={plannerColCapSelect}>Mode</PlannerTh>
              <PlannerTh align="center" className={plannerColCapNumeric}>
                Unit USD
              </PlannerTh>
              <PlannerTh align="center" className={plannerColCapNumericSm}>
                Qty
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
              const rowCost = lineItemRawCost(item, reactorCount);
              const rowQuote =
                rowCost * (1 + marginPct[item.marginTier] / 100);
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
                        patchItem(item.id, { enabled: ev.target.checked })
                      }
                      aria-label={`Enable ${item.label}`}
                    />
                  </PlannerTd>
                  <td className="min-w-0 px-1 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        className={clsx(numInputCls(), "min-w-0 w-full max-w-none")}
                        type="text"
                        value={item.label}
                        onChange={(ev) =>
                          patchItem(item.id, { label: ev.target.value })
                        }
                      />
                      {item.note ?
                        <HelpIcon text={item.note} />
                      : null}
                    </div>
                  </td>
                  <td className={clsx("px-1 py-2", plannerColCapSelect)}>
                    <select
                      className={clsx(numInputCls(), "w-full max-w-none text-xs")}
                      value={item.mode}
                      onChange={(ev) =>
                        patchItem(item.id, {
                          mode: ev.target.value as LineItemMode,
                        })
                      }
                    >
                      <option value="per_reactor">{MODE_LABELS.per_reactor}</option>
                      <option value="lump">{MODE_LABELS.lump}</option>
                    </select>
                  </td>
                  <PlannerTd align="center" className={plannerColCapNumeric}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      step={0.01}
                      value={item.unitCostUsd}
                      onChange={(n) =>
                        patchItem(item.id, { unitCostUsd: n })
                      }
                    />
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColCapNumericSm}>
                    <GhostNumberInput
                      className={plannerTableNumericInputCls()}
                      min={0}
                      integer
                      value={item.qty}
                      onChange={(n) => patchItem(item.id, { qty: n })}
                    />
                  </PlannerTd>
                  <td className={clsx("px-1 py-2", plannerColCapSelectWide)}>
                    <select
                      className={clsx(numInputCls(), "w-full max-w-none text-xs")}
                      value={item.costCenter}
                      onChange={(ev) =>
                        patchItem(item.id, {
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
                        patchItem(item.id, {
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
                    <div className="font-mono text-zinc-300">{usd(rowCost)}</div>
                    <div className="font-mono text-xs text-teal-300">
                      {usd(rowQuote)}
                    </div>
                  </PlannerTd>
                  <PlannerTd align="center" className={plannerColActions}>
                    <button
                      type="button"
                      className="text-xs text-rose-400 hover:text-rose-300"
                      onClick={() => removeItem(item.id)}
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
                  {hasPresets ?
                    "No items yet — choose a preset or add a custom line below."
                  : "No items yet — add one below."}
                </td>
              </tr>
            : null}
          </tbody>
        </table>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        {hasPresets ?
          <>
            <label className="flex min-w-[min(100%,280px)] flex-1 flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Add line
              </span>
              <select
                className={clsx(numInputCls(), "max-w-none")}
                value={addChoice}
                onChange={(ev) => setAddChoice(ev.target.value)}
              >
                <option value="">Select preset or custom…</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.mode === "per_reactor" ? " (per reactor)" : " (lump)"}
                  </option>
                ))}
                <option value="__custom__">Custom blank item…</option>
              </select>
            </label>
            <Btn
              disabled={addChoice === ""}
              onClick={() => {
                if (addChoice === "__custom__") addItem(category);
                else addFromPreset(category, addChoice);
                setAddChoice("");
              }}
            >
              Add
            </Btn>
          </>
        : <Btn onClick={() => addItem(category)}>+ Add item</Btn>}
      </div>
    </section>
  );
}

/** Read-only helper for showing computed line-item costs in narrow places. */
export function lineItemsSubtotal(
  items: readonly LineItem[],
  reactorCount: number,
): number {
  let raw = 0;
  for (const item of items) raw += lineItemRawCost(item, reactorCount);
  return raw;
}
