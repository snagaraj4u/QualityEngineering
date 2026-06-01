// backend/src/utils/claude.ts
import Anthropic from '@anthropic-ai/sdk';
import logger from './logger';

// Lazily construct the client so importing this module has no side effects.
// The API key is only required when a generation is actually attempted, which
// keeps suites that merely import the app (without calling Claude) runnable
// without a key configured.
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY environment variable is not set');
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  return client;
}

export async function generateTestCases(
  prompt: string,
  requirements: string
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  try {
    const message = await getClient().messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nRequirements:\n${requirements}`,
        },
      ],
    });

    if (!message.content || !message.content[0]) {
      throw new Error('Invalid response structure from Claude API');
    }
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
