use anyhow::Result;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::{Backend, CrosstermBackend},
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{Block, Borders, List, ListItem, Paragraph, Wrap},
    Frame, Terminal,
};
use std::io;
use std::path::PathBuf;
use std::time::Duration;

use crate::agents::{AgentManager, Config};
use crate::context::SharedContext;

pub struct App {
    config: Config,
    agent_manager: AgentManager,
    shared_context: SharedContext,
    active_agent: usize,
    should_quit: bool,
    notifications: Vec<String>,
}

impl App {
    pub async fn new(config: Config) -> Result<Self> {
        let shared_dir = dirs::home_dir()
            .expect("Could not find home directory")
            .join(".agentmux")
            .join("shared")
            .join(&config.project.name);
        
        let mut shared_context = SharedContext::new(shared_dir)?;
        shared_context.watch()?;
        
        let mut agent_manager = AgentManager::new(config.clone());
        let working_dir = PathBuf::from(&config.project.working_dir);
        
        // Start all enabled agents
        for agent in &config.agents {
            if agent.enabled {
                let shared_dir = dirs::home_dir()
                    .unwrap()
                    .join(".agentmux")
                    .join("shared")
                    .join(&config.project.name);
                
                agent_manager.start_agent(&agent.name, working_dir.clone(), shared_dir)?;
            }
        }
        
        Ok(Self {
            config,
            agent_manager,
            shared_context,
            active_agent: 0,
            should_quit: false,
            notifications: Vec::new(),
        })
    }
    
    pub async fn run(&mut self) -> Result<()> {
        // Setup terminal
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
        let backend = CrosstermBackend::new(stdout);
        let mut terminal = Terminal::new(backend)?;
        
        let result = self.run_app(&mut terminal).await;
        
        // Restore terminal
        disable_raw_mode()?;
        execute!(
            terminal.backend_mut(),
            LeaveAlternateScreen,
            DisableMouseCapture
        )?;
        terminal.show_cursor()?;
        
        // Stop all agents
        self.agent_manager.stop_all()?;
        
        result
    }
    
    async fn run_app<B: Backend>(&mut self,
        terminal: &mut Terminal<B>,
    ) -> Result<()> {
        let mut last_tick = std::time::Instant::now();
        let tick_rate = Duration::from_millis(250);
        
        while !self.should_quit {
            // Draw UI
            terminal.draw(|f| self.draw(f))?;
            
            // Handle events
            let timeout = tick_rate.saturating_sub(last_tick.elapsed());
            if crossterm::event::poll(timeout)? {
                if let Event::Key(key) = event::read()? {
                    if key.kind == KeyEventKind::Press {
                        self.handle_key(key.code).await?;
                    }
                }
            }
            
            // Check for file changes
            let changed_files = self.shared_context.check_events();
            for file in changed_files {
                let filename = file.file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or_default();
                self.notifications.push(format!("Updated: {}", filename));
                // Keep only last 5 notifications
                if self.notifications.len() > 5 {
                    self.notifications.remove(0);
                }
            }
            
            // Tick
            if last_tick.elapsed() >= tick_rate {
                last_tick = std::time::Instant::now();
            }
        }
        
        Ok(())
    }
    
    async fn handle_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Char('q') | KeyCode::Char('Q') => {
                self.should_quit = true;
            }
            KeyCode::Char('n') | KeyCode::Char('N') => {
                self.next_agent();
            }
            KeyCode::Char('p') | KeyCode::Char('P') => {
                self.prev_agent();
            }
            KeyCode::Char('r') | KeyCode::Char('R') => {
                // Refresh shared context
            }
            _ => {}
        }
        Ok(())
    }
    
    fn next_agent(&mut self) {
        let agents = self.agent_manager.get_agents();
        if !agents.is_empty() {
            self.active_agent = (self.active_agent + 1) % agents.len();
        }
    }
    
    fn prev_agent(&mut self) {
        let agents = self.agent_manager.get_agents();
        if !agents.is_empty() {
            self.active_agent = (self.active_agent + agents.len() - 1) % agents.len();
        }
    }
    
    fn draw(&self,
        frame: &mut Frame,
    ) {
        let chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Length(20), // Sidebar
                Constraint::Min(40),    // Terminal area
                Constraint::Length(30), // Shared context
            ])
            .split(frame.size());
        
        // Sidebar with agent tabs
        self.draw_sidebar(frame, chunks[0]);
        
        // Terminal area
        self.draw_terminal_area(frame, chunks[1]);
        
        // Shared context panel
        self.draw_shared_panel(frame, chunks[2]);
    }
    
    fn draw_sidebar(&self,
        frame: &mut Frame,
        area: Rect,
    ) {
        let agents = self.agent_manager.get_agents();
        
        let items: Vec<ListItem> = agents
            .iter()
            .enumerate()
            .map(|(i, agent)| {
                let status = if agent.enabled { "🟢" } else { "⚪" };
                let short_name = agent.name.split('-').next().unwrap_or(&agent.name);
                let content = format!("{} {}", status, short_name);
                
                let style = if i == self.active_agent {
                    Style::default()
                        .bg(Color::Blue)
                        .fg(Color::White)
                        .add_modifier(Modifier::BOLD)
                } else {
                    Style::default().fg(Color::White)
                };
                
                ListItem::new(content).style(style)
            })
            .collect();
        
        let list = List::new(items)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(Color::Cyan))
                    .title(" Agents ")
            );
        
        frame.render_widget(list, area);
    }
    
    fn draw_terminal_area(&self,
        frame: &mut Frame,
        area: Rect,
    ) {
        let agents = self.agent_manager.get_agents();
        let agent_name = agents
            .get(self.active_agent)
            .map(|a| a.name.as_str())
            .unwrap_or("No agent");
        
        let block = Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::White))
            .title(format!(" Terminal - {} ", agent_name));
        
        let text = Text::from(vec![
            Line::from("Terminal placeholder - PTY integration coming soon"),
            Line::from(""),
            Line::from("Press 'q' to quit, 'n' for next agent, 'p' for prev"),
        ]);
        
        let paragraph = Paragraph::new(text)
            .block(block)
            .wrap(Wrap { trim: true });
        
        frame.render_widget(paragraph, area);
    }
    
    fn draw_shared_panel(&self,
        frame: &mut Frame,
        area: Rect,
    ) {
        let files = self.shared_context.list_files().unwrap_or_default();
        
        let mut text = Text::from(vec![
            Line::from(vec![
                Span::styled("Shared Context Files:", Style::default().add_modifier(Modifier::BOLD)),
            ]),
            Line::from(""),
        ]);
        
        for (name, preview) in files {
            text.lines.push(Line::from(vec![
                Span::styled(format!("📄 {} ", name), Style::default().fg(Color::Green)),
                Span::raw(preview.chars().take(30).collect::<String>()),
            ]));
        }
        
        // Add notifications
        if !self.notifications.is_empty() {
            text.lines.push(Line::from(""));
            text.lines.push(Line::from(vec![
                Span::styled("Notifications:", Style::default().add_modifier(Modifier::BOLD)),
            ]));
            for notif in &self.notifications {
                text.lines.push(Line::from(format!("• {}", notif)));
            }
        }
        
        let block = Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Green))
            .title(" Shared Context ");
        
        let paragraph = Paragraph::new(text)
            .block(block)
            .wrap(Wrap { trim: true });
        
        frame.render_widget(paragraph, area);
    }
}