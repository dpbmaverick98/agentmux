use super::{Request, Response, socket_path};
use anyhow::Result;
use serde_json;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::UnixStream;

pub async fn send_message(agent: &str, text: &str) -> Result<()> {
    let request = Request::SendMessage {
        to: agent.to_string(),
        text: text.to_string(),
    };
    
    let response = send_request(request).await?;
    
    if response.ok {
        println!("✅ Message sent to {}", agent);
        Ok(())
    } else {
        Err(anyhow::anyhow!(
            "Failed to send message: {}",
            response.error.unwrap_or_default()
        ))
    }
}

pub async fn switch_tab(agent: &str) -> Result<()> {
    let request = Request::SwitchTab {
        agent: agent.to_string(),
    };
    
    let response = send_request(request).await?;
    
    if response.ok {
        println!("✅ Switched to {}", agent);
        Ok(())
    } else {
        Err(anyhow::anyhow!(
            "Failed to switch tab: {}",
            response.error.unwrap_or_default()
        ))
    }
}

async fn send_request(request: Request) -> Result<Response> {
    let socket = socket_path();
    
    if !socket.exists() {
        return Err(anyhow::anyhow!(
            "AgentMux is not running. Start it with: agentmux start"
        ));
    }
    
    let mut stream = UnixStream::connect(socket).await?;
    
    // Serialize request
    let request_json = serde_json::to_string(&request)?;
    stream.write_all(request_json.as_bytes()).await?;
    stream.write_all(b"\n").await?;
    
    // Read response
    let mut buffer = vec![0u8; 4096];
    let n = stream.read(&mut buffer).await?;
    buffer.truncate(n);
    
    let response: Response = serde_json::from_slice(&buffer)?;
    Ok(response)
}