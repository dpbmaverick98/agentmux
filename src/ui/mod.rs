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
    widgets::{Block, Borders, Clear, List, ListItem, Paragraph, Wrap},
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
    show_help: bool,
    notifications: Vec<String>,
    input_buffer: String,
    input_mode: InputMode,
}

#[derive(Clone, Copy, PartialEq)]
enum InputMode {
    Normal,
    Command,
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
            show_help: false,
            notifications: Vec::new(),
            input_buffer: String::new(),
            input_mode: InputMode::Normal,
        })
    }
    
    pub async fn run(&mut self) -> Result<()> {
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
        let backend = CrosstermBackend::new(stdout);
        let mut terminal = Terminal::new(backend)?;
        
        let result = self.run_app(&mut terminal).await;
        
        disable_raw_mode()?;
        execute!(
            terminal.backend_mut(),
            LeaveAlternateScreen,
            DisableMouseCapture
        )?;
        terminal.show_cursor()?;
        
        self.agent_manager.stop_all()?;
        
        result
    }
    
    async fn run_app<B: Backend>(&mut self, terminal: &mut Terminal<B>) -> Result<()> {
        let mut last_tick = std::time::Instant::now();
        let tick_rate = Duration::from_millis(100);
        
        while !self.should_quit {
            self.agent_manager.update_output();
            
            terminal.draw(|f| self.draw(f))?;
            
            let timeout = tick_rate.saturating_sub(last_tick.elapsed());
            if crossterm::event::poll(timeout)? {
                if let Event::Key(key) = event::read()? {
                    if key.kind == KeyEventKind::Press {
                        self.handle_key(key.code).await?;
                    }
                }
            }
            
            let changed_files = self.shared_context.check_events();
            for file in changed_files {
                let filename = file.file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or_default();
                self.notifications.push(format!("Updated: {}", filename));
                if self.notifications.len() > 5 {
                    self.notifications.remove(0);
                }
            }
            
            if last_tick.elapsed() >= tick_rate {
                last_tick = std::time::Instant::now();
            }
        }
        
        Ok(())
    }
    
    async fn handle_key(&mut self, key: KeyCode) -> Result<()> {
        match self.input_mode {
            InputMode::Normal => self.handle_normal_key(key).await,
            InputMode::Command => self.handle_command_key(key).await,
        }
    }
    
    async fn handle_normal_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Char('q') => self.should_quit = true,
            KeyCode::Char('?') => self.show_help = !self.show_help,
            KeyCode::Char(':') => {
                self.input_mode = InputMode::Command;
                self.input_buffer.clear();
            }
            KeyCode::Tab => self.next_agent(),
            KeyCode::BackTab => self.prev_agent(),
            KeyCode::Char('n') => self.next_agent(),
            KeyCode::Char('p') => self.prev_agent(),
            KeyCode::Char('r') => {
                // Refresh
            }
            _ => {}
        }
        Ok(())
    }
    
    async fn handle_command_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            KeyCode::Esc => {
                self.input_mode = InputMode::Normal;
                self.input_buffer.clear();
            }
            KeyCode::Enter => {
                let agent_name = self.agent_manager.get_agents()
                    .get(self.active_agent)
                    .map(|a| a.name.clone());
                if let Some(name) = agent_name {
                    let _ = self.agent_manager.send_input(&name, &self.input_buffer);
                }
                self.input_buffer.clear();
                self.input_mode = InputMode::Normal;
            }
            KeyCode::Char(c) => {
                self.input_buffer.push(c);
            }
            KeyCode::Backspace => {
                self.input_buffer.pop();
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
    
    fn draw(&self, frame: &mut Frame) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Length(3),  // Header with agent tabs
                Constraint::Min(10),    // Main content
                Constraint::Length(3),  // Input bar
                Constraint::Length(1),  // Status line
            ])
            .split(frame.size());
        
        self.draw_header(frame, chunks[0]);
        self.draw_main(frame, chunks[1]);
        self.draw_input_bar(frame, chunks[2]);
        self.draw_status_line(frame, chunks[3]);
        
        if self.show_help {
            self.draw_help_overlay(frame);
        }
    }
    
    fn draw_header(&self, frame: &mut Frame, area: Rect) {
        let agents = self.agent_manager.get_agents();
        
        let mut spans = vec![Span::raw(" AgentMux ")];
        
        for (i, agent) in agents.iter().enumerate() {
            let is_active = i == self.active_agent;
            let status = if agent.enabled { "●" } else { "○" };
            
            if is_active {
                spans.push(Span::styled(
                    format!(" [{} {}]", status, agent.name),
                    Style::default()
                        .bg(Color::Blue)
                        .fg(Color::White)
                        .add_modifier(Modifier::BOLD)
                ));
            } else {
                spans.push(Span::styled(
                    format!("  {} {}  ", status, agent.name),
                    Style::default().fg(Color::Gray)
                ));
            }
        }
        
        let header = Paragraph::new(Line::from(spans))
            .block(Block::default().borders(Borders::BOTTOM));
        
        frame.render_widget(header, area);
    }
    
    fn draw_main(&self, frame: &mut Frame, area: Rect) {
        let chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage(70),  // Terminal output
                Constraint::Percentage(30),  // Shared context
            ])
            .split(area);
        
        self.draw_terminal(frame, chunks[0]);
        self.draw_shared_context(frame, chunks[1]);
    }
    
    fn draw_terminal(&self, frame: &mut Frame, area: Rect) {
        let agents = self.agent_manager.get_agents();
        let agent_name = agents
            .get(self.active_agent)
            .map(|a| a.name.as_str())
            .unwrap_or("No agent");
        
        let output = self.agent_manager.get_output(agent_name)
            .unwrap_or_else(|| "Starting agent...".to_string());
        
        let lines: Vec<&str> = output.lines().collect();
        let start = if lines.len() > area.height as usize {
            lines.len() - area.height as usize
        } else {
            0
        };
        let visible_output = lines[start..].join("\n");
        
        let paragraph = Paragraph::new(visible_output)
            .block(Block::default()
                .title(format!(" {} ", agent_name))
                .borders(Borders::ALL))
            .wrap(Wrap { trim: false });
        
        frame.render_widget(paragraph, area);
    }
    
    fn draw_shared_context(&self, frame: &mut Frame, area: Rect) {
        let files = self.shared_context.list_files().unwrap_or_default();
        
        let mut text = Text::from(vec![
            Line::from(vec![Span::styled("Shared Context", Style::default().add_modifier(Modifier::BOLD))]),
            Line::from(""),
        ]);
        
        for (name, _) in files.iter().take(10) {
            text.lines.push(Line::from(format!("  {}", name)));
        }
        
        if !self.notifications.is_empty() {
            text.lines.push(Line::from(""));
            text.lines.push(Line::from(vec![Span::styled("Notifications:", Style::default().add_modifier(Modifier::BOLD))]));
            for notif in self.notifications.iter().rev().take(3) {
                text.lines.push(Line::from(format!("  • {}", notif)));
            }
        }
        
        let paragraph = Paragraph::new(text)
            .block(Block::default().borders(Borders::ALL))
            .wrap(Wrap { trim: true });
        
        frame.render_widget(paragraph, area);
    }
    
    fn draw_input_bar(&self, frame: &mut Frame, area: Rect) {
        let (input_text, prefix, style) = match self.input_mode {
            InputMode::Normal => (" Press ? for help, : for command ", "", Style::default().fg(Color::Gray)),
            InputMode::Command => (&self.input_buffer[..], "> ", Style::default().fg(Color::White)),
        };
        
        let paragraph = Paragraph::new(format!("{}{}", prefix, input_text))
            .style(style)
            .block(Block::default().borders(Borders::TOP));
        
        frame.render_widget(paragraph, area);
    }
    
    fn draw_status_line(&self, frame: &mut Frame, area: Rect) {
        let agents = self.agent_manager.get_agents();
        let agent_name = agents
            .get(self.active_agent)
            .map(|a| a.name.as_str())
            .unwrap_or("No agent");
        
        let status = format!(" {} | Tab: switch | ?: help | q: quit ", agent_name);
        
        let paragraph = Paragraph::new(status)
            .style(Style::default().bg(Color::Blue).fg(Color::White));
        
        frame.render_widget(paragraph, area);
    }
    
    fn draw_help_overlay(&self, frame: &mut Frame) {
        let area = centered_rect(60, 70, frame.size());
        
        frame.render_widget(Clear, area);
        
        let help_text = Text::from(vec![
            Line::from(vec![Span::styled("Keyboard Shortcuts", Style::default().add_modifier(Modifier::BOLD))]),
            Line::from(""),
            Line::from("Tab / n      Next agent"),
            Line::from("Shift+Tab / p Previous agent"),
            Line::from(":            Enter command mode"),
            Line::from("Esc          Exit command mode"),
            Line::from("Enter        Send command"),
            Line::from("r            Refresh context"),
            Line::from("?            Toggle help"),
            Line::from("q            Quit"),
            Line::from(""),
            Line::from(vec![Span::styled("Press ? to close", Style::default().fg(Color::Gray))]),
        ]);
        
        let help = Paragraph::new(help_text)
            .block(Block::default()
                .title(" Help ")
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::Yellow)))
            .wrap(Wrap { trim: true });
        
        frame.render_widget(help, area);
    }
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}