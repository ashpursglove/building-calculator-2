import { isTauriRuntime } from "@/io/runtime";
import type { ConstructionState } from "@/store/projectStore";
import { parseToState, serialiseFromState } from "@/io/projectFile";

/** Canonical on-disk extension (includes the dot). Single segment so Windows uses our icon. */
export const GCTP_FILE_SUFFIX = ".gctp";
/** Legacy double extension from earlier builds — still readable. */
const LEGACY_FILE_SUFFIX = ".gctp.json";

const SAVE_FILTER = {
  name: "GDT Construction Planner project",
  extensions: ["gctp"],
};

const OPEN_FILTER = {
  name: "GDT Construction Planner project",
  extensions: ["gctp", "gctp.json"],
};

const LEGACY_OPEN_FILTER = {
  name: "Legacy JSON (import only)",
  extensions: ["json"],
};

interface DiskFile {
  path: string;
  content: string;
}

function stemFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(LEGACY_FILE_SUFFIX)) {
    return name.slice(0, -LEGACY_FILE_SUFFIX.length);
  }
  if (lower.endsWith(GCTP_FILE_SUFFIX)) {
    return name.slice(0, -GCTP_FILE_SUFFIX.length);
  }
  if (lower.endsWith(".json")) {
    return name.slice(0, -".json".length);
  }
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Safe filename stem + `.gctp` for save dialogs. */
export function defaultGctpFilename(titleOrPath: string): string {
  const base = titleOrPath.replace(/^.*[/\\]/, "");
  const stem =
    stemFromName(base)
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "untitled";
  return ensureGctpPath(stem);
}

/**
 * Force the `.gctp` extension so Windows uses our registered file type and icon.
 * Compound extensions like `.gctp.json` lose to the trailing `.json` association.
 */
export function ensureGctpPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return `untitled${GCTP_FILE_SUFFIX}`;

  const lower = trimmed.toLowerCase();
  if (lower.endsWith(LEGACY_FILE_SUFFIX)) {
    return trimmed.slice(0, -LEGACY_FILE_SUFFIX.length) + GCTP_FILE_SUFFIX;
  }
  if (lower.endsWith(GCTP_FILE_SUFFIX)) {
    return trimmed;
  }
  if (lower.endsWith(".json")) {
    return trimmed.slice(0, -".json".length) + GCTP_FILE_SUFFIX;
  }
  return trimmed + GCTP_FILE_SUFFIX;
}

export function isGctpProjectPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith(GCTP_FILE_SUFFIX) || lower.endsWith(LEGACY_FILE_SUFFIX);
}

export async function pickAndReadConstructionFile(): Promise<DiskFile | null> {
  if (isTauriRuntime()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const selected = await open({
      multiple: false,
      filters: [OPEN_FILTER, LEGACY_OPEN_FILTER],
    });
    if (typeof selected !== "string") return null;
    const content = await readTextFile(selected);
    return { path: selected, content };
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".gctp,.gctp.json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve({ path: file.name, content: await file.text() });
    };
    input.click();
  });
}

export async function pickAndSaveConstructionJson(
  defaultPath: string | null,
  content: string,
): Promise<string | null> {
  const suggested = defaultGctpFilename(defaultPath ?? "untitled");

  if (isTauriRuntime()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const picked = await save({
      title: "Save GDT project",
      filters: [SAVE_FILTER],
      defaultPath: suggested,
    });
    if (!picked) return null;
    const path = ensureGctpPath(picked);
    await writeTextFile(path, content);
    return path;
  }

  const path = suggested;
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = path;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return path;
}

export async function writeConstructionFileAt(
  path: string,
  content: string,
): Promise<string> {
  const normalized = ensureGctpPath(path);

  if (isTauriRuntime()) {
    const { writeTextFile, remove } = await import("@tauri-apps/plugin-fs");
    await writeTextFile(normalized, content);
    if (
      path !== normalized &&
      path.toLowerCase() !== normalized.toLowerCase()
    ) {
      try {
        await remove(path);
      } catch {
        // Previous path may be missing or outside scope.
      }
    }
    return normalized;
  }
  await pickAndSaveConstructionJson(normalized, content);
  return normalized;
}

export function stringifyProject(state: ConstructionState): string {
  return serialiseFromState(state);
}

export function parseProjectPayload(text: string): ConstructionState {
  return parseToState(text);
}
