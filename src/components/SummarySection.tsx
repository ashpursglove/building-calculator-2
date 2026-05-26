import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useProjectStore } from "@/store/projectStore";
import { usd } from "@/components/planner/formatters";
import { QuoteTotalsBanner } from "@/components/planner/QuoteTotalsBanner";
import { Panel } from "@/components/planner/ui";
import {
  COST_CENTER_LABELS,
} from "@/domain/calculate/lineItems";
import { marginTierLabels } from "@/domain/plannerConfig";
import {
  computeQuoteRollup,
  executiveQuoteLines,
} from "@/domain/calculate/quoteRollup";

export function SummarySection(props: { filePath?: string | null }) {
  const meta = useProjectStore((s) => s.meta);
  const setMetaTitle = useProjectStore((s) => s.setMetaTitle);
  const setMeta = useProjectStore((s) => s.setMeta);
  const reactorCount = useProjectStore((s) => s.reactors.count);
  const stateSlice = useProjectStore(
    useShallow((s) => ({
      breeze: s.breeze,
      sand: s.sand,
      concrete: s.concrete,
      land: s.land,
      manpower: s.manpower,
      equipment: s.equipment,
      lineItems: s.lineItems,
      gdtTime: s.gdtTime,
      reactors: s.reactors,
      disciplineClassifications: s.disciplineClassifications,
      config: s.config,
    })),
  );

  const marginLabels = useMemo(
    () => marginTierLabels(stateSlice.config.marginTierPct),
    [stateSlice.config.marginTierPct],
  );

  const rollup = useMemo(() => {
    return computeQuoteRollup({
      meta,
      toast: null,
      reactors: stateSlice.reactors,
      earthworksFromReactors: true,
      lineItems: stateSlice.lineItems,
      gdtTime: stateSlice.gdtTime,
      breeze: stateSlice.breeze,
      sand: stateSlice.sand,
      concrete: stateSlice.concrete,
      land: stateSlice.land,
      manpower: stateSlice.manpower,
      equipment: stateSlice.equipment,
      disciplineClassifications: stateSlice.disciplineClassifications,
      config: stateSlice.config,
    });
  }, [meta, stateSlice]);

  const executive = useMemo(
    () => executiveQuoteLines(rollup),
    [rollup],
  );

  const calcRows = [
    {
      label: "Blockwork (breeze)",
      money: stateSlice.breeze.result?.totalCostUsd ?? 0,
      qty:
        stateSlice.breeze.result
          ? `${stateSlice.breeze.result.totalAreaM2.toFixed(2)} m² (last run)`
          : "Run calculation",
    },
    {
      label: "Sweet sand",
      money: stateSlice.sand.result?.totalCostUsd ?? 0,
      qty:
        stateSlice.sand.result
          ? `${stateSlice.sand.result.volumeTotalM3.toFixed(3)} m³ (last run)`
          : "Run calculation",
    },
    {
      label: "Concrete",
      money: stateSlice.concrete.result?.totalCostUsd ?? 0,
      qty:
        stateSlice.concrete.result
          ? `${stateSlice.concrete.result.volumeM3.toFixed(3)} m³ (last run)`
          : "Run calculation",
    },
    {
      label: "Earthworks",
      money: stateSlice.land.result?.totalCostUsd ?? 0,
      qty:
        stateSlice.land.result
          ? `${stateSlice.land.result.totalCutVolumeM3.toFixed(3)} m³ cut (last run)`
          : "Run calculation",
    },
    {
      label: "Manpower",
      money: stateSlice.manpower.result?.grandTotalUsd ?? 0,
      qty:
        stateSlice.manpower.result
          ? `${stateSlice.manpower.result.totalManhours.toFixed(1)} h (last run)`
          : "Run calculation",
    },
    {
      label: "Equipment",
      money: stateSlice.equipment.result?.grandTotalUsd ?? 0,
      qty:
        stateSlice.equipment.result
          ? `${stateSlice.equipment.result.totalHours.toFixed(1)} h (last run)`
          : "Run calculation",
    },
  ];

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <Panel title="Project details">
        <p className="mb-3 text-xs text-zinc-400">
          Estimate title block — used on the PDF cover and executive summary.
        </p>
        <label className="mb-3 flex flex-col gap-1" htmlFor="proj-title">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Project title
          </span>
          <input
            id="proj-title"
            type="text"
            value={meta.title}
            onChange={(ev) => setMetaTitle(ev.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none ring-teal-500/70 focus-visible:ring-2"
            placeholder="Untitled construction estimate"
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Client / owner
            </span>
            <input
              type="text"
              value={meta.client}
              onChange={(ev) => setMeta({ client: ev.target.value })}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none ring-teal-500/70 focus-visible:ring-2"
              placeholder="Client / owner"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Site / location
            </span>
            <input
              type="text"
              value={meta.site}
              onChange={(ev) => setMeta({ site: ev.target.value })}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none ring-teal-500/70 focus-visible:ring-2"
              placeholder="Site / location"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Prepared by
            </span>
            <input
              type="text"
              value={meta.author}
              onChange={(ev) => setMeta({ author: ev.target.value })}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none ring-teal-500/70 focus-visible:ring-2"
              placeholder="Prepared by"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Revision
            </span>
            <input
              type="text"
              value={meta.revision}
              onChange={(ev) => setMeta({ revision: ev.target.value })}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none ring-teal-500/70 focus-visible:ring-2"
              placeholder="Revision"
            />
          </label>
        </div>
        {props.filePath ?
          <p
            className="mt-3 truncate text-xs text-zinc-500"
            title={props.filePath}
          >
            Saved file: {props.filePath}
          </p>
        : <p className="mt-3 text-xs text-zinc-500">No project file saved yet.</p>}
      </Panel>

      <Panel title="Quote rollup (internal)">
        <p className="mb-3 text-sm text-zinc-400">
          Programme totals at reactor count{" "}
          <span className="text-teal-200">{reactorCount}</span>. GDT internal
          figures are raw costs; client quotation includes margin tiers set on
          each tab. Export the client PDF for quote-only amounts.
        </p>
        <QuoteTotalsBanner rollup={rollup} />
        <table className="mt-4 w-full border-collapse text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-400">
            <tr className="border-b border-zinc-800">
              <th className="py-2 pr-2 text-left font-medium">Scope</th>
              <th className="py-2 pr-2 text-right font-medium">
                GDT internal (raw)
              </th>
              <th className="py-2 pr-2 text-left font-medium">Centre</th>
              <th className="py-2 pr-2 text-left font-medium">Margin</th>
              <th className="py-2 text-right font-medium">
                Client quote
              </th>
            </tr>
          </thead>
          <tbody>
            {executive.map((line) => (
              <tr key={line.id} className="border-b border-zinc-900">
                <td className="py-2 pr-2 text-zinc-300">{line.label}</td>
                <td className="py-2 pr-2 text-right font-mono text-zinc-400">
                  {usd(line.rawUsd)}
                </td>
                <td className="py-2 pr-2 text-xs text-zinc-500">
                  {COST_CENTER_LABELS[line.costCenter]}
                </td>
                <td className="py-2 pr-2 text-xs text-zinc-500">
                  {marginLabels[line.marginTier]}
                </td>
                <td className="py-2 text-right font-mono text-teal-200">
                  {usd(line.withMarginUsd)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-4 font-semibold text-zinc-100" colSpan={4}>
                Total programme (raw)
              </td>
              <td className="pt-4 text-right font-mono text-zinc-300">
                {usd(rollup.totalRawUsd)}
              </td>
            </tr>
            <tr>
              <td className="pt-1 font-semibold text-teal-100" colSpan={4}>
                Customer quote total
              </td>
              <td className="pt-1 text-right font-bold text-teal-300">
                {usd(rollup.totalQuoteUsd)}
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel title="Calculator disciplines (raw from last run)">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
              <th className="py-2 text-left font-medium">Discipline</th>
              <th className="py-2 text-right font-medium">Raw (USD)</th>
              <th className="py-2 text-right font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {calcRows.map((r) => (
              <tr key={r.label} className="border-b border-zinc-900">
                <td className="py-2 pr-4 text-zinc-300">{r.label}</td>
                <td className="py-2 pr-4 text-right font-mono text-zinc-100">
                  {usd(r.money)}
                </td>
                <td className="py-2 text-right text-xs text-zinc-500">{r.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Cost-centre split">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-zinc-300">GDT scope (raw to quote)</td>
                <td className="py-1 text-right font-mono text-teal-200">
                  {usd(rollup.gdtScopeRawUsd)}{" "}
                  <span className="text-zinc-600">to</span>{" "}
                  {usd(rollup.gdtScopeQuoteUsd)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-zinc-300">
                  Contractor scope (raw to quote)
                </td>
                <td className="py-1 text-right font-mono text-zinc-100">
                  {usd(rollup.contractorScopeRawUsd)}{" "}
                  <span className="text-zinc-600">to</span>{" "}
                  {usd(rollup.contractorScopeQuoteUsd)}
                </td>
              </tr>
              <tr className="border-t border-zinc-800">
                <td className="pt-2 font-semibold text-zinc-100">
                  Margin added on programme
                </td>
                <td className="pt-2 text-right font-mono text-zinc-100">
                  {usd(rollup.totalMarginUsd)}
                </td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <Panel title="Per-reactor unit cost">
          <PerReactor quoteTotal={rollup.totalQuoteUsd} count={reactorCount} />
        </Panel>
      </div>

      <CapExByCategory rollup={rollup} />
    </div>
  );
}

function PerReactor(props: { quoteTotal: number; count: number }) {
  const n = Math.max(0, props.count);
  if (n <= 0) {
    return (
      <p className="text-sm text-zinc-400">
        Set reactor count on the Reactors tab to see per-reactor figures.
      </p>
    );
  }
  return (
    <p className="text-sm text-zinc-300">
      Quote total ÷ {n} reactor{n === 1 ? "" : "s"} ≈{" "}
      <span className="font-mono text-teal-200">
        {usd(props.quoteTotal / n)}
      </span>{" "}
      per reactor (indicative).
    </p>
  );
}

function CapExByCategory(props: {
  rollup: ReturnType<typeof computeQuoteRollup>;
}) {
  const rows = props.rollup.lines.filter((l) => l.kind === "capex_category");
  if (rows.length === 0) return null;
  return (
    <Panel title="CapEx by category (raw → quote)">
      <ul className="grid gap-1 text-sm text-zinc-300">
        {rows.map((line) => (
          <li key={line.id} className="flex justify-between gap-4">
            <span>{line.label}</span>
            <span className="font-mono text-teal-200">
              {usd(line.rawUsd)} → {usd(line.withMarginUsd)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
