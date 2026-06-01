import { Anthropic } from 'anthropic';
import * as fs from 'fs';
import logger from './logger';

if (!process.env.CLAUDE_API_KEY) {
  throw new Error('CLAUDE_API_KEY environment variable is not set');
}

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

export interface VideoFrame {
  timestamp: number;
  action: string;
  element?: string;
  expectedResult: string;
}

export interface VideoAnalysisResult {
  frames: VideoFrame[];
  summary: string;
  suggestedSteps: string[];
}

/**
 * Analyze video frames using Claude Vision API.
 * Extracts key moments and generates test step descriptions.
 */
export async function analyzeVideoWithVision(
  base64VideoChunk: string,
  mimeType: 'video/mp4' | 'video/quicktime' | 'video/webm'
): Promise<VideoAnalysisResult> {
  try {
    const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

    const message = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64VideoChunk,
              },
            },
            {
              type: 'text',
              text: `Analyze this video/screenshot and extract test steps. For each distinct action visible:
1. Describe what action the user is performing
2. Identify what UI elements are being interacted with
3. Describe the expected result or outcome

Return JSON format:
{
  "steps": [
    {"timestamp": 0, "action": "...", "element": "...", "expectedResult": "..."},
    ...
  ],
  "summary": "...",
  "framework_suggestions": ["cucumber", "cypress", "jest"]
}`,
            },
          ],
        },
      ],
    });

    if (!message.content || !message.content[0] || message.content[0].type !== 'text') {
      throw new Error('Invalid response structure from Claude Vision API');
    }

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude Vision API');
    }

    // Parse JSON from the response with robust error handling
    let analysisData: any;
    try {
      // Try to find a JSON object in the response
      const startIdx = content.text.indexOf('{');
      if (startIdx === -1) {
        throw new Error('No JSON object found in Claude response');
      }

      // Extract the substring starting from the first '{'
      const jsonStr = content.text.substring(startIdx);

      // Try to parse from the end backwards to find valid JSON
      let parsed: any = null;
      for (let i = jsonStr.length - 1; i >= 1; i--) {
        try {
          parsed = JSON.parse(jsonStr.substring(0, i));
          analysisData = parsed;
          break;
        } catch (e) {
          // Continue trying previous positions
        }
      }

      if (!analysisData) {
        throw new Error('Could not parse JSON from Claude response');
      }
    } catch (parseError) {
      throw new Error(
        `Failed to parse Claude response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }

    logger.info('Video analysis completed', {
      stepsCount: analysisData.steps.length,
      frameworks: analysisData.framework_suggestions,
    });

    return {
      frames: analysisData.steps,
      summary: analysisData.summary,
      suggestedSteps: analysisData.framework_suggestions,
    };
  } catch (error) {
    logger.error('Failed to analyze video with Claude Vision', error);
    throw error;
  }
}
