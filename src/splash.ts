/**
 * Splash bootstrap — same UX contract as PandID (`index.html` + `window.__splash`).
 */

const SPLASH_MIN_VISIBLE_MS = 1100;

type SplashStatus = "running" | "done" | "skipped" | "warning" | "info";

interface SplashOpts {
  key?: string;
  status?: SplashStatus;
  detail?: string;
}

interface SplashApi {
  log: (msg: string, opts?: SplashOpts) => void;
  done: (key: string, msg: string, detail?: string) => void;
  info: (msg: string, detail?: string) => void;
  warning: (msg: string, detail?: string) => void;
  skipped: (key: string, msg: string, detail?: string) => void;
  setVersion: (version: string) => void;
  dismiss: () => void;
}

declare global {
  interface Window {
    __splash?: SplashApi;
    __TAURI_INTERNALS__?: unknown;
  }
}

interface StartupEntry {
  status: "done" | "skipped" | "warning" | "info";
  message: string;
  detail: string | null;
}

interface StartupReport {
  version: string;
  platform: string;
  entries: StartupEntry[];
}

const launchedAt = performance.now();

export async function runSplashNarration(): Promise<void> {
  const splash = window.__splash;
  if (!splash) return;

  splash.done("boot", "WebView2 surface ready");

  await tick(80);
  splash.log("Loading planner bundle…", { key: "bundle", status: "running" });
  await tick(120);
  splash.done(
    "bundle",
    "Planner bundle loaded",
    `~${formatBundleSize()} of JS`,
  );

  await tick(60);
  splash.log("Handshaking Rust shell…", { key: "rust", status: "running" });

  const report = await fetchStartupReport();
  if (report) {
    splash.setVersion(report.version);
    replayRustEntries(splash, report);
    splash.done("rust", "Rust shell ready");
  } else {
    splash.skipped(
      "rust",
      "Rust boot log unavailable",
      "Running outside Tauri runtime",
    );
  }

  await tick(80);
  splash.log("Loading discipline modules…", { key: "mods", status: "running" });
  await tick(110);
  splash.done(
    "mods",
    "Estimate calculators online",
    "blocks · sweet sand · concrete · earthworks · labour · plant",
  );

  await tick(70);
  splash.log("Syncing persisted projects…", { key: "io", status: "running" });
  await tick(90);
  splash.done(
    "io",
    "Project I/O wired",
    "GCTP v1 · open / save · export PDF",
  );

  await tick(60);
  splash.info("Ready");
  await holdRemaining();
  splash.dismiss();
}

function replayRustEntries(splash: SplashApi, report: StartupReport): void {
  splash.info(`Rust runtime online — ${report.platform}`);

  for (const entry of report.entries) {
    if (/^GDT Construction Planner v/i.test(entry.message)) continue;
    if (entry.message.toLowerCase().startsWith("application ready")) continue;

    const status = entry.status as SplashStatus;
    const detail = entry.detail ?? undefined;

    if (entry.message.toLowerCase().startsWith("tauri runtime")) {
      splash.done("tauri", entry.message, detail);
    } else {
      splash.log(entry.message, { status, detail });
    }
  }
}

async function fetchStartupReport(): Promise<StartupReport | null> {
  if (!window.__TAURI_INTERNALS__) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const report = await invoke<StartupReport>("get_startup_log");
    return report;
  } catch (err) {
    console.warn("get_startup_log failed", err);
    return null;
  }
}

function formatBundleSize(): string {
  return "~200 kB"; // gzipped-ish main chunk cosmetic
}

async function holdRemaining(): Promise<void> {
  const elapsed = performance.now() - launchedAt;
  const wait = SPLASH_MIN_VISIBLE_MS - elapsed;
  if (wait > 0) await tick(wait);
}

function tick(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
