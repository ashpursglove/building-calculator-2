import { useMemo } from "react";

import { useProjectStore } from "@/store/projectStore";
import { qty } from "@/components/planner/formatters";
import { QuoteClassificationBar } from "@/components/planner/QuoteClassificationBar";
import { Btn, Field, GhostNumberInput, Panel } from "@/components/planner/ui";
import { lineItemRawCost } from "@/domain/calculate/lineItems";
import { computeReactorGeometry } from "@/domain/calculate/reactors";

export function ReactorsPanel() {
  const r = useProjectStore((s) => s.reactors);
  const set = useProjectStore((s) => s.setReactors);
  const reset = useProjectStore((s) => s.resetReactors);
  const applyToLineItems = useProjectStore(
    (s) => s.applyReactorClassificationToLineItems,
  );
  const lineItems = useProjectStore((s) => s.lineItems);
  const geom = useMemo(() => computeReactorGeometry(r), [r]);

  const perReactorRawUsd = useMemo(() => {
    let sum = 0;
    for (const item of lineItems) {
      if (item.enabled && item.mode === "per_reactor") {
        sum += lineItemRawCost(item, r.count);
      }
    }
    return sum;
  }, [lineItems, r.count]);

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Panel title="Central reactor configuration">
        <p className="mb-3 text-xs text-zinc-400">
          One source of truth for reactor count and geometry. This drives
          per-reactor line items (Hardware, MEP, Tech, Logistics, Buildings),
          the Blocks tab’s reactor envelope, and optionally the Earthworks
          excavation totals.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Reactor count"
            help="Number of full reactors on this site. Drives per-reactor line items (Hardware, MEP, Tech, Logistics) and the reactor envelope in Blocks/Earthworks."
          >
            <GhostNumberInput
              min={0}
              integer
              value={r.count}
              onChange={(n) => set({ count: n })}
            />
          </Field>
          <Field
            label="Length (m)"
            help="Outer race-track length end-to-end. The rectangular section length is length minus width, capped by half-circles at each end."
          >
            <GhostNumberInput
              step={0.001}
              value={r.lengthM}
              onChange={(n) => set({ lengthM: n })}
            />
          </Field>
          <Field
            label="Width W (m)"
            help="Outer race-track width — also the diameter of the end half-circles (R = W/2)."
          >
            <GhostNumberInput
              step={0.001}
              value={r.widthM}
              onChange={(n) => set({ widthM: n })}
            />
          </Field>
          <Field
            label="Wall height (m)"
            help="Reactor wall height above slab — used by Blocks to size the perimeter wall area."
          >
            <GhostNumberInput
              step={0.001}
              value={r.wallHeightM}
              onChange={(n) => set({ wallHeightM: n })}
            />
          </Field>
          <Field
            label="Depth (m)"
            help="Working water depth at normal operating level. Drives liner area and working volume."
          >
            <GhostNumberInput
              step={0.001}
              value={r.workingDepthM}
              onChange={(n) => set({ workingDepthM: n })}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Per-reactor quote classification">
        <p className="mb-3 text-xs text-zinc-400">
          Default cost centre and margin for CapEx lines priced per reactor
          (Hardware, MEP, Tech, site construction, etc.). Use the button below
          to push these settings onto every existing per-reactor line item.
        </p>
        <QuoteClassificationBar
          label="Reactor-scoped CapEx classification"
          rawUsd={perReactorRawUsd}
          value={{ costCenter: r.costCenter, marginTier: r.marginTier }}
          onChange={(patch) => set(patch)}
        />
        <div className="mt-3">
          <Btn onClick={() => applyToLineItems()}>
            Apply to all per-reactor line items
          </Btn>
        </div>
      </Panel>

      <Panel title="Excavation & founding">
        <p className="mb-3 text-xs text-zinc-400">
          Used by the Earthworks tab when the "use reactors" toggle is on.
          The over-dig is added to every side of every reactor footprint.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Excavation depth (cm)"
            help="Depth of cut below natural ground at the reactor pads, cm."
          >
            <GhostNumberInput
              step={1}
              value={r.excavationDepthCm}
              onChange={(n) => set({ excavationDepthCm: n })}
            />
          </Field>
          <Field
            label="Footing thickness (cm)"
            help="Reactor footing / bedding concrete slab thickness, cm. Informational — concrete volume is sized in the Concrete tab."
          >
            <GhostNumberInput
              step={1}
              value={r.footingThicknessCm}
              onChange={(n) => set({ footingThicknessCm: n })}
            />
          </Field>
          <Field
            label="Sand bedding (cm)"
            help="Sweet-sand bedding placed under the liner, cm. Informational; sweet-sand quantity is taken from the Concrete tab inputs."
          >
            <GhostNumberInput
              step={1}
              value={r.sandBeddingCm}
              onChange={(n) => set({ sandBeddingCm: n })}
            />
          </Field>
          <Field
            label="Over-dig per side (m)"
            help="Extra excavation distance on every side of the reactor footprint for working room, m."
          >
            <GhostNumberInput
              step={0.05}
              value={r.overdigM}
              onChange={(n) => set({ overdigM: n })}
            />
          </Field>
        </div>
      </Panel>

      <div className="flex gap-2">
        <Btn onClick={() => reset()}>Reset defaults</Btn>
      </div>

      <Panel title="Derived geometry (live)">
        <ul className="grid gap-1 text-sm text-zinc-300 sm:grid-cols-2">
          <li>
            Footprint per reactor:{" "}
            {qty(geom.footprintM2, "m²", 2)}
          </li>
          <li>
            Total footprint:{" "}
            {qty(geom.totalFootprintM2, "m²", 2)}
          </li>
          <li>
            Excavation footprint (per):{" "}
            {qty(geom.excavationFootprintPerM2, "m²", 2)}
          </li>
          <li>
            Excavation footprint (total):{" "}
            {qty(geom.totalExcavationFootprintM2, "m²", 2)}
          </li>
          <li>
            Excavation volume (total):{" "}
            {qty(geom.totalExcavationVolumeM3, "m³", 2)}
          </li>
          <li>
            Liner area per reactor:{" "}
            {qty(geom.linerAreaPerReactorM2, "m²", 2)}
          </li>
          <li>
            Liner area total:{" "}
            {qty(geom.totalLinerAreaM2, "m²", 2)}
          </li>
          <li>
            Working volume (total):{" "}
            {qty(geom.totalWorkingVolumeM3, "m³", 2)}
          </li>
        </ul>
      </Panel>
    </div>
  );
}
