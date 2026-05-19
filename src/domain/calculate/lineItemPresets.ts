/**
 * CapEx line-item presets for user-driven sections (Hardware & MEP tab).
 * Fresh projects start with empty sections; users add rows from these templates
 * or insert a custom blank line.
 */

import type { LineItemCategory, LineItemMode } from "@/domain/calculate/lineItems";

export interface LineItemPreset {
  id: string;
  label: string;
  mode: LineItemMode;
  unitCostUsd: number;
  note: string;
}

export const HARDWARE_LINE_ITEM_CATEGORIES: LineItemCategory[] = [
  "reactor_mep",
  "harvesting",
  "site_mep",
  "tech",
];

export const LINE_ITEM_PRESETS: Record<LineItemCategory, LineItemPreset[]> = {
  reactor_mep: [
    {
      id: "rmep-agitator",
      label: "Agitator (material & fab)",
      mode: "per_reactor",
      unitCostUsd: 750,
      note: "Per reactor: shaft, paddles, hub and weld fabrication.",
    },
    {
      id: "rmep-motor",
      label: "Motor",
      mode: "per_reactor",
      unitCostUsd: 150,
      note: "Per reactor: drive motor supplying the agitator gearbox.",
    },
    {
      id: "rmep-gearbox",
      label: "Gearbox",
      mode: "per_reactor",
      unitCostUsd: 520,
      note: "Per reactor: speed reducer linking motor to agitator shaft.",
    },
    {
      id: "rmep-vfd",
      label: "VFD / variable-speed drive",
      mode: "per_reactor",
      unitCostUsd: 400,
      note: "Per reactor: inverter drive for agitator motor with enclosure.",
    },
    {
      id: "rmep-coupling",
      label: "Drive coupling",
      mode: "per_reactor",
      unitCostUsd: 45,
      note: "Flexible or rigid coupling between motor and gearbox.",
    },
    {
      id: "rmep-seal",
      label: "Shaft seal / mechanical seal",
      mode: "per_reactor",
      unitCostUsd: 120,
      note: "Wetted seal assembly at the agitator penetration.",
    },
    {
      id: "rmep-mount",
      label: "Motor mount & base frame",
      mode: "per_reactor",
      unitCostUsd: 85,
      note: "Galvanised or stainless mount tying drive train to reactor structure.",
    },
    {
      id: "rmep-align",
      label: "Mechanical alignment & commissioning",
      mode: "lump",
      unitCostUsd: 0,
      note: "Laser alignment, torque checks and dry-run commissioning (site lump).",
    },
  ],
  harvesting: [
    {
      id: "harv-harvester",
      label: "Harvester",
      mode: "per_reactor",
      unitCostUsd: 1250,
      note: "Skimmer / harvester unit per reactor — chassis, belt, scraper, motor, drain manifold.",
    },
    {
      id: "harv-pumps",
      label: "Transfer / circulation pumps",
      mode: "lump",
      unitCostUsd: 600,
      note: "Transfer and circulation pumps for dosing, harvest transfer and dewatering.",
    },
    {
      id: "harv-solenoid",
      label: "Solenoid valves",
      mode: "per_reactor",
      unitCostUsd: 80,
      note: "Reactor inlet/outlet solenoids for auto top-up and drain.",
    },
    {
      id: "harv-footvalves",
      label: "Foot valves and fixings",
      mode: "per_reactor",
      unitCostUsd: 25,
      note: "Foot/check valves on pump suction lines with brackets.",
    },
    {
      id: "harv-piping",
      label: "Process piping (site-wide)",
      mode: "lump",
      unitCostUsd: 1000,
      note: "Harvest, drain, process water and tank piping (PVC/PEX + fittings).",
    },
    {
      id: "harv-dewater",
      label: "Dewatering press / belt filter",
      mode: "lump",
      unitCostUsd: 0,
      note: "Harvest dewatering rig or press — sized per site throughput.",
    },
    {
      id: "harv-skid",
      label: "Harvest pump skid",
      mode: "per_reactor",
      unitCostUsd: 350,
      note: "Local pump skid at each reactor for harvest transfer.",
    },
    {
      id: "harv-drain-manifold",
      label: "Drain manifold",
      mode: "per_reactor",
      unitCostUsd: 90,
      note: "Drain header and valving at reactor low point.",
    },
    {
      id: "harv-dosing",
      label: "Nutrient / dosing skid",
      mode: "lump",
      unitCostUsd: 0,
      note: "Central dosing pumps, day tanks and injection points.",
    },
    {
      id: "harv-hoses",
      label: "Transfer hoses & camlocks",
      mode: "lump",
      unitCostUsd: 0,
      note: "Flexible hoses, camlock sets and spill containment for harvest ops.",
    },
  ],
  site_mep: [
    {
      id: "smep-switchgear",
      label: "Switch gear",
      mode: "per_reactor",
      unitCostUsd: 200,
      note: "Per-reactor distribution board with breakers and isolator.",
    },
    {
      id: "smep-elec-conn",
      label: "Electrical connections",
      mode: "per_reactor",
      unitCostUsd: 100,
      note: "Cable runs, glands, terminations and earth bonding to reactor gear.",
    },
    {
      id: "smep-fixtures",
      label: "Fittings & fixtures",
      mode: "lump",
      unitCostUsd: 300,
      note: "Site lighting, sockets, signage and small electrical fixtures.",
    },
    {
      id: "smep-piping-mep",
      label: "Conduit & cable tray (site)",
      mode: "lump",
      unitCostUsd: 1000,
      note: "Site-wide conduit, cable trays and small-bore MEP runs.",
    },
    {
      id: "smep-incoming",
      label: "Main incoming supply / transformer",
      mode: "lump",
      unitCostUsd: 0,
      note: "Utility incomer, metering and step-down transformer if required.",
    },
    {
      id: "smep-earth",
      label: "Earthing & lightning protection",
      mode: "lump",
      unitCostUsd: 0,
      note: "Earth grid, bonds and lightning protection for the site.",
    },
    {
      id: "smep-lighting",
      label: "Area / security lighting",
      mode: "lump",
      unitCostUsd: 0,
      note: "Pole or building-mounted lighting for night operations.",
    },
    {
      id: "smep-estop",
      label: "Emergency stop circuit",
      mode: "per_reactor",
      unitCostUsd: 35,
      note: "E-stop buttons and safety relay chain per reactor zone.",
    },
    {
      id: "smep-generator",
      label: "Standby generator",
      mode: "lump",
      unitCostUsd: 0,
      note: "Backup genset and automatic transfer switch if required.",
    },
  ],
  tech: [
    {
      id: "tech-sensors",
      label: "Sensor boxes",
      mode: "per_reactor",
      unitCostUsd: 200,
      note: "Dissolved O₂, temperature and level sensors in an IP-rated enclosure.",
    },
    {
      id: "tech-contactor",
      label: "Contactor cabinets",
      mode: "per_reactor",
      unitCostUsd: 35,
      note: "Motor contactors and auxiliary relays for the agitator drive.",
    },
    {
      id: "tech-terminals",
      label: "Terminal suite / HMI",
      mode: "lump",
      unitCostUsd: 200,
      note: "Site-wide control terminal or HMI aggregating reactor data.",
    },
    {
      id: "tech-network",
      label: "Networking",
      mode: "per_reactor",
      unitCostUsd: 75,
      note: "Ethernet/cellular link, switches and conduit for telemetry.",
    },
    {
      id: "tech-software",
      label: "Software licensing",
      mode: "lump",
      unitCostUsd: 0,
      note: "GDT control software licensing and deployment (per site).",
    },
    {
      id: "tech-plc",
      label: "GDT Control Hub",
      mode: "lump",
      unitCostUsd: 0,
      note: "GDT Control Hub — central edge controller coordinating all reactors.",
    },
    {
      id: "tech-vfd-panel",
      label: "Motor control panel (assembled)",
      mode: "per_reactor",
      unitCostUsd: 0,
      note: "Factory-built MCC section for reactor drives.",
    },
    {
      id: "tech-probes-spare",
      label: "Spare probes & consumables",
      mode: "per_reactor",
      unitCostUsd: 0,
      note: "Spare DO/temp/level probes and calibration consumables.",
    },
    {
      id: "tech-data",
      label: "Telemetry / SIM data plan",
      mode: "lump",
      unitCostUsd: 0,
      note: "Annual cellular or cloud connectivity for remote monitoring.",
    },
  ],

  /* Other CapEx tabs — seeded in defaultLineItems(), not preset-driven. */
  site_construction: [],
  buildings: [],
  ancillary: [],
  logistics: [],
  training: [],
};

export function findLineItemPreset(
  category: LineItemCategory,
  presetId: string,
): LineItemPreset | undefined {
  return LINE_ITEM_PRESETS[category]?.find((p) => p.id === presetId);
}
