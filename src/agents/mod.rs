use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

use crate::terminal::pty::PtyTerminal;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Config {
    pub version: String,
    pub project: ProjectConfig,
    pub agents: Vec<AgentConfig>,
    pub shared: SharedConfig,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ProjectConfig {
    pub name: String,
    pub working_dir: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AgentConfig {
    pub name: String,
    #[serde(rename = "type")]
    pub agent_type: String,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SharedConfig {
    pub auto_sync: bool,
    pub notify_on_change: bool,
}

pub struct AgentSession {
    pub config: AgentConfig,
    pub terminal: Option<PtyTerminal>,
    pub output_buffer: Vec<String>,
}

pub struct AgentManager {
    config: Config,
    sessions: HashMap<String, AgentSession>,
}

impl AgentManager {
    pub fn new(config: Config) -> Self {
        let mut sessions = HashMap::new();

        for agent in &config.agents {
            sessions.insert(
                agent.name.clone(),
                AgentSession {
                    config: agent.clone(),
                    terminal: None,
                    output_buffer: Vec::new(),
                },
            );
        }

        Self { config, sessions }
    }

    pub fn start_agent(
        &mut self,
        agent_name: &str,
        working_dir: PathBuf,
        shared_dir: PathBuf,
    ) -> Result<()> {
        let agent = self
            .sessions
            .get(agent_name)
            .ok_or_else(|| anyhow::anyhow!("Agent not found: {}", agent_name))?
            .config
            .clone();

        if !agent.enabled {
            return Ok(());
        }

        let (cmd, args) = match agent.agent_type.as_str() {
            "opencode" => {
                let mut args = vec!["run".to_string()];
                if let Some(provider) = &agent.provider {
                    args.push("--provider".to_string());
                    args.push(provider.clone());
                }
                if let Some(model) = &agent.model {
                    args.push("--model".to_string());
                    args.push(model.clone());
                }
                args.push("-c".to_string());
                ("opencode", args)
            }
            "claude" => {
                let mut args = vec![
                    "--dangerously-skip-permissions".to_string(),
                    "-c".to_string(),
                ];
                if let Some(model) = &agent.model {
                    args.push("--model".to_string());
                    args.push(model.clone());
                }
                ("claude", args)
            }
            _ => {
                return Err(anyhow::anyhow!("Unknown agent type: {}", agent.agent_type));
            }
        };

        let env_vars = vec![
            ("AGENTMUX_AGENT_NAME".to_string(), agent.name.clone()),
            (
                "AGENTMUX_SHARED_DIR".to_string(),
                shared_dir.to_string_lossy().to_string(),
            ),
            (
                "AGENTMUX_PROJECT".to_string(),
                self.config.project.name.clone(),
            ),
        ];

        let terminal = PtyTerminal::new(cmd, &args, &env_vars, &working_dir.to_string_lossy())?;

        if let Some(session) = self.sessions.get_mut(agent_name) {
            session.terminal = Some(terminal);
        }

        Ok(())
    }

    pub fn stop_agent(&mut self, agent_name: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(agent_name) {
            session.terminal = None;
        }
        Ok(())
    }

    pub fn update_output(&mut self) {
        for (_, session) in &mut self.sessions {
            if let Some(terminal) = &session.terminal {
                let output = terminal.read_output();
                session.output_buffer.extend(output);
                // Keep buffer size manageable
                if session.output_buffer.len() > 1000 {
                    session
                        .output_buffer
                        .drain(0..session.output_buffer.len() - 1000);
                }
            }
        }
    }

    pub fn get_output(&self, agent_name: &str) -> Option<String> {
        self.sessions
            .get(agent_name)
            .map(|session| session.output_buffer.concat())
    }

    pub fn send_input(&mut self, agent_name: &str, input: &str) -> Result<()> {
        if let Some(session) = self.sessions.get_mut(agent_name) {
            if let Some(terminal) = &mut session.terminal {
                terminal.write(input)?;
                terminal.write("\n")?;
            }
        }
        Ok(())
    }

    pub fn stop_all(&mut self) -> Result<()> {
        for (_, session) in &mut self.sessions {
            session.terminal = None;
        }
        Ok(())
    }

    pub fn get_agents(&self) -> Vec<&AgentConfig> {
        self.sessions.values().map(|s| &s.config).collect()
    }

    pub fn get_agent_names(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }
}
