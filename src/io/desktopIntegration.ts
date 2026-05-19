import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/io/runtime";

/** Read a `.gctp.json` path via the native host (no FS scope limits). */
export async function readProjectFileNative(
  path: string,
): Promise<{ path: string; content: string }> {
  return invoke("read_project_file", { path });
}

/** First-run Windows file-type registration (no-op if already current). */
export async function ensureDesktopIntegration(): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    await invoke("ensure_desktop_integration");
  } catch {
    // Non-fatal — associations may already exist or HKCU may be restricted.
  }
}

/** Path passed on the command line when the app was launched. */
export async function takePendingProjectPath(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  return invoke<string | null>("take_pending_project_path");
}

/** Subscribe to project opens from a second instance or shell double-click. */
export function onOpenProjectFile(
  handler: (path: string) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return Promise.resolve(() => {});
  }
  return listen<string>("open-project-file", (event) => {
    if (event.payload) handler(event.payload);
  });
}
