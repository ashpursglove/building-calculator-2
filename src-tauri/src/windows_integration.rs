//! Windows shell integration: `.gctp` file type, icon, and open-with handler.
//! Uses HKCU so no administrator rights are required (per-user registration).

#![cfg(windows)]

use std::ffi::OsStr;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::desktop_integration::is_gctp_project_path;

use tauri::{AppHandle, Emitter, Manager};
use winreg::enums::*;
use winreg::RegKey;

/// Must match the ProgID created by the NSIS/MSI installer (`tauri.conf.json` `name`).
const PROG_ID: &str = "GDT Construction Estimate";
const EXT_PRIMARY: &str = ".gctp";
/// Legacy compound extension from earlier builds (best-effort, often ignored by Windows).
const EXT_LEGACY: &str = ".gctp.json";
/// Bump when association/icon registration logic changes (forces refresh for existing users).
const INTEGRATION_MARKER: &str = "file-associations-v3";
const PROJECT_ICON_FILE: &str = "gctp-project.ico";

pub struct PendingProjectOpen(pub Mutex<Option<String>>);

impl Default for PendingProjectOpen {
    fn default() -> Self {
        Self(Mutex::new(None))
    }
}

pub fn app_data_dir() -> io::Result<PathBuf> {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("APPDATA").map(PathBuf::from))
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "no app data dir"))?;
    Ok(base.join("GDT Construction Planner"))
}

pub fn integration_marker_path() -> io::Result<PathBuf> {
    Ok(app_data_dir()?.join(INTEGRATION_MARKER))
}

/// Embedded at compile time from `src-tauri/icons/icon.ico` (same as the app icon).
fn write_project_icon(dest: &Path) -> io::Result<()> {
    const ICON: &[u8] = include_bytes!("../icons/icon.ico");
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(dest, ICON)
}

fn icon_registry_value(icon_path: &Path) -> String {
    let path = icon_path.to_string_lossy();
    if path.contains(' ') {
        format!("\"{path}\",0")
    } else {
        format!("{path},0")
    }
}

fn notify_shell_association_changed() {
    #[link(name = "shell32")]
    extern "system" {
        fn SHChangeNotify(
            event_id: i32,
            flags: u32,
            item1: *const std::ffi::c_void,
            item2: *const std::ffi::c_void,
        );
    }
    const SHCNE_ASSOCCHANGED: i32 = 0x0800_0000;
    const SHCNF_IDLIST: u32 = 0x0000;
    unsafe {
        SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, std::ptr::null(), std::ptr::null());
    }
}

fn needs_registration(marker: &Path, exe: &Path, icon: &Path) -> io::Result<bool> {
    if !marker.exists() {
        return Ok(true);
    }
    let prev = fs::read_to_string(marker).unwrap_or_default();
    let want = format!(
        "{}\n{}\n{}",
        exe.to_string_lossy(),
        icon.to_string_lossy(),
        INTEGRATION_MARKER
    );
    Ok(prev.trim() != want.trim())
}

/// Register `.gctp.json` to open with this executable (per-user) and use the GDT project icon.
pub fn ensure_file_associations(exe_path: &Path) -> io::Result<bool> {
    let marker = integration_marker_path()?;
    let exe = exe_path
        .canonicalize()
        .unwrap_or_else(|_| exe_path.to_path_buf());
    let icon_path = app_data_dir()?.join(PROJECT_ICON_FILE);
    write_project_icon(&icon_path)?;

    if !needs_registration(&marker, &exe, &icon_path)? {
        return Ok(false);
    }

    let exe_str = exe.to_string_lossy();
    let icon_value = icon_registry_value(&icon_path);
    let open_cmd = format!("\"{exe_str}\" \"%1\"");

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let classes = hkcu.open_subkey_with_flags("Software\\Classes", KEY_WRITE)?;

    // Extension -> ProgID (single segment `.gctp`)
    let (ext_key, _) = classes.create_subkey(EXT_PRIMARY)?;
    ext_key.set_value("", &PROG_ID)?;
    let _ = ext_key.set_value("Content Type", &"application/json");
    let _ = ext_key.set_value("PerceivedType", &"document");

    // Best-effort legacy `.gctp.json` mapping (Windows usually keys off the last segment only)
    if let Ok((legacy_key, _)) = classes.create_subkey(EXT_LEGACY) {
        let _ = legacy_key.set_value("", &PROG_ID);
        let _ = legacy_key.set_value("Content Type", &"application/json");
    }

    // ProgID description + dedicated icon + open verb
    let (prog_key, _) = classes.create_subkey(PROG_ID)?;
    prog_key.set_value("", &"GDT Construction Estimate")?;
    let _ = prog_key.set_value("FriendlyTypeName", &"GDT Construction Estimate");

    let (icon_key, _) = prog_key.create_subkey("DefaultIcon")?;
    icon_key.set_value("", &icon_value)?;

    let (shell_key, _) = prog_key.create_subkey("shell")?;
    shell_key.set_value("", &"open")?;
    let (open_key, _) = shell_key.create_subkey("open")?;
    open_key.set_value("", &"Open with GDT Construction Planner")?;
    let (cmd_key, _) = open_key.create_subkey("command")?;
    cmd_key.set_value("", &open_cmd)?;

    // Advertise in "Open with" list
    let app_key_path = format!(
        "Software\\Classes\\Applications\\{}.exe",
        exe.file_name()
            .and_then(OsStr::to_str)
            .unwrap_or("gdt_construction_planner.exe")
    );
    if let Ok((app_key, _)) = hkcu.create_subkey(&app_key_path) {
        let _ = app_key.set_value("FriendlyAppName", &"GDT Construction Planner");
        let _ = app_key.set_value("AppCompany", &"GDT");
        if let Ok((app_icon, _)) = app_key.create_subkey("DefaultIcon") {
            let _ = app_icon.set_value("", &icon_value);
        }
        if let Ok((supported, _)) = app_key.create_subkey("SupportedTypes") {
            let _ = supported.set_value(EXT_PRIMARY, &"");
        }
    }

    if let Some(parent) = marker.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(
        marker,
        format!(
            "{}\n{}\n{}",
            exe_str.as_ref(),
            icon_path.to_string_lossy(),
            INTEGRATION_MARKER
        ),
    )?;

    notify_shell_association_changed();
    Ok(true)
}

/// Collect a project path from process arguments (double-click or `app.exe file.gctp.json`).
pub fn project_path_from_args<I, S>(args: I) -> Option<String>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    for arg in args {
        let s = arg.as_ref();
        if s.starts_with('-') {
            continue;
        }
        if let Ok(url) = url::Url::parse(s) {
            if let Ok(path) = url.to_file_path() {
                if is_project_path(&path) {
                    return Some(path.to_string_lossy().into_owned());
                }
            }
            continue;
        }
        let path = PathBuf::from(s);
        if is_project_path(&path) {
            return Some(path.to_string_lossy().into_owned());
        }
    }
    None
}

pub fn is_project_path(path: &Path) -> bool {
    is_gctp_project_path(path)
}

pub fn setup_pending_open(app: &AppHandle, args: std::env::Args) {
    if let Some(path) = project_path_from_args(args.skip(1)) {
        if let Some(state) = app.try_state::<PendingProjectOpen>() {
            *state.0.lock().expect("pending open lock") = Some(path);
        }
    }
}

pub fn handle_second_instance(app: &AppHandle, argv: Vec<String>) {
    if let Some(path) = project_path_from_args(argv) {
        let _ = app.emit("open-project-file", path.clone());
        if let Some(state) = app.try_state::<PendingProjectOpen>() {
            *state.0.lock().expect("pending open lock") = Some(path);
        }
    }
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[tauri::command]
pub fn take_pending_project_path(
    state: tauri::State<'_, PendingProjectOpen>,
) -> Option<String> {
    state.0.lock().ok()?.take()
}

#[tauri::command]
pub fn ensure_desktop_integration(_app: AppHandle) -> Result<IntegrationReport, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let registered = ensure_file_associations(&exe).map_err(|e| e.to_string())?;
    Ok(IntegrationReport {
        registered,
        exe_path: exe.to_string_lossy().into_owned(),
    })
}

#[derive(serde::Serialize)]
pub struct IntegrationReport {
    pub registered: bool,
    pub exe_path: String,
}
