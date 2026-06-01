// backend/src/services/SkillRouterService.ts
import { SkillRouter } from '@core/skill-router/SkillRouter';
import { generateTestCases } from '../utils/claude';
import { prisma } from '../utils/db';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class SkillRouterService {
  private skillRouter: SkillRouter;

  constructor() {
    this.skillRouter = new SkillRouter();
  }

  async generateTestCase(data: {
    clientId: string;
    framework: string;
    designPattern: string;
    requirements: string;
    acceptanceCriteria?: string[];
  }) {
    try {
      // Find the appropriate skill
      const skill = this.skillRouter.findSkill(data.framework, data.designPattern);

      if (!skill) {
        throw new Error(
          `No skill found for framework: ${data.framework}, pattern: ${data.designPattern}`
        );
      }

      // Get the prompt template
      let promptTemplate: string;
      try {
        const templatePath = path.resolve(skill.template);
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Prompt template not found at: ${templatePath}`);
        }
        promptTemplate = fs.readFileSync(templatePath, 'utf-8');
      } catch (error) {
        throw new Error(`Failed to load prompt template for skill: ${skill.template}`);
      }

      // Format the prompt with acceptance criteria if available
      let fullPrompt = promptTemplate;
      if (data.acceptanceCriteria && data.acceptanceCriteria.length > 0) {
        fullPrompt += `\n\nAcceptance Criteria:\n${data.acceptanceCriteria.map((ac) => `- ${ac}`).join('\n')}`;
      }

      // Generate test cases via Claude
      const result = await generateTestCases(fullPrompt, data.requirements);

      // Log the skill usage
      await prisma.generationLog.create({
        data: {
          clientId: data.clientId,
          framework: data.framework,
          designPattern: data.designPattern,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          promptUsed: skill.template,
          success: true,
        },
      });

      return {
        content: result.content,
        framework: data.framework,
        designPattern: data.designPattern,
        skillUsed: skill.template,
      };
    } catch (error) {
      logger.error('Failed to generate test case via skill router', error);

      // Log the failure
      if (data.clientId) {
        await prisma.generationLog.create({
          data: {
            clientId: data.clientId,
            framework: data.framework,
            designPattern: data.designPattern,
            inputTokens: 0,
            outputTokens: 0,
            promptUsed: `${data.framework}-${data.designPattern}`,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }

      throw error;
    }
  }

  listAvailableSkills() {
    return this.skillRouter.listSkills();
  }

  listSkillsForFramework(framework: string) {
    return this.skillRouter.listSkillsForFramework(framework);
  }
}
