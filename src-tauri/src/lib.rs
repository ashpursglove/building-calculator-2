#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod desktop_integration;
mod startup_log;

#[cfg(windows)]
mod windows_integration;

use std::time::Instant;

use std::path::PathBuf;

use desktop_integration::{
    ensure_desktop_integration, handle_second_instance, is_gctp_project_path,
    setup_pending_open, take_pending_project_path, PendingProjectOpen,
};
use startup_log::{StartupEntry, StartupEntryStatus, StartupLog};
use tauri::{Manager, State};

#[derive(serde::Serialize)]
struct ProjectFilePayload {
    path: String,
    content: String,
}

#[tauri::command]
fn read_project_file(path: String) -> Result<ProjectFilePayload, String> {
    let p = PathBuf::from(&path);
    if !is_gctp_project_path(&p) {
        return Err("Not a GDT Construction Planner project (.gctp)".into());
    }
    let content = std::fs::read_to_string(&p).map_err(|e| e.to_string())?;
    Ok(ProjectFilePayload {
        path,
        content,
    })
}

#[derive(serde::Serialize)]
pub struct StartupReport {
    pub version: &'static str,
    pub platform: &'static str,
    pub entries: Vec<StartupEntry>,
}

#[tauri::command]
fn get_startup_log(state: State<'_, StartupLog>) -> StartupReport {
    StartupReport {
        version: env!("CARGO_PKG_VERSION"),
        platform: platform_name(),
        entries: state.snapshot(),
    }
}

fn platform_name() -> &'static str {
    if cfg!(windows) {
        "Windows"
    } else if cfg!(target_os = "macos") {
        "macOS"
    } else if cfg!(target_os = "linux") {
        "Linux"
    } else {
        "Unknown"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_log = StartupLog::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(startup_log)
        .manage(PendingProjectOpen::default())
        .invoke_handler(tauri::generate_handler![
            get_startup_log,
            read_project_file,
            take_pending_project_path,
            ensure_desktop_integration,
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                app.handle().plugin(
                    tauri_plugin_single_instance::init(move |_app, argv, _cwd| {
                        handle_second_instance(&handle, argv);
                    }),
                )?;
            }

            let log = app.state::<StartupLog>();
            log.push(
                StartupEntryStatus::Info,
                format!(
                    "GDT Construction Planner v{} on {}",
                    env!("CARGO_PKG_VERSION"),
                    platform_name()
                ),
            );

            log.push(
                StartupEntryStatus::Done,
                "Tauri runtime initialised",
            );

            let boot = Instant::now();
            log.push(
                StartupEntryStatus::Done,
                "Native integrations ready",
            );
            log.push_with_detail(
                StartupEntryStatus::Info,
                "Filesystem & dialog plugins attached",
                Some(format!(
                    "{:.2} ms",
                    boot.elapsed().as_secs_f64() * 1000.0
                )),
            );

            #[cfg(windows)]
            {
                match crate::windows_integration::ensure_file_associations(
                    &std::env::current_exe().expect("current exe"),
                ) {
                    Ok(true) => log.push(
                        StartupEntryStatus::Done,
                        "Registered .gctp file type (this user)",
                    ),
                    Ok(false) => log.push(
                        StartupEntryStatus::Info,
                        "Project file type already registered",
                    ),
                    Err(e) => log.push(
                        StartupEntryStatus::Warning,
                        format!("File association setup: {e}"),
                    ),
                }
            }

            log.push(
                StartupEntryStatus::Info,
                "Project files use .gctp (GCTP format)",
            );

            setup_pending_open(app.handle(), std::env::args());

            log.push(
                StartupEntryStatus::Done,
                "Application ready",
            );

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.maximize();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
