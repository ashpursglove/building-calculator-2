/** Tauri desktop vs plain Vite in browser tab. */

let cachedIsTauri: boolean | null = null;

export function isTauriRuntime(): boolean {
  if (cachedIsTauri !== null) return cachedIsTauri;
  cachedIsTauri =
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
  return cachedIsTauri;
}
