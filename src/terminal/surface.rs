use anyhow::Result;
use portable_pty::{self, CommandBuilder, MasterPty, PtySize};
use std::io::{self, Read, Write};
use std::path::PathBuf;

/// A simplified terminal surface that wraps a PTY
pub struct TerminalSurface {
    /// The PTY master for I/O
    master: Box<dyn MasterPty>,
    /// Output buffer for reading
    output_buffer: Vec<u8>,
}

impl TerminalSurface {
    pub fn new(
        command: &str,
        args: &[String],
        env_vars: &[(String, String)],
        working_dir: &PathBuf,
        rows: u16,
        cols: u16,
    ) -> Result<Self> {
        // Create PTY
        let pty_system = portable_pty::native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        // Spawn command
        let mut cmd = CommandBuilder::new(command);
        cmd.args(args);
        cmd.cwd(working_dir);

        for (key, value) in env_vars {
            cmd.env(key, value);
        }

        let _child = pair.slave.spawn_command(cmd)?;

        Ok(Self {
            master: pair.master,
            output_buffer: Vec::new(),
        })
    }

    /// Send text input to the terminal (character by character like typing)
    pub fn send_text(&mut self, text: &str) -> Result<()> {
        let mut writer = self.master.take_writer()?;
        for byte in text.bytes() {
            writer.write_all(&[byte])?;
            writer.flush()?;
            // Small delay to simulate typing
            std::thread::sleep(std::time::Duration::from_millis(5));
        }
        Ok(())
    }

    /// Read output from PTY
    pub fn process_output(&mut self) -> Result<()> {
        let mut reader = self.master.try_clone_reader()?;
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    self.output_buffer.extend_from_slice(&buf[..n]);
                }
                Err(e) if e.kind() == io::ErrorKind::WouldBlock => break,
                Err(e) => return Err(anyhow::anyhow!("Read error: {}", e)),
            }
        }
        Ok(())
    }

    /// Resize the terminal
    pub fn resize(&mut self, rows: u16, cols: u16) -> Result<()> {
        self.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    /// Get terminal content for rendering
    pub fn content(&self) -> String {
        // Convert output buffer to string, keeping only the last N lines
        let text = String::from_utf8_lossy(&self.output_buffer);

        // Keep only last 100 lines to avoid memory bloat
        let lines: Vec<&str> = text.lines().collect();
        if lines.len() > 100 {
            lines[lines.len() - 100..].join("\n")
        } else {
            text.to_string()
        }
    }
}
