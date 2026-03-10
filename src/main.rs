use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

mod agents;
mod app;
mod context;
mod ghostty;
mod ipc;
mod jj;
mod skills;
mod tabs;
mod terminal;
mod watcher;

use app::App;

#[derive(Parser)]
#[command(name = "agentmux")]
#[command(about = "🌊 Minimal terminal multiplexer for AI agent collaboration")]
#[command(version = "0.2.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new AgentMux project
    Init {
        /// Project name
        #[arg(default_value = "default")]
        name: String,
    },
    /// Configure AgentMux settings
    Config,
    /// Start AgentMux with all agents
    Start,
    /// Send a message to an agent
    Send {
        /// Agent name
        agent: String,
        /// Message to send
        message: String,
    },
    /// Switch to an agent tab
    Switch {
        /// Agent name
        agent: String,
    },
    /// JJ commands
    Jj {
        #[command(subcommand)]
        action: JjCommands,
    },
    /// Manage skills
    Skills {
        #[command(subcommand)]
        action: SkillCommands,
    },
}

#[derive(Subcommand)]
enum JjCommands {
    /// Show JJ status
    Status,
    /// List changes
    Log,
    /// Create new change for agent
    New {
        agent: String,
    },
}

#[derive(Subcommand)]
enum SkillCommands {
    /// List available skills
    List,
    /// Install default skills
    Install,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Init { name } => {
            init_project(name).await?;
        }
        Commands::Config => {
            show_config().await?;
        }
        Commands::Start => {
            start_agentmux().await?;
        }
        Commands::Send { agent, message } => {
            send_to_agent(agent, message).await?;
        }
        Commands::Switch { agent } => {
            switch_to_agent(agent).await?;
        }
        Commands::Jj { action } => {
            match action {
                JjCommands::Status => jj_status().await?,
                JjCommands::Log => jj_log().await?,
                JjCommands::New { agent } => jj_new(agent).await?,
            }
        }
        Commands::Skills { action } => {
            match action {
                SkillCommands::List => {
                    list_skills().await?;
                }
                SkillCommands::Install => {
                    install_skills().await?;
                }
            }
        }
    }
    
    Ok(())
}

async fn init_project(name: String) -> Result<()> {
    let agentmux_dir = dirs::home_dir()
        .expect("Could not find home directory")
        .join(".agentmux");
    
    let shared_dir = agentmux_dir.join("shared").join(&name);
    let skills_dir = agentmux_dir.join("skills");
    let config_file = agentmux_dir.join("config.toml");
    let project_dir = agentmux_dir.join("projects").join(&name);
    
    println!("🌊 Initializing AgentMux v2 project: {}", name);
    
    // Create directories
    std::fs::create_dir_all(&agentmux_dir)?;
    std::fs::create_dir_all(&shared_dir)?;
    std::fs::create_dir_all(&skills_dir)?;
    std::fs::create_dir_all(&project_dir)?;
    
    // Initialize JJ repo (optional - only if jj is installed)
    let repo_dir = project_dir.join("repo");
    std::fs::create_dir_all(&repo_dir)?;
    
    // Try to run jj init, but don't fail if jj is not installed
    match std::process::Command::new("jj")
        .args(&["init", "--git-repo", "."])
        .current_dir(&repo_dir)
        .output()
    {
        Ok(_) => println!("  ✓ JJ repository initialized"),
        Err(_) => println!("  ⚠️  JJ not found. Install with: cargo install jj-cli"),
    }
    
    // Create default config
    let config = format!(r#"version = "0.2.0"

[project]
name = "{}"
working_dir = "{}"
repo_dir = "{}"

[[agents]]
id = "kimi"
name = "Kimi Planner"
type = "opencode"
provider = "kimi"
model = "kimi-k2.5"
command = "opencode"
args = ["run", "--provider", "kimi", "--model", "kimi-k2.5", "-c"]
enabled = true

[[agents]]
id = "minimax"
name = "MiniMax Coder"
type = "opencode"
provider = "minimax"
model = "MiniMax-M2.5"
command = "opencode"
args = ["run", "--provider", "minimax", "--model", "MiniMax-M2.5", "-c"]
enabled = true

[[agents]]
id = "claude"
name = "Claude Reviewer"
type = "claude"
command = "claude"
args = ["--dangerously-skip-permissions", "-c"]
enabled = true

[shared]
auto_sync = true
notify_on_change = true
"#, name, std::env::current_dir()?.display(), repo_dir.display());
    
    std::fs::write(&config_file, config)?;
    
    // Create shared context files
    std::fs::write(shared_dir.join("README.md"), format!("# {}\n\nAgentMux shared context for {}.\n", name, name))?;
    std::fs::write(shared_dir.join("plan.md"), "# Plan\n\n*No plan yet*\n")?;
    std::fs::write(shared_dir.join("progress.md"), "# Progress\n\n*No progress yet*\n")?;
    std::fs::write(shared_dir.join("mentions.md"), "# Mentions\n\n*No mentions yet*\n")?;
    
    println!("✅ Project initialized with JJ!");
    println!();
    println!("Next steps:");
    println!("  1. Configure API keys: agentmux config");
    println!("  2. Start AgentMux: agentmux start");
    
    Ok(())
}

async fn show_config() -> Result<()> {
    println!("🔧 AgentMux Configuration");
    println!();
    
    let agentmux_dir = dirs::home_dir()
        .expect("Could not find home directory")
        .join(".agentmux");
    
    println!("Config directory: {}", agentmux_dir.display());
    println!("Shared context: {}", agentmux_dir.join("shared").display());
    
    // Check for JJ
    match which::which("jj") {
        Ok(path) => println!("✅ Jujutsu: {}", path.display()),
        Err(_) => {
            println!("❌ Jujutsu not found. Install with:");
            println!("   cargo install jj-cli");
        }
    }
    
    // Check for opencode
    match which::which("opencode") {
        Ok(path) => println!("✅ OpenCode: {}", path.display()),
        Err(_) => {
            println!("❌ OpenCode not found. Install with:");
            println!("   curl -fsSL https://opencode.ai/install | bash");
        }
    }
    
    // Check for claude
    match which::which("claude") {
        Ok(path) => println!("✅ Claude Code: {}", path.display()),
        Err(_) => {
            println!("❌ Claude Code not found. Install with:");
        println!("   npm install -g @anthropic-ai/claude-code");
        }
    }
    
    Ok(())
}

async fn start_agentmux() -> Result<()> {
    let config_file = dirs::home_dir()
        .expect("Could not find home directory")
        .join(".agentmux")
        .join("config.toml");

    if !config_file.exists() {
        eprintln!("❌ No AgentMux project found. Run: agentmux init");
        std::process::exit(1);
    }

    // Load config
    let config_str = std::fs::read_to_string(&config_file)?;
    let config: crate::agents::Config = toml::from_str(&config_str)?;

    println!("🌊 Starting AgentMux v2: {}", config.project.name);

    // Check if agents are available
    let opencode_available = which::which("opencode").is_ok();
    let claude_available = which::which("claude").is_ok();

    if !opencode_available && !claude_available {
        println!("  ⚠️  No AI agents found (opencode or claude)");
        println!("  🧪 Starting in DEMO mode with bash shells...");
        println!("  (Install opencode: curl -fsSL https://opencode.ai/install | bash)");
    }

    // Start IPC server in background
    let ipc_server = ipc::server::Server::new();
    tokio::spawn(async move {
        if let Err(e) = ipc_server.run().await {
            eprintln!("IPC server error: {}", e);
        }
    });

    // Create app
    let repo_dir = PathBuf::from(&config.project.repo_dir);
    let mut app = App::new(config.project.name.clone(), repo_dir)?;

    // Add agents (with fallback to demo mode)
    let mut agents_started = 0;
    for agent in &config.agents {
        if agent.enabled {
            // Check if command is available
            let cmd_available = which::which(&agent.command).is_ok();

            let (cmd, args) = if cmd_available {
                println!("  → Starting {}...", agent.name);
                (agent.command.clone(), agent.args.clone())
            } else {
                println!("  → Starting {} (demo mode with bash)...", agent.name);
                ("bash".to_string(), vec![])
            };

            match app.add_agent(
                agent.id.clone(),
                agent.name.clone(),
                agent.agent_type.clone(),
                cmd,
                args,
            ) {
                Ok(()) => agents_started += 1,
                Err(e) => {
                    eprintln!("  ❌ Failed to start {}: {}", agent.name, e);
                }
            }
        }
    }

    if agents_started == 0 {
        eprintln!("❌ No agents could be started. Exiting.");
        std::process::exit(1);
    }

    println!("  ✅ Started {} agent(s)", agents_started);
    println!("  💡 Press Cmd+H for help, Cmd+Q to quit\n");

    // Run the app
    app.run()?;

    Ok(())
}

async fn send_to_agent(agent: String, message: String) -> Result<()> {
    // Send message via IPC socket
    ipc::client::send_message(&agent, &message).await
}

async fn switch_to_agent(agent: String) -> Result<()> {
    // Switch to agent via IPC socket
    ipc::client::switch_tab(&agent).await
}

async fn jj_status() -> Result<()> {
    let output = std::process::Command::new("jj")
        .args(&["status"])
        .output()?;
    
    println!("{}", String::from_utf8_lossy(&output.stdout));
    Ok(())
}

async fn jj_log() -> Result<()> {
    let output = std::process::Command::new("jj")
        .args(&["log"])
        .output()?;
    
    println!("{}", String::from_utf8_lossy(&output.stdout));
    Ok(())
}

async fn jj_new(agent: String) -> Result<()> {
    let output = std::process::Command::new("jj")
        .args(&["new", "-m", &format!("@{} workspace", agent)])
        .output()?;
    
    println!("{}", String::from_utf8_lossy(&output.stdout));
    Ok(())
}

async fn list_skills() -> Result<()> {
    println!("📦 Available Skills:");
    println!("  - shared-context-writer: Write to shared context");
    println!("  - jj-workflow: Jujutsu workflow for agents");
    println!("  - agent-coordinator: Coordinate between agents");
    println!("  - progress-tracker: Track work progress");
    Ok(())
}

async fn install_skills() -> Result<()> {
    println!("📦 Installing default skills...");
    
    let skills_dir = dirs::home_dir()
        .expect("Could not find home directory")
        .join(".agentmux")
        .join("skills");
    
    std::fs::create_dir_all(&skills_dir)?;
    
    // Install shared-context-writer skill
    let scw_dir = skills_dir.join("shared-context-writer");
    std::fs::create_dir_all(&scw_dir)?;
    
    std::fs::write(
        scw_dir.join("skill.toml"),
        r#"name = "shared-context-writer"
version = "1.0.0"
description = "Write updates to shared context for other agents to see"
"#,
    )?;
    
    std::fs::write(
        scw_dir.join("prompt.md"),
        include_str!("../skills/shared-context-writer/prompt.md"),
    )?;
    
    // Install jj-workflow skill
    let jj_dir = skills_dir.join("jj-workflow");
    std::fs::create_dir_all(&jj_dir)?;
    
    std::fs::write(
        jj_dir.join("skill.toml"),
        r#"name = "jj-workflow"
version = "1.0.0"
description = "Jujutsu workflow for multi-agent collaboration"
"#,
    )?;
    
    std::fs::write(
        jj_dir.join("prompt.md"),
        include_str!("../skills/jj-workflow/prompt.md"),
    )?;
    
    println!("✅ Skills installed to: {}", skills_dir.display());
    Ok(())
}