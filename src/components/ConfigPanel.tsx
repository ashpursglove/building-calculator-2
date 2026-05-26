import { useProjectStore } from "@/store/projectStore";
import { MANPOWER_TRADES } from "@/domain/calculate/manpower";
import type { MarginTier } from "@/domain/calculate/lineItems";
import { marginTierLabels } from "@/domain/plannerConfig";
import {
  Btn,
  Field,
  GhostNumberInput,
  Panel,
  numInputCls,
} from "@/components/planner/ui";
import clsx from "clsx";

const MARGIN_TIERS: MarginTier[] = ["none", "low", "med", "high"];

const MARGIN_HELP: Record<MarginTier, string> = {
  none: "No markup — raw cost passes through as the client quote.",
  low: "Light markup for low-risk or pass-through lines.",
  med: "Standard GDT markup on typical scope.",
  high: "Higher markup for specialist or high-value GDT scope.",
};

export function ConfigPanel() {
  const config = useProjectStore((s) => s.config);
  const setConfig = useProjectStore((s) => s.setPlannerConfig);
  const resetConfig = useProjectStore((s) => s.resetPlannerConfig);
  const labels = marginTierLabels(config.marginTierPct);

  return (
    <div className="mx-auto grid min-w-0 w-full max-w-4xl gap-4">
      <p className="text-sm text-zinc-400">
        Project presets — saved with this estimate. Margin percentages apply
        immediately to all quote calculations. Default rates are used when
        adding new manpower or equipment lines.
      </p>

      <Panel title="Quote margin tiers">
        <p className="mb-3 text-xs text-zinc-500">
          Markup applied to raw costs by margin tier on CapEx line items, GDT
          time, and discipline classifications.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {MARGIN_TIERS.map((tier) => (
            <Field
              key={tier}
              label={labels[tier]}
              help={MARGIN_HELP[tier]}
            >
              <GhostNumberInput
                step={0.5}
                min={0}
                value={config.marginTierPct[tier]}
                onChange={(n) =>
                  setConfig({
                    marginTierPct: { ...config.marginTierPct, [tier]: n },
                  })
                }
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="Rebar density presets">
        <p className="mb-3 text-xs text-zinc-500">
          kg of reinforcement steel per m³ of concrete — used on the Concrete
          tab preset dropdown.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Low", "low"],
              ["Medium", "medium"],
              ["High", "high"],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={`${label} (kg/m³)`}>
              <GhostNumberInput
                step={1}
                min={0}
                value={config.rebarDensityKgM3[key]}
                onChange={(n) =>
                  setConfig({
                    rebarDensityKgM3: {
                      ...config.rebarDensityKgM3,
                      [key]: n,
                    },
                  })
                }
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="GDT default day rates (USD/day)">
        <p className="mb-3 text-xs text-zinc-500">
          Starting rates for new projects and when GDT time is reset. Current
          project rates can still be edited on the Logistics tab.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Engineering", "Engineering"],
              ["Site Ops", "Site Ops"],
              ["Bio Ops", "Bio Ops"],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={label}>
              <GhostNumberInput
                step={10}
                min={0}
                value={config.gdtDayRates[key]}
                onChange={(n) =>
                  setConfig({
                    gdtDayRates: { ...config.gdtDayRates, [key]: n },
                  })
                }
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="Manpower default trade rates (USD/h)">
        <p className="mb-3 text-xs text-zinc-500">
          Default hourly rate when adding a crew line from the preset dropdown
          on the Manpower tab.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {MANPOWER_TRADES.map((trade) => (
            <Field key={trade} label={trade}>
              <GhostNumberInput
                step={0.5}
                min={0}
                value={config.manpowerTradeRatesUsdH[trade] ?? 5}
                onChange={(n) =>
                  setConfig({
                    manpowerTradeRatesUsdH: {
                      ...config.manpowerTradeRatesUsdH,
                      [trade]: n,
                    },
                  })
                }
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="Equipment fleet presets">
        <p className="mb-3 text-xs text-zinc-500">
          Plant types offered in the Equipment tab add dropdown. Edit hire rate
          and fuel consumption defaults for each preset.
        </p>
        <div className="space-y-2">
          <div className="hidden gap-2 px-3 sm:grid sm:grid-cols-[1fr_7rem_7rem_auto]">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Plant type
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Hire rate (USD/h)
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Fuel (L/h)
            </span>
            <span className="sr-only">Actions</span>
          </div>
          {config.equipmentPresets.map((preset, idx) => (
            <div
              key={`${preset.name}-${idx}`}
              className="grid gap-2 rounded border border-zinc-800 bg-zinc-950/50 p-3 sm:grid-cols-[1fr_7rem_7rem_auto]"
            >
              <label className="flex flex-col gap-1 sm:contents">
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:hidden">
                  Plant type
                </span>
                <input
                  className={clsx(numInputCls(), "max-w-none")}
                  type="text"
                  value={preset.name}
                  onChange={(ev) => {
                    const next = config.equipmentPresets.map((p, i) =>
                      i === idx ? { ...p, name: ev.target.value } : p,
                    );
                    setConfig({ equipmentPresets: next });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 sm:contents">
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:hidden">
                  Hire rate (USD/h)
                </span>
                <GhostNumberInput
                  step={5}
                  min={0}
                  value={preset.rateUsdH}
                  onChange={(n) => {
                    const next = config.equipmentPresets.map((p, i) =>
                      i === idx ? { ...p, rateUsdH: n } : p,
                    );
                    setConfig({ equipmentPresets: next });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 sm:contents">
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:hidden">
                  Fuel (L/h)
                </span>
                <GhostNumberInput
                  step={0.5}
                  min={0}
                  value={preset.fuelLH}
                  onChange={(n) => {
                    const next = config.equipmentPresets.map((p, i) =>
                      i === idx ? { ...p, fuelLH: n } : p,
                    );
                    setConfig({ equipmentPresets: next });
                  }}
                />
              </label>
              <button
                type="button"
                className="self-center text-xs text-rose-400 hover:text-rose-300"
                onClick={() => {
                  const next = config.equipmentPresets.filter((_, i) => i !== idx);
                  setConfig({ equipmentPresets: next });
                }}
              >
                remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Btn
            onClick={() =>
              setConfig({
                equipmentPresets: [
                  ...config.equipmentPresets,
                  { name: "New plant item", rateUsdH: 0, fuelLH: 0 },
                ],
              })
            }
          >
            + Add preset
          </Btn>
        </div>
      </Panel>

      <div className="flex gap-2">
        <Btn onClick={() => resetConfig()}>Reset all presets to defaults</Btn>
      </div>
    </div>
  );
}
