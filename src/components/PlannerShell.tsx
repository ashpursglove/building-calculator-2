import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

import {
  stringifyProject,
  parseProjectPayload,
  pickAndReadConstructionFile,
  defaultGctpFilename,
  pickAndSaveConstructionJson,
  writeConstructionFileAt,
} from "@/io/saveLoad";
import {
  ensureDesktopIntegration,
  onOpenProjectFile,
  readProjectFileNative,
  takePendingProjectPath,
} from "@/io/desktopIntegration";
import { isTauriRuntime } from "@/io/runtime";
import {
  exportConstructionEstimatePdf,
  type PdfAudience,
} from "@/io/constructionPdfExport";
import { useProjectStore, type ConstructionState } from "@/store/projectStore";
import { getBlockNames } from "@/domain/blockTypes";
import { Btn } from "@/components/planner/ui";

import { SummarySection } from "./SummarySection";
import { ReactorsPanel } from "./ReactorsPanel";
import { BreezePanel } from "./BreezePanel";
import { ConcretePanel } from "./ConcretePanel";
import { LandPrepPanel } from "./LandPrepPanel";
import { BuildingsPanel } from "./BuildingsPanel";
import { HardwarePanel } from "./HardwarePanel";
import { ManpowerPanel } from "./ManpowerPanel";
import { EquipmentPanel } from "./EquipmentPanel";
import { LogisticsTimePanel } from "./LogisticsTimePanel";
import { ConfigPanel } from "./ConfigPanel";

/** Strip Zustand action methods — only persisted fields for JSON. */
function diskSlice(): ConstructionState {
  const s = useProjectStore.getState();
  return {
    meta: s.meta,
    reactors: s.reactors,
    earthworksFromReactors: s.earthworksFromReactors,
    lineItems: s.lineItems,
    gdtTime: s.gdtTime,
    breeze: s.breeze,
    sand: s.sand,
    concrete: s.concrete,
    land: s.land,
    manpower: s.manpower,
    equipment: s.equipment,
    disciplineClassifications: s.disciplineClassifications,
    config: s.config,
    toast: null,
  };
}

const TABS = [
  { id: "summary", label: "Summary" },
  { id: "reactors", label: "Reactors" },
  { id: "land", label: "Earthworks" },
  { id: "breeze", label: "Blocks" },
  { id: "concrete", label: "Concrete" },
  { id: "buildings", label: "Buildings" },
  { id: "hardware", label: "Hardware & MEP" },
  { id: "manpower", label: "Manpower" },
  { id: "equipment", label: "Equipment" },
  { id: "logistics", label: "Logistics & Time" },
  { id: "config", label: "Config" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PlannerShell() {
  const [tab, setTab] = useState<TabId>("summary");
  const [path, setPath] = useState<string | null>(null);
  const toast = useProjectStore((s) => s.toast);
  const dismissToast = useProjectStore((s) => s.dismissToast);
  const showToast = useProjectStore((s) => s.showToast);
  const replaceAll = useProjectStore((s) => s.replaceAll);
  const resetWorkspace = useProjectStore((s) => s.resetWorkspace);
  const setMetaTitle = useProjectStore((s) => s.setMetaTitle);
  const metaTitle = useProjectStore((s) => s.meta.title);

  const blockNames = useMemo(() => getBlockNames(), []);

  const persistJson = () => stringifyProject(diskSlice());

  const calculateAll = useCallback(() => {
    const st = useProjectStore.getState();
    st.dismissToast();
    st.calculateBreeze();
    useProjectStore.getState().calculateSand();
    useProjectStore.getState().calculateConcrete();
    useProjectStore.getState().calculateLand();
    useProjectStore.getState().calculateManpower();
    useProjectStore.getState().calculateEquipment();
  }, []);

  const onExportPdf = useCallback(
    async (audience: PdfAudience) => {
      try {
        calculateAll();
        const pathOrName = await exportConstructionEstimatePdf(
          diskSlice(),
          audience,
        );
        if (pathOrName) {
          showToast({
            variant: "ok",
            text: `PDF saved: ${pathOrName}`,
          });
        }
      } catch (e) {
        showToast({
          variant: "err",
          text: `PDF export failed: ${(e as Error).message}`,
        });
      }
    },
    [calculateAll, showToast],
  );

  const onNew = useCallback(() => {
    if (
      confirm(
        "Start a fresh estimate? Any unsaved work in memory will be discarded.",
      )
    ) {
      resetWorkspace();
      setPath(null);
    }
  }, [resetWorkspace]);

  const loadProjectFromDisk = useCallback(
    async (filePath: string, content: string) => {
      const parsed = parseProjectPayload(content);
      replaceAll(parsed);
      const titleGuess =
        parsed.meta.title !== "Untitled construction estimate" ?
          parsed.meta.title
        : filePath.replace(/\.[^.]+$/, "");
      setMetaTitle(titleGuess);
      setPath(filePath);
    },
    [replaceAll, setMetaTitle],
  );

  const openProjectAtPath = useCallback(
    async (filePath: string) => {
      try {
        const picked = await readProjectFileNative(filePath);
        await loadProjectFromDisk(picked.path, picked.content);
      } catch (e) {
        alert(`Could not open: ${(e as Error).message}`);
      }
    },
    [loadProjectFromDisk],
  );

  const onOpen = useCallback(async () => {
    try {
      const picked = await pickAndReadConstructionFile();
      if (!picked) return;
      await loadProjectFromDisk(picked.path, picked.content);
    } catch (e) {
      alert(`Could not open: ${(e as Error).message}`);
    }
  }, [loadProjectFromDisk]);

  const openProjectAtPathRef = useRef(openProjectAtPath);
  openProjectAtPathRef.current = openProjectAtPath;

  useEffect(() => {
    if (!isTauriRuntime()) return;

    void ensureDesktopIntegration();

    void (async () => {
      const pending = await takePendingProjectPath();
      if (pending) await openProjectAtPathRef.current(pending);
    })();

    let unlisten: (() => void) | undefined;
    void onOpenProjectFile((p) => {
      void openProjectAtPathRef.current(p);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const onSaveAs = useCallback(async () => {
    try {
      const json = persistJson();
      const p = await pickAndSaveConstructionJson(
        path ?? defaultGctpFilename(metaTitle),
        json,
      );
      if (p) setPath(p);
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    }
  }, [metaTitle, path, persistJson]);

  const onSave = useCallback(async () => {
    try {
      const json = persistJson();
      if (path) {
        const saved = await writeConstructionFileAt(path, json);
        setPath(saved);
      } else {
        await onSaveAs();
      }
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    }
  }, [onSaveAs, path, persistJson]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-panel px-4 py-2">
        <h1 className="text-base font-semibold tracking-tight text-teal-400">
          GDT Construction Planner
        </h1>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={onNew}>New</Btn>
          <Btn onClick={() => void onOpen()}>Open…</Btn>
          <Btn onClick={() => void onSave()}>Save</Btn>
          <Btn onClick={() => void onSaveAs()}>Save as…</Btn>
          <Btn onClick={() => calculateAll()} primary>
            Recalculate all
          </Btn>
          <Btn onClick={() => void onExportPdf("internal")}>
            Internal PDF…
          </Btn>
          <Btn onClick={() => void onExportPdf("client")}>
            Client quotation PDF…
          </Btn>
        </div>
        <div className="ml-auto min-w-0 max-w-md flex-1 text-right">
          {path ?
            <span className="truncate text-xs text-zinc-400" title={path}>
              {path}
            </span>
          : <span className="text-xs text-zinc-500">No file saved yet</span>}
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-900/70 px-2 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "shrink-0 rounded px-4 py-2 text-sm font-medium whitespace-nowrap",
              tab === t.id ?
                "bg-teal-600 text-white"
              : "text-zinc-300 hover:bg-zinc-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-16">
        {tab === "summary" ?
          <SummarySection filePath={path} />
        : tab === "reactors" ?
          <ReactorsPanel />
        : tab === "land" ?
          <LandPrepPanel />
        : tab === "breeze" ?
          <BreezePanel blockNames={blockNames} />
        : tab === "concrete" ?
          <ConcretePanel />
        : tab === "buildings" ?
          <BuildingsPanel />
        : tab === "hardware" ?
          <HardwarePanel />
        : tab === "manpower" ?
          <ManpowerPanel />
        : tab === "equipment" ?
          <EquipmentPanel />
        : tab === "logistics" ?
          <LogisticsTimePanel />
        : <ConfigPanel />}
      </main>

      {toast ?
        <div
          role="alert"
          className={clsx(
            "fixed bottom-5 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg",
            toast.variant === "err" ?
              "border-rose-500/40 bg-rose-950 text-rose-100"
            : "border-teal-500/40 bg-zinc-900 text-zinc-100",
          )}
        >
          {toast.text}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => dismissToast()}
          >
            Dismiss
          </button>
        </div>
      : null}
    </div>
  );
}
