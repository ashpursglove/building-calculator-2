# GDT Construction Planner

**v1.1.0**
## Desktop construction estimator for reactor sites, spreadsheets, and anyone who has ever typed “≈” into a BOQ and called it done.

## Download the .exe [**HERE**](https://github.com/ashpursglove/building-calculator-2/releases/download/v1.1.0/GDT.Construction.Planner.exe)

Successor to the legacy **building calculator** Python/PyQt tool. Same spirit: deterministic maths, local files, no login screen, no dashboard that wants to be your friend. Now with React, TypeScript, Tauri, and a file extension Windows might actually respect.

---

## What Is This?

**GDT Construction Planner** is a **desktop** application for early-stage **construction quantities and costs** on GDT-style reactor and site projects — without:

- spreadsheets held together by merged cells, tribal knowledge, and one formula someone hid in row 847  
- cloud tools that need a login, a subscription, and a support ticket written in passive aggression  
- estimates that begin with “it should be roughly…” and end with “we’ll true it up at tender”  
- vendor software that assumes your site is flat, square, and morally pure  

It runs **locally**.  
It works **offline** (once built/installed).  
It does not care about your Wi-Fi, your VPN, or whether Teams is having a day.

Built with **Tauri 2** (native shell), **React + TypeScript** (UI), **Zustand** (state), and **pure calculation modules** under `src/domain/calculate/`

---

## What This Does

The app is split into **tabs**. Each tab has one job. It does that job. It does not branch out into life coaching.

Press **Recalculate all** when you want the universe to catch up with your inputs. The **Summary** tab aggregates everything and presents the result without sympathy.

### Summary

- Project metadata (client, site, author, revision)  
- Executive roll-up: disciplines, CapEx sectors, totals  
- **GDT internal (raw)** vs **client quotation (with margin)** — because “one number” was never going to be enough  
- Discipline cost-centre and margin tier controls where relevant  
- Export **Internal PDF** or **Client quotation PDF**  

The client PDF is for humans who will never open this app. It shows **sector and line-item totals only** (margins baked in, no “open the Sweet Sand tab” energy). The internal PDF is the full engineering narrative for people who do.

### Reactors

- Reactor envelope: length, width, wall height, working depth, count  
- Excavation, footing, sand bedding, overdig  
- Derived footprints, volumes, liner areas — scaled by reactor count  
- Per-reactor quote classification (cost centre + margin tier) with “apply to per-reactor line items” when you mean it  

This tab drives a lot of downstream geometry. If the count is wrong, everything else will be wrong with confidence.

### Earthworks

- Platforms, trenches, compaction by lifts and passes  
- Optional link to reactor pads from the Reactors tab  
- Cut/haul and compaction rates  
- Explicitly models how annoying compaction really is  
- Produces numbers you can say in a meeting without apologising  

### Blocks (breeze blockwork)

- Straight walls, curved walls, raceway reactor walls  
- Real block dimensions and pallet logic  
- Wall areas, block counts, pallets, leftover blocks that will absolutely be “kept for later”  
- Default pricing included; overridable because pricing is a social construct  

### Concrete

- Slabs, strip footings, walls, isolated footings  
- **Sweet sand (bedding)** lives here too — racetrack-shaped bases, corner fillets, density and $/t  
- **Rebar density presets** — Low / Medium / High (configurable kg/m³) plus Custom  
- Volume, reinforcement mass, cost breakdowns  
- No hidden “multiply by 1.2 because vibes” factor  

### Buildings

- CapEx line items for site construction scope (per-reactor or lump)  
- Presets plus custom blank lines  
- Cost centre (GDT vs contractor) and margin tier per item  

### Hardware & MEP

- Site MEP, harvesting, reactor MEP, tech, ancillary — line items with presets (pumps, tanks, GDT Control Hub, etc.)  
- Same per-reactor / lump modes as the rest of CapEx  
- Starts empty on purpose; you add what the job actually needs  

### Manpower

- **Add/remove crew lines** — preset trades or custom blank rows (same pattern as CapEx line items)  
- Per-row **days on site** — leave blank to use the schedule default  
- Normal hours, overtime, OT factors that acknowledge labour laws exist  
- Mobilisation, demobilisation, site overheads  
- Man-hours and cost without assuming humans are fungible  

### Equipment

- **Add/remove fleet lines** — preset plant types or custom blank rows  
- Per-row **days on hire** — leave blank to use the schedule default  
- Per-machine rows: hire rate, utilisation, fuel burn  
- Schedule days and hours, fuel price, plant mob/demob/overheads  
- An actual breakdown instead of a suspiciously round number  

### Logistics & Time

- Logistics and travel line items (flights, freight, customs — the usual suspects)  
- Training & handover lines  
- **GDT internal time**: engineering / site ops / bio ops day rates and task lines  
- Included in internal totals; kept out of the client-facing quotation summary where it belongs  

### Config

- **Project presets** — saved with each `.gctp` file  
- **Quote margin tiers** — edit None / Low / Medium / High percentages (applied immediately across the roll-up)  
- **Rebar density presets** — Low / Medium / High kg/m³ for the Concrete tab  
- **GDT default day rates** — Engineering, Site Ops, Bio Ops USD/day  
- **Manpower trade rates** — default USD/h when adding crew lines from presets  
- **Equipment fleet presets** — editable plant list (name, hire rate, fuel L/h) for the Equipment add dropdown  
- Reset all presets to factory defaults  

---

## Quote Roll-Up (Margins & Cost Centres)

Not everything is raw cost. Line items and disciplines can carry:

- **Cost centre** — GDT vs contractor scope (defaults to GDT on new projects)  
- **Margin tier** — none, low, medium, high (percentages applied in the roll-up; **editable on the Config tab**)  

The Summary and PDFs distinguish **raw programme cost** from **client quotation**. If you set everything to “none” and GDT, you get a very honest spreadsheet. If you don’t, you get a commercial document. Both are features.

---

## PDF Export

Two deliberate audiences:

| Export | Purpose |
|--------|---------|
| **Internal PDF** | Full estimate: disciplines, assumptions, CapEx detail, margins, qualifications for engineers |
| **Client quotation PDF** | Sector summary + line-item breakdown with **quote prices only**; legal intro/footers that say this is **not a commercial offer** unless you make it one in writing |

- A4, structured sections, page numbers  
- Empty disciplines (never calculated) are **omitted** — no “please press Calculate on the Sand tab” placeholders in the PDF  
- Manpower and equipment tables show days as plain numbers (no “default” annotation)  
- No Adobe. No Java. No 17 GB updates. No ancient curses.  

---

## Project Save / Load (`.gctp` files)

Projects save as **`.gctp`** files.

- **On disk:** JSON (versioned schema in `src/io/projectFile.ts`, currently v4)  
- **Planner config** — margin percentages, rebar presets, default rates, and equipment fleet presets stored per project  
- **Human-readable**, diffable, email-friendly  
- **Windows:** registered file type with the app icon (when installed or after first run registration)  
- **Legacy:** older `.gctp.json` saves can still be opened; new saves use `.gctp` so Explorer stops insisting your project is “JSON Source File” and eloping with VS Code  

**Save / Open** use native file dialogs in the desktop app. Browser dev mode falls back to download/upload behaviour that is functional but spiritually disappointing.

---

## Desktop Build (For People Who Do Not Want `npm` Opinions)

### Requirements

- **Node.js** (LTS)  
- **Rust** (`rustup`, stable)  
- **Windows:** Visual Studio Build Tools (C++ workload), **WebView2** (usually already there on Win10/11)  

### Development

```bash
npm install
npm run tauri:dev
```

Web-only UI preview (no native save dialog — browser download fallback):

```bash
npm run dev
```

### Production build

```bash
npm run tauri:build
```

Outputs:

- **EXE:** `src-tauri/target/release/gdt_construction_planner.exe`  
- **Installers:** `src-tauri/target/release/bundle/` (MSI and NSIS)  

Regenerate icons after logo changes:

```bash
npm run tauri:icon
```

Download the installer or exe. Double-click. It runs. It does not ask for a premium tier. It does not update itself mid-calculation.

If the build fails after moving folders, delete `src-tauri/target` and build again — Rust cache enjoys holding grudges about old paths.

---

## Design Philosophy

- **Local-first** — your estimate stays on your machine  
- **No cloud**, no subscription, no telemetry, no “how was your experience?” popup  
- **Deterministic maths** over optimism  
- **Pure calculation modules** — testable, separate from UI whims  
- **UI that stays out of the way** — dark theme, tabs, ghost-zero inputs so empty fields don’t lie to you  

This tool exists because real projects need numbers **now**, not after syncing a dashboard that thinks everything is a KPI.

---

## What This Is Not

- A certified tender return (unless you wrap it in your own process)  
- A replacement for structural design, geotech, or procurement  
- A scheduling oracle  
- A crystal ball  
- A substitute for thinking  

It is an **engineering and commercial estimating calculator**.

If the inputs are bad, the outputs will also be bad.  
But they will be bad in a **consistent, repeatable, auditable** way — which is still an upgrade over the spreadsheet from 2019 that nobody admits they still use.

---

## Repo Layout (Brief)

| Area | Role |
|------|------|
| `src/components/` | React UI (planner tabs, tables, panels) |
| `src/domain/calculate/` | Quantity and cost engines |
| `src/store/` | Zustand project state |
| `src/io/` | Save/load, PDF export, desktop integration |
| `src-tauri/` | Rust shell, Windows file associations, single-instance open |

---

## License

If this repo ships with a license file, follow that file. If not: treat it as internal GDT tooling unless told otherwise.

No warranties.  
No guarantees.  
No miracles.  

Just software that prefers your reactor count to be an integer and your sand volume to be calculated before it appears in a PDF.

## Download the .exe [**HERE**](https://github.com/ashpursglove/building-calculator-2/releases/download/v1.1.0/GDT.Construction.Planner.exe)
