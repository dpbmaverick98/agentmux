use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::{Child, Command};

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
    pub agent_type: String, // renamed from 'type' which is reserved
    pub provider: Option<String>,
    pub model: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SharedConfig {
    pub auto_sync: bool,
    pub notify_on_change: bool,
}

pub struct AgentManager {
    config: Config,
    processes: HashMap<String, Child>,
}

impl AgentManager {
    pub fn new(config: Config) -> Self {
        Self {
            config,
            processes: HashMap::new(),
        }
    }
    
    pub async fn start_agent(&mut self,
        agent_config: &AgentConfig,
        working_dir: PathBuf,
        shared_dir: PathBuf,
    ) -> Result<()> {
        if !agent_config.enabled {
            return Ok(());
        }
        
        let (cmd, args) = match agent_config.agent_type.as_str() {
            "opencode" => {
                let mut args = vec!["run".to_string()];
                if let Some(provider) = &agent_config.provider {
                    args.push("--provider".to_string());
                    args.push(provider.clone());
                }
                if let Some(model) = &agent_config.model {
                    args.push("--model".to_string());
                    args.push(model.clone());
                }
                args.push("-c".to_string()); // Continue conversation
                ("opencode", args)
            }
            "claude" => {
                let mut args = vec![
                    "--dangerously-skip-permissions".to_string(),
                    "-c".to_string(), // Continue conversation
                ];
                if let Some(model) = &agent_config.model {
                    args.push("--model".to_string());
                    args.push(model.clone());
                }
                ("claude", args)
            }
            _ => {
                return Err(anyhow::anyhow!("Unknown agent type: {}", agent_config.agent_type));
            }
        };
        
        let shared_dir_str = shared_dir.to_string_lossy().to_string();
        
        let child = Command::new(cmd)
            .args(&args)
            .current_dir(&working_dir)
            .env("AGENTMUX_AGENT_NAME", &agent_config.name)
            .env("AGENTMUX_SHARED_DIR", &shared_dir_str)
            .env("AGENTMUX_PROJECT", &self.config.project.name)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
        
        self.processes.insert(agent_config.name.clone(), child);
        
        Ok(())
    }
    
    pub async fn stop_all(&mut self) -> Result<()> {
        for (name, mut child) in self.processes.drain() {
            println!("Stopping agent: {}", name);
            let _ = child.kill().await;
        }
        Ok(())
    }
    
    pub fn get_agents(&self) -> &Vec<AgentConfig> {
        &self.config.agents
    }
}