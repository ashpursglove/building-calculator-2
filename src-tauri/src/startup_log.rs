//! Thread-safe collector for everything the Rust `setup` hook does on launch.

use std::sync::Mutex;

use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum StartupEntryStatus {
    Done,
    Skipped,
    Warning,
    Info,
}

#[derive(Debug, Clone, Serialize)]
pub struct StartupEntry {
    pub status: StartupEntryStatus,
    pub message: String,
    pub detail: Option<String>,
}

#[derive(Default)]
pub struct StartupLog(Mutex<Vec<StartupEntry>>);

impl StartupLog {
    pub fn push(&self, status: StartupEntryStatus, message: impl Into<String>) {
        self.push_with_detail(status, message, None::<String>);
    }

    pub fn push_with_detail(
        &self,
        status: StartupEntryStatus,
        message: impl Into<String>,
        detail: Option<impl Into<String>>,
    ) {
        if let Ok(mut guard) = self.0.lock() {
            guard.push(StartupEntry {
                status,
                message: message.into(),
                detail: detail.map(Into::into),
            });
        }
    }

    pub fn snapshot(&self) -> Vec<StartupEntry> {
        self.0.lock().map(|g| g.clone()).unwrap_or_default()
    }
}
