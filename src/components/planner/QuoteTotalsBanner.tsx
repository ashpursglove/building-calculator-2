import clsx from "clsx";

import { usd } from "@/components/planner/formatters";
import type { QuoteRollup } from "@/domain/calculate/quoteRollup";

export function QuoteTotalsBanner(props: {
  rollup: QuoteRollup;
  compact?: boolean;
}) {
  const { rollup, compact } = props;
  const margin = rollup.totalQuoteUsd - rollup.totalRawUsd;

  return (
    <div
      className={clsx(
        "grid gap-3 rounded-lg border border-teal-900/60 bg-teal-950/30 p-4",
        compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          GDT internal cost (raw)
        </p>
        <p className="mt-1 font-mono text-lg text-zinc-100">
          {usd(rollup.totalRawUsd)}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Sum of discipline runs and line items before commercial margin
        </p>
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-teal-400">
          Client quotation (incl. margin)
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-teal-300">
          {usd(rollup.totalQuoteUsd)}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {margin > 0 ?
            `Includes ${usd(margin)} margin on classified lines`
          : "No margin tiers applied on programme total"}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          GDT scope (raw to quote)
        </p>
        <p className="mt-1 font-mono text-sm text-zinc-200">
          {usd(rollup.gdtScopeRawUsd)}{" "}
          <span className="text-zinc-600">to</span>{" "}
          <span className="text-teal-200">{usd(rollup.gdtScopeQuoteUsd)}</span>
        </p>
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Contractor scope (raw to quote)
        </p>
        <p className="mt-1 font-mono text-sm text-zinc-200">
          {usd(rollup.contractorScopeRawUsd)}{" "}
          <span className="text-zinc-600">to</span>{" "}
          {usd(rollup.contractorScopeQuoteUsd)}
        </p>
      </div>
    </div>
  );
}
