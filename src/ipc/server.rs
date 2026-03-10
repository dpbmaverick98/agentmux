use super::{Request, Response, socket_path};
use anyhow::Result;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::Mutex;

pub struct Server;

impl Server {
    pub fn new() -> Self {
        Self
    }
    
    pub async fn run(&self) -> Result<()> {
        let socket = socket_path();
        
        // Remove old socket if it exists
        if socket.exists() {
            std::fs::remove_file(&socket)?;
        }
        
        let listener = UnixListener::bind(&socket)?;
        println!("🌐 IPC server listening on {:?}", socket);
        
        loop {
            let (stream, _) = listener.accept().await?;
            
            // Handle client sequentially (no spawn) to avoid Send issues
            if let Err(e) = handle_client(stream).await {
                eprintln!("Error handling client: {}", e);
            }
        }
    }
}

async fn handle_client(
    stream: UnixStream,
) -> Result<()> {
    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);
    let mut line = String::new();
    
    // Read request line
    reader.read_line(&mut line).await?;
    
    // Parse request
    let request: Request = match serde_json::from_str(&line) {
        Ok(req) => req,
        Err(e) => {
            let response = Response {
                ok: false,
                result: None,
                error: Some(format!("Invalid request: {}", e)),
            };
            let response_json = serde_json::to_string(&response)?;
            writer.write_all(response_json.as_bytes()).await?;
            return Ok(());
        }
    };
    
    // Process request (simplified for now)
    let response = match request {
        Request::SendMessage { to, text } => {
            println!("📨 Message to {}: {}", to, text);
            Response {
                ok: true,
                result: Some(serde_json::json!({"to": to, "text": text})),
                error: None,
            }
        }
        Request::SwitchTab { agent } => {
            println!("🔄 Switch to tab: {}", agent);
            Response {
                ok: true,
                result: Some(serde_json::json!({"switched_to": agent})),
                error: None,
            }
        }
        Request::ListAgents => {
            Response {
                ok: true,
                result: Some(serde_json::json!({})),
                error: None,
            }
        }
        Request::JjStatus => {
            Response {
                ok: true,
                result: Some(serde_json::json!({})),
                error: None,
            }
        }
    };
    
    // Send response
    let response_json = serde_json::to_string(&response)?;
    writer.write_all(response_json.as_bytes()).await?;
    
    Ok(())
}