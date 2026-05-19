import { LineItemTable } from "@/components/planner/LineItemTable";

export function BuildingsPanel() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <LineItemTable
        category="buildings"
        title="Buildings & structures"
        description="Operator-occupied rooms, drying suites, net houses and supporting structures. Per-reactor items scale with the central Reactors tab count."
      />
      <LineItemTable
        category="site_construction"
        title="Site construction (non-block / non-concrete)"
        description="Items beyond the discipline calculators — liner materials/welding, hard standings, ancillaries to the blockwork/concrete scope."
      />
      <LineItemTable
        category="ancillary"
        title="Ancillary & support"
        description="IBCs, tanks, plant ancillaries. Often GDT scope with margin."
      />
    </div>
  );
}
