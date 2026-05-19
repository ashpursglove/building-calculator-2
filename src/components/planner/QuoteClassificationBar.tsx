import clsx from "clsx";

import { usd } from "@/components/planner/formatters";
import { numInputCls } from "@/components/planner/ui";
import {
  COST_CENTER_LABELS,
  MARGIN_TIER_LABELS,
  type CostCenter,
  type MarginTier,
} from "@/domain/calculate/lineItems";
import {
  classifyAmount,
  type QuoteClassification,
} from "@/domain/calculate/quoteRollup";

interface Props {
  label?: string;
  rawUsd: number;
  value: QuoteClassification;
  onChange: (patch: Partial<QuoteClassification>) => void;
  compact?: boolean;
}

export function QuoteClassificationBar({
  label = "Quote classification",
  rawUsd,
  value,
  onChange,
  compact = false,
}: Props) {
  const amounts = classifyAmount(rawUsd, value);

  return (
    <div
      className={clsx(
        "rounded-lg border border-zinc-800 bg-zinc-950/60 p-3",
        compact && "p-2",
      )}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <div
        className={clsx(
          "flex flex-wrap items-end gap-3",
          compact ? "gap-2" : "gap-4",
        )}
      >
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Cost centre
          </span>
          <select
            className={clsx(numInputCls(), "min-w-[130px]")}
            value={value.costCenter}
            onChange={(ev) =>
              onChange({ costCenter: ev.target.value as CostCenter })
            }
          >
            <option value="gdt">{COST_CENTER_LABELS.gdt}</option>
            <option value="contractor">
              {COST_CENTER_LABELS.contractor}
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Margin tier
          </span>
          <select
            className={clsx(numInputCls(), "min-w-[150px]")}
            value={value.marginTier}
            onChange={(ev) =>
              onChange({ marginTier: ev.target.value as MarginTier })
            }
          >
            {(["none", "low", "med", "high"] as const).map((tier) => (
              <option key={tier} value={tier}>
                {MARGIN_TIER_LABELS[tier]}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto text-right text-xs">
          <p className="text-zinc-500">
            Raw {usd(amounts.rawUsd)} / Quote{" "}
            <span className="font-mono text-teal-200">
              {usd(amounts.withMarginUsd)}
            </span>
          </p>
          {amounts.marginUsd > 0 ?
            <p className="text-zinc-600">
              +{usd(amounts.marginUsd)} on this line
            </p>
          : null}
        </div>
      </div>
    </div>
  );
}
