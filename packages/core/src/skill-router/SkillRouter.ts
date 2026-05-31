// packages/core/src/skill-router/SkillRouter.ts
import skillRegistry from './skill-registry.json';
import * as fs from 'fs';
import * as path from 'path';

export interface SkillMapping {
  framework: string;
  pattern: string;
  description: string;
  template: string;
}

export class SkillRouter {
  private registry: Map<string, SkillMapping> = new Map();

  constructor() {
    this.loadRegistry();
  }

  private loadRegistry() {
    for (const [skillId, skill] of Object.entries(skillRegistry)) {
      this.registry.set(skillId, skill as SkillMapping);
    }
  }

  findSkill(framework: string, pattern: string): SkillMapping | undefined {
    for (const skill of this.registry.values()) {
      if (skill.framework === framework && skill.pattern === pattern) {
        return skill;
      }
    }
    return undefined;
  }

  getPromptTemplate(skillId: string): string | undefined {
    const skill = this.registry.get(skillId);
    if (!skill) return undefined;

    try {
      const templatePath = path.resolve(skill.template);
      return fs.readFileSync(templatePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to load prompt template for ${skillId}:`, error);
      return undefined;
    }
  }

  listSkills(): SkillMapping[] {
    return Array.from(this.registry.values());
  }

  listSkillsForFramework(framework: string): SkillMapping[] {
    return Array.from(this.registry.values()).filter((skill) => skill.framework === framework);
  }
}
