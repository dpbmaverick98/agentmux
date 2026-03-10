pub mod client;
pub mod server;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum Request {
    #[serde(rename = "agent.send")]
    SendMessage { to: String, text: String },
    #[serde(rename = "tab.switch")]
    SwitchTab { agent: String },
    #[serde(rename = "agent.list")]
    ListAgents,
    #[serde(rename = "jj.status")]
    JjStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub ok: bool,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
}

pub fn socket_path() -> std::path::PathBuf {
    std::env::var("AGENTMUX_SOCKET_PATH")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from("/tmp/agentmux.sock"))
}