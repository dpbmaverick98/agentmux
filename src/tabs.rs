use crate::terminal::surface::TerminalSurface;
use anyhow::Result;
use std::collections::HashMap;
use std::path::PathBuf;

/// Represents a single agent tab
pub struct Tab {
    /// Unique identifier (e.g., "kimi", "minimax", "claude")
    pub id: String,
    /// Display name
    pub name: String,
    /// The terminal surface
    pub surface: TerminalSurface,
    /// Whether this tab is currently active
    pub is_active: bool,
    /// Number of unread messages/notifications
    pub unread_count: usize,
    /// JJ change ID if applicable
    pub change_id: Option<String>,
    /// Agent configuration
    pub agent_config: AgentConfig,
}

#[derive(Clone, Debug)]
pub struct AgentConfig {
    pub id: String,
    pub name: String,
    pub agent_type: String,       // "opencode", "claude"
    pub provider: Option<String>, // "kimi", "minimax"
    pub model: Option<String>,
    pub command: String,
    pub args: Vec<String>,
}

impl Tab {
    pub fn new(
        id: String,
        name: String,
        agent_config: AgentConfig,
        working_dir: PathBuf,
        rows: u16,
        cols: u16,
    ) -> Result<Self> {
        let env_vars = vec![
            ("AGENTMUX_AGENT_NAME".to_string(), id.clone()),
            (
                "AGENTMUX_AGENT_TYPE".to_string(),
                agent_config.agent_type.clone(),
            ),
        ];

        let surface = TerminalSurface::new(
            &agent_config.command,
            &agent_config.args,
            &env_vars,
            &working_dir,
            rows,
            cols,
        )?;

        Ok(Self {
            id,
            name,
            surface,
            is_active: false,
            unread_count: 0,
            change_id: None,
            agent_config,
        })
    }

    /// Send text to this agent's terminal (literally types it in)
    pub fn send_text(&mut self, text: &str) -> Result<()> {
        self.surface.send_text(text)
    }

    /// Process output from PTY
    pub fn process_output(&mut self) -> Result<()> {
        self.surface.process_output()
    }

    /// Resize the terminal
    pub fn resize(&mut self, rows: u16, cols: u16) -> Result<()> {
        self.surface.resize(rows, cols)
    }

    /// Mark as active
    pub fn activate(&mut self) {
        self.is_active = true;
        self.unread_count = 0;
    }

    /// Mark as inactive
    pub fn deactivate(&mut self) {
        self.is_active = false;
    }

    /// Increment unread count
    pub fn add_unread(&mut self) {
        self.unread_count += 1;
    }
}

/// Manages all agent tabs
pub struct TabManager {
    tabs: HashMap<String, Tab>,
    active_tab: Option<String>,
    tab_order: Vec<String>,
    working_dir: PathBuf,
    rows: u16,
    cols: u16,
}

impl TabManager {
    pub fn new(working_dir: PathBuf, rows: u16, cols: u16) -> Self {
        Self {
            tabs: HashMap::new(),
            active_tab: None,
            tab_order: Vec::new(),
            working_dir,
            rows,
            cols,
        }
    }

    /// Create a new tab for an agent
    pub fn create_tab(
        &mut self,
        id: String,
        name: String,
        agent_config: AgentConfig,
    ) -> Result<()> {
        let tab = Tab::new(
            id.clone(),
            name,
            agent_config,
            self.working_dir.clone(),
            self.rows,
            self.cols,
        )?;

        let id_for_switch = id.clone();
        self.tabs.insert(id, tab);
        self.tab_order.push(id_for_switch.clone());

        // If this is the first tab, make it active
        if self.active_tab.is_none() {
            self.switch_to_tab(&id_for_switch)?;
        }

        Ok(())
    }

    /// Switch to a specific tab
    pub fn switch_to_tab(&mut self, id: &str) -> Result<()> {
        // Deactivate current tab
        if let Some(current_id) = &self.active_tab {
            if let Some(tab) = self.tabs.get_mut(current_id) {
                tab.deactivate();
            }
        }

        // Activate new tab
        if let Some(tab) = self.tabs.get_mut(id) {
            tab.activate();
            self.active_tab = Some(id.to_string());
        }

        Ok(())
    }

    /// Get the active tab
    pub fn active_tab(&self) -> Option<&Tab> {
        self.active_tab.as_ref().and_then(|id| self.tabs.get(id))
    }

    /// Get mutable reference to active tab
    pub fn active_tab_mut(&mut self) -> Option<&mut Tab> {
        self.active_tab
            .as_ref()
            .and_then(|id| self.tabs.get_mut(id))
    }

    /// Get tab by ID
    pub fn get_tab(&self, id: &str) -> Option<&Tab> {
        self.tabs.get(id)
    }

    /// Get mutable tab by ID
    pub fn get_tab_mut(&mut self, id: &str) -> Option<&mut Tab> {
        self.tabs.get_mut(id)
    }

    /// Get all tabs in order
    pub fn tabs(&self) -> Vec<&Tab> {
        self.tab_order
            .iter()
            .filter_map(|id| self.tabs.get(id))
            .collect()
    }

    /// Process output for all tabs
    pub fn process_all_output(&mut self) -> Result<()> {
        for tab in self.tabs.values_mut() {
            tab.process_output()?;
        }
        Ok(())
    }

    /// Resize all tabs
    pub fn resize_all(&mut self, rows: u16, cols: u16) -> Result<()> {
        self.rows = rows;
        self.cols = cols;
        for tab in self.tabs.values_mut() {
            tab.resize(rows, cols)?;
        }
        Ok(())
    }

    /// Send text to a specific tab
    pub fn send_to_tab(&mut self, id: &str, text: &str) -> Result<()> {
        if let Some(tab) = self.tabs.get_mut(id) {
            tab.send_text(text)?;
            // If not active, increment unread
            if !tab.is_active {
                tab.add_unread();
            }
        }
        Ok(())
    }

    /// Get active tab ID
    pub fn active_tab_id(&self) -> Option<&String> {
        self.active_tab.as_ref()
    }

    /// Get tab order
    pub fn tab_order(&self) -> &[String] {
        &self.tab_order
    }

    /// Get working directory
    pub fn working_dir(&self) -> &PathBuf {
        &self.working_dir
    }
}
