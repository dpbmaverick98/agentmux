use anyhow::Result;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::thread;

pub struct PtyTerminal {
    writer: Box<dyn Write + Send>,
    output_rx: Receiver<String>,
    _reader_handle: thread::JoinHandle<()>,
}

impl PtyTerminal {
    pub fn new(
        cmd: &str,
        args: &[String],
        env_vars: &[(String, String)],
        working_dir: &str,
    ) -> Result<Self> {
        let pty_system = native_pty_system();

        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        let mut cmd_builder = CommandBuilder::new(cmd);
        cmd_builder.args(args);
        cmd_builder.cwd(working_dir);

        for (key, value) in env_vars {
            cmd_builder.env(key, value);
        }

        // Spawn the process
        let _child = pair.slave.spawn_command(cmd_builder)?;

        let writer = pair.master.take_writer()?;
        let mut reader = pair.master.try_clone_reader()?;

        // Channel for output
        let (output_tx, output_rx): (Sender<String>, Receiver<String>) = channel();

        // Spawn reader thread
        let _reader_handle = thread::spawn(move || {
            let mut buf = [0u8; 1024];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]);
                        if output_tx.send(text.to_string()).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        Ok(Self {
            writer,
            output_rx,
            _reader_handle,
        })
    }

    pub fn write(&mut self, data: &str) -> Result<()> {
        self.writer.write_all(data.as_bytes())?;
        self.writer.flush()?;
        Ok(())
    }

    pub fn read_output(&self) -> Vec<String> {
        let mut output = Vec::new();
        while let Ok(text) = self.output_rx.try_recv() {
            output.push(text);
        }
        output
    }
}
