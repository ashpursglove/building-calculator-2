import { LineItemTable } from "@/components/planner/LineItemTable";

export function HardwarePanel() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <p className="text-sm text-zinc-400">
        Sections start empty. Pick a preset from the dropdown to add a typical line
        (with suggested unit cost and notes), or choose custom blank item to enter
        your own.
      </p>
      <LineItemTable
        category="reactor_mep"
        title="Mechanical"
        description="Reactor drive train, seals, mounts and mechanical commissioning."
      />
      <LineItemTable
        category="harvesting"
        title="Harvesting"
        description="Harvesters, pumps, valves and process piping for biomass and water."
      />
      <LineItemTable
        category="site_mep"
        title="MEP"
        description="Electrical distribution, earthing, lighting and site power infrastructure."
      />
      <LineItemTable
        category="tech"
        title="Technology / Controls"
        description="Sensors, drives, PLCs, networking and software."
      />
    </div>
  );
}
