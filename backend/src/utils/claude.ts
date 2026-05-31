// backend/src/utils/claude.ts
import { Anthropic } from 'anthropic';
import logger from './logger';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export async function generateTestCases(
  prompt: string,
  requirements: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nRequirements:\n${requirements}`,
        },
      ],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

    logger.info('Test cases generated via Claude', {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    return {
      content,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  } catch (error) {
    logger.error('Failed to generate test cases via Claude', error);
    throw error;
  }
}
