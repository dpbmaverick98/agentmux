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
    widgets::{Block, Borders, Clear, Paragraph, Wrap},
    Frame, Terminal,
};
use std::io;
use std::path::PathBuf;
use std::time::Duration;

use crate::tabs::{AgentConfig, TabManager};

pub struct App {
    tab_manager: TabManager,
    should_quit: bool,
    show_help: bool,
    sidebar_visible: bool,
    project_name: String,
}

impl App {
    pub fn new(project_name: String, working_dir: PathBuf) -> Result<Self> {
        // Initialize with default size (will be updated on first render)
        let tab_manager = TabManager::new(working_dir, 24, 80);

        Ok(Self {
            tab_manager,
            should_quit: false,
            show_help: false,
            sidebar_visible: true,
            project_name,
        })
    }

    pub fn add_agent(
        &mut self,
        id: String,
        name: String,
        agent_type: String,
        command: String,
        args: Vec<String>,
    ) -> Result<()> {
        let config = AgentConfig {
            id: id.clone(),
            name: name.clone(),
            agent_type,
            provider: None,
            model: None,
            command,
            args,
        };

        self.tab_manager.create_tab(id, name, config)
    }

    pub fn run(&mut self) -> Result<()> {
        // Setup terminal
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
        let backend = CrosstermBackend::new(stdout);
        let mut terminal = Terminal::new(backend)?;

        let result = self.run_app(&mut terminal);

        // Restore terminal
        disable_raw_mode()?;
        execute!(
            terminal.backend_mut(),
            LeaveAlternateScreen,
            DisableMouseCapture
        )?;
        terminal.show_cursor()?;

        result
    }

    fn run_app<B: Backend>(&mut self, terminal: &mut Terminal<B>) -> Result<()> {
        let mut last_tick = std::time::Instant::now();
        let tick_rate = Duration::from_millis(100);

        while !self.should_quit {
            // Process terminal output from all tabs
            self.tab_manager.process_all_output()?;

            // Draw UI
            terminal.draw(|f| self.draw(f))?;

            // Handle events
            let timeout = tick_rate.saturating_sub(last_tick.elapsed());
            if crossterm::event::poll(timeout)? {
                if let Event::Key(key) = event::read()? {
                    if key.kind == KeyEventKind::Press {
                        self.handle_key(key.code)?;
                    }
                }
            }

            // Update every tick
            if last_tick.elapsed() >= tick_rate {
                last_tick = std::time::Instant::now();
            }
        }

        Ok(())
    }

    fn draw(&self, frame: &mut Frame) {
        let area = frame.size();

        // Calculate layout
        let constraints = if self.sidebar_visible {
            vec![
                Constraint::Length(3), // Tab bar
                Constraint::Min(10),   // Main content
                Constraint::Length(1), // Status line
            ]
        } else {
            vec![
                Constraint::Length(3), // Tab bar
                Constraint::Min(10),   // Main content
                Constraint::Length(1), // Status line
            ]
        };

        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints(constraints)
            .split(area);

        // Draw tab bar
        self.draw_tab_bar(frame, chunks[0]);

        // Draw main content area
        if self.sidebar_visible {
            let main_chunks = Layout::default()
                .direction(Direction::Horizontal)
                .constraints([
                    Constraint::Percentage(75), // Terminal
                    Constraint::Percentage(25), // Sidebar
                ])
                .split(chunks[1]);

            self.draw_terminal(frame, main_chunks[0]);
            self.draw_sidebar(frame, main_chunks[1]);
        } else {
            self.draw_terminal(frame, chunks[1]);
        }

        // Draw status line
        self.draw_status_line(frame, chunks[2]);

        // Draw help overlay if needed
        if self.show_help {
            self.draw_help_overlay(frame);
        }
    }

    fn draw_tab_bar(&self, frame: &mut Frame, area: Rect) {
        let tabs = self.tab_manager.tabs();

        let mut spans = vec![Span::styled(
            format!(" AgentMux [{}] ", self.project_name),
            Style::default()
                .bg(Color::Blue)
                .fg(Color::White)
                .add_modifier(Modifier::BOLD),
        )];

        for tab in tabs {
            let is_active = tab.is_active;
            let has_unread = tab.unread_count > 0;

            let display_name = if has_unread {
                format!("{} [{}]", tab.name, tab.unread_count)
            } else {
                tab.name.clone()
            };

            let style = if is_active {
                Style::default()
                    .bg(Color::Blue)
                    .fg(Color::White)
                    .add_modifier(Modifier::BOLD)
            } else if has_unread {
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(Color::Gray)
            };

            spans.push(Span::raw(" "));
            spans.push(Span::styled(format!("[{}]", display_name), style));
        }

        let line = Line::from(spans);
        let paragraph = Paragraph::new(line).block(Block::default().borders(Borders::BOTTOM));

        frame.render_widget(paragraph, area);
    }

    fn draw_terminal(&self, frame: &mut Frame, area: Rect) {
        let block = Block::default().borders(Borders::ALL).title(" Terminal ");

        if let Some(tab) = self.tab_manager.active_tab() {
            // Get terminal content
            let content = tab.surface.content();

            // Convert to text
            let lines: Vec<&str> = content.lines().collect();
            let text = Text::from(
                lines
                    .iter()
                    .map(|line| Line::from(*line))
                    .collect::<Vec<_>>(),
            );

            let paragraph = Paragraph::new(text).block(block).wrap(Wrap { trim: false });

            frame.render_widget(paragraph, area);
        } else {
            let text = Text::from("No active terminal");
            let paragraph = Paragraph::new(text).block(block);
            frame.render_widget(paragraph, area);
        }
    }

    fn draw_sidebar(&self, frame: &mut Frame, area: Rect) {
        let block = Block::default()
            .borders(Borders::ALL)
            .title(" Shared Context ");

        // Placeholder content
        let text = Text::from(vec![
            Line::from("Shared files:"),
            Line::from("• plan.md"),
            Line::from("• mentions.md"),
            Line::from("• progress.md"),
            Line::from(""),
            Line::from("Messages:"),
            Line::from("• @minimax: implement auth"),
            Line::from(""),
            Line::from("Conflicts:"),
            Line::from("• None"),
        ]);

        let paragraph = Paragraph::new(text).block(block).wrap(Wrap { trim: true });

        frame.render_widget(paragraph, area);
    }

    fn draw_status_line(&self, frame: &mut Frame, area: Rect) {
        let status = if let Some(tab) = self.tab_manager.active_tab() {
            format!(
                " {} | Cmd+1/2/3: switch tabs | Cmd+H: help | Cmd+Q: quit ",
                tab.name
            )
        } else {
            " AgentMux | Cmd+H: help | Cmd+Q: quit ".to_string()
        };

        let paragraph =
            Paragraph::new(status).style(Style::default().bg(Color::Blue).fg(Color::White));

        frame.render_widget(paragraph, area);
    }

    fn draw_help_overlay(&self, frame: &mut Frame) {
        let area = centered_rect(60, 70, frame.size());

        frame.render_widget(Clear, area);

        let text = Text::from(vec![
            Line::from(vec![Span::styled(
                "Keyboard Shortcuts",
                Style::default().add_modifier(Modifier::BOLD),
            )]),
            Line::from(""),
            Line::from("Cmd+1/2/3     Switch to tab 1/2/3"),
            Line::from("Cmd+N         Next tab"),
            Line::from("Cmd+P         Previous tab"),
            Line::from("Cmd+B         Toggle sidebar"),
            Line::from("Cmd+H         Toggle help"),
            Line::from("Cmd+Q         Quit"),
            Line::from(""),
            Line::from("Within terminal:"),
            Line::from("Type normally to interact with agent"),
            Line::from(""),
            Line::from("Cross-agent commands:"),
            Line::from("agentmux send <agent> \"message\""),
            Line::from("agentmux switch <agent>"),
            Line::from(""),
            Line::from(vec![Span::styled(
                "Press Cmd+H to close",
                Style::default().fg(Color::Gray),
            )]),
        ]);

        let help = Paragraph::new(text)
            .block(
                Block::default()
                    .title(" Help ")
                    .borders(Borders::ALL)
                    .border_style(Style::default().fg(Color::Yellow)),
            )
            .wrap(Wrap { trim: true });

        frame.render_widget(help, area);
    }

    fn handle_key(&mut self, key: KeyCode) -> Result<()> {
        match key {
            // Cmd+Q to quit
            KeyCode::Char('q') => {
                // Check if Cmd is pressed (we'll need to track modifiers)
                self.should_quit = true;
            }
            // Cmd+H for help
            KeyCode::Char('h') => {
                self.show_help = !self.show_help;
            }
            // Cmd+B for sidebar
            KeyCode::Char('b') => {
                self.sidebar_visible = !self.sidebar_visible;
            }
            // Number keys for tabs (Cmd+1, Cmd+2, etc.)
            KeyCode::Char('1') => {
                let id = self.tab_manager.tab_order().get(0).cloned();
                if let Some(id) = id {
                    self.tab_manager.switch_to_tab(&id)?;
                }
            }
            KeyCode::Char('2') => {
                let id = self.tab_manager.tab_order().get(1).cloned();
                if let Some(id) = id {
                    self.tab_manager.switch_to_tab(&id)?;
                }
            }
            KeyCode::Char('3') => {
                let id = self.tab_manager.tab_order().get(2).cloned();
                if let Some(id) = id {
                    self.tab_manager.switch_to_tab(&id)?;
                }
            }
            _ => {}
        }
        Ok(())
    }

    /// Send text to a specific agent
    pub fn send_to_agent(&mut self, agent_id: &str, text: &str) -> Result<()> {
        self.tab_manager.send_to_tab(agent_id, text)
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
