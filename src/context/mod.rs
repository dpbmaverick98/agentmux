use anyhow::Result;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver};

pub struct SharedContext {
    pub path: PathBuf,
    watcher: RecommendedWatcher,
    rx: Receiver<notify::Result<Event>>,
}

impl SharedContext {
    pub fn new(path: PathBuf) -> Result<Self> {
        let (tx, rx) = channel();
        
        let watcher = RecommendedWatcher::new(
            move |res: notify::Result<Event>| {
                let _ = tx.send(res);
            },
            Config::default(),
        )?;
        
        Ok(Self {
            path,
            watcher,
            rx,
        })
    }
    
    pub fn watch(&mut self) -> Result<()> {
        self.watcher.watch(&self.path, RecursiveMode::Recursive)?;
        Ok(())
    }
    
    pub fn check_events(&self) -> Vec<PathBuf> {
        let mut changed_files = Vec::new();
        
        while let Ok(Ok(event)) = self.rx.try_recv() {
            for path in event.paths {
                if path.extension().map_or(false, |e| e == "md") {
                    changed_files.push(path);
                }
            }
        }
        
        changed_files
    }
    
    pub fn read_file(&self, filename: &str) -> Result<String> {
        let path = self.path.join(filename);
        Ok(std::fs::read_to_string(path)?)
    }
    
    pub fn list_files(&self) -> Result<Vec<( String, String )>> {
        let mut files = Vec::new();
        
        for entry in std::fs::read_dir(&self.path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.extension().map_or(false, |e| e == "md") {
                let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let content = std::fs::read_to_string(&path)?;
                let preview = content.lines().next().unwrap_or("").to_string();
                files.push((name, preview));
            }
        }
        
        Ok(files)
    }
}