use anyhow::Result;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver, Sender};

/// Watches for file changes in the shared context directory
pub struct FileWatcher {
    watcher: RecommendedWatcher,
    rx: Receiver<notify::Result<Event>>,
}

impl FileWatcher {
    pub fn new(shared_dir: PathBuf) -> Result<Self> {
        let (tx, rx) = channel();

        let mut watcher = RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                let _ = tx.send(res);
            },
            Config::default(),
        )?;

        watcher.watch(&shared_dir, RecursiveMode::NonRecursive)?;

        Ok(Self { watcher, rx })
    }

    /// Check for file change events
    pub fn check_events(&mut self) -> Vec<PathBuf> {
        let mut changed_files = Vec::new();

        // Drain all available events
        while let Ok(event) = self.rx.try_recv() {
            if let Ok(event) = event {
                match event.kind {
                    notify::EventKind::Modify(_) | notify::EventKind::Create(_) => {
                        changed_files.extend(event.paths);
                    }
                    _ => {}
                }
            }
        }

        changed_files
    }
}

/// Parse a message from mentions.md format
/// Format: ## YYYY-MM-DD HH:MM:SS
/// **@from** → **@to**: message text
#[derive(Debug, Clone)]
pub struct Message {
    pub timestamp: String,
    pub from: String,
    pub to: String,
    pub text: String,
}

/// Parser for mentions.md
pub struct MessageParser;

impl MessageParser {
    pub fn parse(content: &str) -> Vec<Message> {
        let mut messages = Vec::new();
        let lines: Vec<&str> = content.lines().collect();

        let mut i = 0;
        while i < lines.len() {
            let line = lines[i];

            // Check for timestamp line: ## YYYY-MM-DD HH:MM:SS
            if line.starts_with("## ") {
                let timestamp = line[3..].trim().to_string();

                // Next line should be the message
                if i + 1 < lines.len() {
                    let msg_line = lines[i + 1];

                    // Parse: **@from** → **@to**: message text
                    if let Some(message) = Self::parse_message_line(&timestamp, msg_line) {
                        messages.push(message);
                    }
                    i += 1;
                }
            }

            i += 1;
        }

        messages
    }

    fn parse_message_line(timestamp: &str, line: &str) -> Option<Message> {
        // Look for pattern: **@from** → **@to**: message
        if !line.contains("→") && !line.contains("->") {
            return None;
        }

        let parts: Vec<&str> = if line.contains("→") {
            line.split('→').collect()
        } else {
            line.split("->").collect()
        };

        if parts.len() != 2 {
            return None;
        }

        // Parse from
        let from_part = parts[0].trim();
        let from = Self::extract_agent(from_part)?;

        // Parse to and message
        let to_and_msg = parts[1].trim();
        let msg_parts: Vec<&str> = to_and_msg.splitn(2, ':').collect();

        if msg_parts.len() != 2 {
            return None;
        }

        let to = Self::extract_agent(msg_parts[0].trim())?;
        let text = msg_parts[1].trim().to_string();

        Some(Message {
            timestamp: timestamp.to_string(),
            from,
            to,
            text,
        })
    }

    fn extract_agent(text: &str) -> Option<String> {
        // Remove ** and extract @agent or agent name
        let cleaned = text.replace("**", "").replace('@', "");

        let trimmed = cleaned.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    }
}
