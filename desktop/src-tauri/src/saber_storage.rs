use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;

use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

pub struct SaberState {
    root: Mutex<Option<PathBuf>>,
}

impl Default for SaberState {
    fn default() -> Self {
        Self {
            root: Mutex::new(None),
        }
    }
}

fn lock_root(state: &SaberState) -> Result<std::sync::MutexGuard<'_, Option<PathBuf>>, String> {
    state
        .root
        .lock()
        .map_err(|_| "saber root lock poisoned".to_string())
}

#[tauri::command]
pub fn get_root(state: State<'_, SaberState>) -> Result<Option<String>, String> {
    let guard = lock_root(&state)?;
    Ok(guard.as_ref().map(|p| path_to_string(p.as_path())))
}

#[tauri::command]
pub fn set_root(path: String, state: State<'_, SaberState>) -> Result<(), String> {
    let candidate = PathBuf::from(&path);
    if !candidate.is_dir() {
        return Err(format!("not a directory: {path}"));
    }
    let canonical = candidate
        .canonicalize()
        .map_err(|e| format!("cannot canonicalize saber root: {e}"))?;
    let mut guard = lock_root(&state)?;
    *guard = Some(canonical);
    Ok(())
}

#[tauri::command]
pub fn pick_folder(app: AppHandle) -> Result<Option<String>, String> {
    Ok(app
        .dialog()
        .file()
        .blocking_pick_folder()
        .map(|file_path| file_path.to_string()))
}

#[tauri::command]
pub fn read_text(relative_path: String, state: State<'_, SaberState>) -> Result<String, String> {
    let path = resolve_under_root(&state, &relative_path)?;
    fs::read_to_string(&path).map_err(|e| format!("read failed ({}): {e}", path.display()))
}

#[tauri::command]
pub fn write_text(
    relative_path: String,
    content: String,
    state: State<'_, SaberState>,
) -> Result<(), String> {
    let path = resolve_under_root(&state, &relative_path)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("create_dir_all failed ({}): {e}", parent.display()))?;
    }
    fs::write(&path, content.as_bytes())
        .map_err(|e| format!("write failed ({}): {e}", path.display()))
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn resolve_under_root(state: &SaberState, relative_path: &str) -> Result<PathBuf, String> {
    let root = lock_root(state)?
        .clone()
        .ok_or_else(|| "saber root not set — pick a folder first".to_string())?;
    let root_canonical = root
        .canonicalize()
        .map_err(|e| format!("invalid saber root: {e}"))?;

    let relative = relative_path.replace('\\', "/");
    let rel_path = Path::new(relative.trim_start_matches('/'));
    if rel_path.is_absolute() {
        return Err("absolute paths are not allowed".into());
    }
    for component in rel_path.components() {
        match component {
            Component::Normal(_) | Component::CurDir => {}
            Component::ParentDir | Component::Prefix(_) | Component::RootDir => {
                return Err("path traversal is not allowed".into());
            }
        }
    }

    let joined = root_canonical.join(rel_path);
    if joined.exists() {
        let canonical = joined
            .canonicalize()
            .map_err(|e| format!("cannot resolve path: {e}"))?;
        if !canonical.starts_with(&root_canonical) {
            return Err("path escapes saber root".into());
        }
        return Ok(canonical);
    }

    let mut normalized = root_canonical.clone();
    for component in rel_path.components() {
        if let Component::Normal(part) = component {
            normalized.push(part);
        }
    }
    if !normalized.starts_with(&root_canonical) {
        return Err("path escapes saber root".into());
    }
    Ok(normalized)
}
