import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { analyzeVideoWithVision } from '../utils/vision';
import { prisma } from '../utils/db';

const SUPPORTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export interface VideoFrame {
  timestamp: number;
  action: string;
  element?: string;
  expectedResult: string;
}

export interface AnalysisStep {
  action: string;
  element?: string;
  expectedResult: string;
}

export interface VideoAnalysisResult {
  steps: AnalysisStep[];
  duration: number;
  framesAnalyzed: number;
  confidence: number;
}

export class VideoAnalysisService {
  /**
   * Validate video file before processing
   */
  async validateVideo(filePath: string): Promise<boolean> {
    try {
      // Check file exists
      if (!fs.existsSync(filePath)) {
        logger.warn('Video file not found', { filePath });
        return false;
      }

      // Check file size
      const stats = fs.statSync(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        logger.warn('Video file exceeds maximum size', {
          filePath,
          size: stats.size,
          maxSize: MAX_FILE_SIZE,
        });
        return false;
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      const validExtensions = ['.mp4', '.mov', '.webm'];
      if (!validExtensions.includes(ext)) {
        logger.warn('Unsupported video format', { filePath, ext });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error validating video', error);
      return false;
    }
  }

  /**
   * Analyze video file to extract test steps
   */
  async analyzeVideo(filePath: string): Promise<VideoAnalysisResult> {
    try {
      // Validate first
      const isValid = await this.validateVideo(filePath);
      if (!isValid) {
        throw new Error('Video file validation failed');
      }

      // Read video file
      const videoBuffer = fs.readFileSync(filePath);
      const base64Video = videoBuffer.toString('base64');

      // Determine MIME type
      const ext = path.extname(filePath).toLowerCase();
      let mimeType: 'video/mp4' | 'video/quicktime' | 'video/webm' = 'video/mp4';
      if (ext === '.mov') {
        mimeType = 'video/quicktime';
      } else if (ext === '.webm') {
        mimeType = 'video/webm';
      }

      // Send to Claude Vision
      const analysisResult = await analyzeVideoWithVision(base64Video, mimeType);

      // Convert to our format
      const steps: AnalysisStep[] = analysisResult.frames.map((frame: VideoFrame) => ({
        action: frame.action,
        element: frame.element,
        expectedResult: frame.expectedResult,
      }));

      // Get file metadata for duration estimate
      const stats = fs.statSync(filePath);
      const estimatedDuration = Math.ceil(stats.size / (1024 * 1024 * 3)); // Rough estimate

      return {
        steps,
        duration: estimatedDuration,
        framesAnalyzed: steps.length,
        confidence: 0.85, // Default confidence based on Claude's analysis
      };
    } catch (error) {
      logger.error('Failed to analyze video', error);
      throw error;
    }
  }

  /**
   * Save video analysis results to database
   */
  async saveAnalysisResults(
    clientId: string,
    videoPath: string,
    analysisResult: VideoAnalysisResult,
    suggestedFramework: string
  ) {
    try {
      // Store analysis in database for reference
      const analysis = await prisma.videoAnalysis.create({
        data: {
          clientId,
          videoPath,
          stepsExtracted: analysisResult.steps.length,
          confidence: analysisResult.confidence,
          suggestedFramework,
          extractedSteps: JSON.stringify(analysisResult.steps),
        },
      });

      logger.info('Video analysis saved', { analysisId: analysis.id });
      return analysis;
    } catch (error) {
      logger.error('Failed to save video analysis', error);
      throw error;
    }
  }
}
