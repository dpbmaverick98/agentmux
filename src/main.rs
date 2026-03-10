use anyhow::Result;
use clap::{Parser, Subcommand};


mod agents;
mod context;
mod skills;
mod terminal;
mod ui;

use ui::App;

#[derive(Parser)]
#[command(name = "agentmux")]
#[command(about = "🌊 Minimal terminal multiplexer for AI agent collaboration")]
#[command(version = "0.1.0")]
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
    /// Manage skills
    Skills {
        #[command(subcommand)]
        action: SkillCommands,
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
    
    println!("🌊 Initializing AgentMux project: {}", name);
    
    // Create directories
    std::fs::create_dir_all(&agentmux_dir)?;
    std::fs::create_dir_all(&shared_dir)?;
    std::fs::create_dir_all(&skills_dir)?;
    
    // Create default config
    let config = format!(r#"version = "0.1.0"

[project]
name = "{}"
working_dir = "{}"

[[agents]]
name = "kimi-planner"
type = "opencode"
provider = "kimi"
model = "kimi-k2.5"
enabled = true

[[agents]]
name = "minimax-coder"
type = "opencode"
provider = "minimax"
model = "MiniMax-M2.5"
enabled = true

[[agents]]
name = "opus-reviewer"
type = "claude"
model = "claude-opus"
enabled = true

[shared]
auto_sync = true
notify_on_change = true
"#, name, std::env::current_dir()?.display());
    
    std::fs::write(&config_file, config)?;
    
    // Create shared context files
    std::fs::write(shared_dir.join("README.md"), format!("# {}\n\nAgentMux shared context for {}.\n", name, name))?;
    std::fs::write(shared_dir.join("plan.md"), "# Plan\n\n*No plan yet*\n")?;
    std::fs::write(shared_dir.join("progress.md"), "# Progress\n\n*No progress yet*\n")?;
    std::fs::write(shared_dir.join("mentions.md"), "# Mentions\n\n*No mentions yet*\n")?;
    
    println!("✅ Project initialized!");
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
    
    println!("🌊 Starting AgentMux: {}", config.project.name);
    
    // Start UI
    let mut app = App::new(config).await?;
    app.run().await?;
    
    Ok(())
}

async fn list_skills() -> Result<()> {
    println!("📦 Available Skills:");
    println!("  - shared-context-writer: Write to shared context");
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
    
    println!("✅ Skills installed to: {}", skills_dir.display());
    Ok(())
}