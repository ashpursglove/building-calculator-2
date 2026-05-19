//! Cross-platform desktop hooks (Windows implementation in `windows_integration`).

use std::path::Path;

/// True for GDT project files (`.gctp`, with `.gctp.json` accepted for legacy compatibility).
pub fn is_gctp_project_path(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|n| {
            let lower = n.to_ascii_lowercase();
            lower.ends_with(".gctp") || lower.ends_with(".gctp.json")
        })
        .unwrap_or(false)
}

#[cfg(windows)]
pub use crate::windows_integration::{
    ensure_desktop_integration, handle_second_instance, setup_pending_open,
    take_pending_project_path, PendingProjectOpen,
};

#[cfg(not(windows))]
mod non_windows {
    use std::sync::Mutex;

    pub struct PendingProjectOpen(pub Mutex<Option<String>>);

    impl Default for PendingProjectOpen {
        fn default() -> Self {
            Self(Mutex::new(None))
        }
    }

    #[derive(serde::Serialize)]
    pub struct IntegrationReport {
        pub registered: bool,
        pub exe_path: String,
    }

    pub fn setup_pending_open(_app: &tauri::AppHandle, _args: std::env::Args) {}

    pub fn handle_second_instance(_app: &tauri::AppHandle, _argv: Vec<String>) {}

    #[tauri::command]
    pub fn take_pending_project_path(
        _state: tauri::State<'_, PendingProjectOpen>,
    ) -> Option<String> {
        None
    }

    #[tauri::command]
    pub fn ensure_desktop_integration() -> Result<IntegrationReport, String> {
        Ok(IntegrationReport {
            registered: false,
            exe_path: String::new(),
        })
    }
}

#[cfg(not(windows))]
pub use non_windows::*;
