use anyhow::Result;
use std::path::PathBuf;
use std::process::Command;

/// Initialize a new JJ repository
pub fn init_repo(path: &PathBuf) -> Result<()> {
    let output = Command::new("jj")
        .args(&["init", "--git-repo", "."])
        .current_dir(path)
        .output()?;

    if !output.status.success() {
        return Err(anyhow::anyhow!(
            "Failed to init JJ repo: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}

/// Create a new change for an agent
pub fn new_change(agent_id: &str, repo_path: &PathBuf) -> Result<String> {
    let message = format!("@{} workspace", agent_id);

    let output = Command::new("jj")
        .args(&["new", "-m", &message])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        return Err(anyhow::anyhow!(
            "Failed to create change: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Get the change ID
    let log_output = Command::new("jj")
        .args(&["log", "--template", "change_id", "-r", "@", "--no-graph"])
        .current_dir(repo_path)
        .output()?;

    let change_id = String::from_utf8_lossy(&log_output.stdout)
        .trim()
        .to_string();

    Ok(change_id)
}

/// Get current status
pub fn status(repo_path: &PathBuf) -> Result<String> {
    let output = Command::new("jj")
        .args(&["status"])
        .current_dir(repo_path)
        .output()?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Get log of changes
pub fn log(repo_path: &PathBuf) -> Result<String> {
    let output = Command::new("jj")
        .args(&["log"])
        .current_dir(repo_path)
        .output()?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Describe current change
pub fn describe(message: &str, repo_path: &PathBuf) -> Result<()> {
    let output = Command::new("jj")
        .args(&["describe", "-m", message])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        return Err(anyhow::anyhow!(
            "Failed to describe change: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}

/// Check for conflicts
pub fn has_conflicts(repo_path: &PathBuf) -> Result<bool> {
    let output = Command::new("jj")
        .args(&["status", "--template", "conflicts"])
        .current_dir(repo_path)
        .output()?;

    let status = String::from_utf8_lossy(&output.stdout);
    Ok(status.contains("conflict"))
}

/// Get list of conflicting files
pub fn conflicting_files(repo_path: &PathBuf) -> Result<Vec<String>> {
    let output = Command::new("jj")
        .args(&["diff", "--summary"])
        .current_dir(repo_path)
        .output()?;

    let diff = String::from_utf8_lossy(&output.stdout);
    let files: Vec<String> = diff
        .lines()
        .filter(|line| line.contains("C")) // Conflict marker
        .map(|line| line.split_whitespace().last().unwrap_or("").to_string())
        .filter(|s| !s.is_empty())
        .collect();

    Ok(files)
}

/// Resolve conflicts in a file
pub fn resolve(file: &str, repo_path: &PathBuf) -> Result<()> {
    let output = Command::new("jj")
        .args(&["resolve", file])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        return Err(anyhow::anyhow!(
            "Failed to resolve: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}
