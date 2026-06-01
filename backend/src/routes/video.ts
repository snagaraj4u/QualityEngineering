import { Router, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import multer from 'multer';
import { VideoAnalysisService } from '../services/VideoAnalysisService';
import { prisma } from '../utils/db';
import logger from '../utils/logger';

const router = Router();
const videoService = new VideoAnalysisService();

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

/**
 * POST /api/video/upload
 * Upload and analyze a test video
 */
router.post('/upload', upload.single('video'), async (req: Request, res: Response, next: NextFunction) => {
  const { clientId, suggestedFramework } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  const tempPath = `/tmp/video-${Date.now()}.mp4`;
  let analysisResult;

  try {
    // Save file temporarily
    const writeStream = fs.createWriteStream(tempPath);
    writeStream.write(req.file.buffer);
    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Analyze video
    analysisResult = await videoService.analyzeVideo(tempPath);

    // Save results
    const saved = await videoService.saveAnalysisResults(
      clientId,
      req.file.originalname,
      analysisResult,
      suggestedFramework || 'cucumber'
    );

    res.status(200).json({
      analysisId: saved.id,
      steps: analysisResult.steps,
      duration: analysisResult.duration,
      framesAnalyzed: analysisResult.framesAnalyzed,
      confidence: analysisResult.confidence,
    });
  } catch (error) {
    logger.error('Video upload/analysis failed', error);
    next(error);
  } finally {
    // Always clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
});

/**
 * GET /api/video/:analysisId
 * Retrieve previous video analysis
 */
router.get('/:analysisId', async (req: Request, res: Response, next: NextFunction) => {
  const { analysisId } = req.params;

  try {
    const analysis = await prisma.videoAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.status(200).json({
      id: analysis.id,
      steps: JSON.parse(analysis.extractedSteps),
      confidence: analysis.confidence,
      suggestedFramework: analysis.suggestedFramework,
    });
  } catch (error) {
    logger.error('Failed to retrieve video analysis', error);
    next(error);
  }
});

export default router;
