use anyhow::Result;
use std::path::PathBuf;

pub struct Skill {
    pub name: String,
    pub version: String,
    pub description: String,
    pub prompt: String,
}

pub struct SkillManager {
    skills_dir: PathBuf,
}

impl SkillManager {
    pub fn new() -> Self {
        let skills_dir = dirs::home_dir()
            .expect("Could not find home directory")
            .join(".agentmux")
            .join("skills");
        
        Self { skills_dir }
    }
    
    pub fn load_skill(&self, name: &str) -> Result<Skill> {
        let skill_dir = self.skills_dir.join(name);
        let prompt_path = skill_dir.join("prompt.md");
        
        let prompt = std::fs::read_to_string(prompt_path)?;
        
        Ok(Skill {
            name: name.to_string(),
            version: "1.0.0".to_string(),
            description: "Skill description".to_string(),
            prompt,
        })
    }
    
    pub fn get_prompt_for_agent(&self,
        agent_name: &str,
        project_name: &str,
    ) -> Result<String> {
        let mut prompt = String::new();
        
        // Add header
        prompt.push_str("╔══════════════════════════════════════════════════════════════╗\n");
        prompt.push_str("║  🌊 AgentMux - Multi-Agent Environment                       ║\n");
        prompt.push_str("╚══════════════════════════════════════════════════════════════╝\n\n");
        
        prompt.push_str(&format!("You are \"{}\" in a multi-agent team.\n\n", agent_name));
        
        // Try to load shared-context-writer skill
        if let Ok(skill) = self.load_skill("shared-context-writer") {
            prompt.push_str(&skill.prompt);
            prompt.push_str("\n\n");
        }
        
        prompt.push_str(&format!(
            "## Shared Context Location\n~/.agentmux/shared/{}/\n\n",
            project_name
        ));
        
        prompt.push_str("Start collaborating! 🚀\n\n");
        
        Ok(prompt)
    }
}