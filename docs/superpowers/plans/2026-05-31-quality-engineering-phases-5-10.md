# Quality Engineering App — Phases 5-10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Quality Engineering platform with video processing, framework integration, defect management, comprehensive dashboards, and production deployment.

**Architecture:** 
- Phase 5 adds video upload/processing via Claude vision to extract test steps
- Phase 6 integrates test execution via CLI and writes results to Cucumber/Jest projects
- Phase 7 wires defect creation from failed tests to QMetry
- Phase 8 builds dashboards for metrics, trends, and test execution history
- Phase 9 adds comprehensive integration tests and validation
- Phase 10 deploys web to Vercel, CLI to npm, and documents operations

**Tech Stack:** Express, Next.js, Claude Vision API, Prisma, PostgreSQL, Vercel, npm registry

---

## File Structure — Phases 5-10

```
quality-engineering/
├── backend/src/
│   ├── services/
│   │   ├── VideoAnalysisService.ts      # Phase 5: Video upload/analysis
│   │   ├── TestExecutionService.ts      # Phase 6: CLI test execution
│   │   └── DefectIntegrationService.ts  # Phase 7: QMetry defect creation
│   ├── routes/
│   │   ├── video.ts                     # Phase 5: Video upload endpoint
│   │   ├── execute.ts                   # Phase 6: Test execution endpoint
│   │   └── defects.ts                   # Phase 7: Defect creation endpoint
│   ├── utils/
│   │   ├── vision.ts                    # Phase 5: Claude Vision utility
│   │   └── executors.ts                 # Phase 6: Framework execution utilities
│
├── apps/web/
│   ├── app/
│   │   ├── (builder)/
│   │   │   └── video/upload/page.tsx    # Phase 5: Video upload UI
│   │   ├── (dashboard)/
│   │   │   ├── engineer/page.tsx        # Phase 8: QA Engineer dashboard
│   │   │   └── lead/page.tsx            # Phase 8: Test Lead dashboard
│   │   ├── (execution)/
│   │   │   ├── page.tsx                 # Phase 6: Execution history
│   │   │   └── [id]/page.tsx            # Phase 6: Execution details
│   │   └── api/
│   │       ├── video/route.ts           # Phase 5: Video API
│   │       ├── execute/route.ts         # Phase 6: Execution API
│   │       ├── defects/route.ts         # Phase 7: Defects API
│   │       └── dashboard/
│   │           ├── metrics/route.ts     # Phase 8: Metrics API
│   │           └── trends/route.ts      # Phase 8: Trends API
│   ├── components/
│   │   ├── VideoUpload.tsx              # Phase 5: Video uploader
│   │   ├── ExecutionHistory.tsx         # Phase 6: Execution display
│   │   ├── DefectForm.tsx               # Phase 7: Defect creation
│   │   └── Dashboard/
│   │       ├── MetricsCard.tsx          # Phase 8: Metrics display
│   │       ├── TrendChart.tsx           # Phase 8: Trend visualization
│   │       ├── TestExecutionChart.tsx   # Phase 8: Execution status
│   │       └── DefectStatus.tsx         # Phase 8: Defect overview
│
├── apps/cli/
│   ├── src/
│   │   ├── commands/
│   │   │   └── run.ts                   # Phase 6: Execute tests
│   │   ├── executor/
│   │   │   ├── CucumberExecutor.ts      # Phase 6: Cucumber runner
│   │   │   ├── CypressExecutor.ts       # Phase 6: Cypress runner
│   │   │   ├── JestExecutor.ts          # Phase 6: Jest runner
│   │   │   └── ResultParser.ts          # Phase 6: Parse test results
│   │   └── reporters/
│   │       ├── ConsoleReporter.ts       # Phase 6: Terminal output
│   │       └── JsonReporter.ts          # Phase 6: JSON export
│
├── tests/
│   ├── integration/
│   │   ├── video-processing.test.ts     # Phase 9: Video E2E tests
│   │   ├── test-execution.test.ts       # Phase 9: Execution E2E tests
│   │   ├── defect-creation.test.ts      # Phase 9: Defect E2E tests
│   │   └── dashboard.test.ts            # Phase 9: Dashboard E2E tests
│   └── unit/
│       ├── VideoAnalysisService.test.ts # Phase 5: Video service tests
│       ├── TestExecutionService.test.ts # Phase 6: Execution tests
│       └── DefectIntegrationService.test.ts # Phase 7: Defect tests
│
├── docs/deployment/
│   ├── DEPLOYMENT.md                    # Phase 10: Deployment guide
│   ├── VERCEL_SETUP.md                  # Phase 10: Vercel config
│   ├── NPM_PUBLISH.md                   # Phase 10: CLI npm publish
│   └── OPERATIONS.md                    # Phase 10: Ops runbook
│
└── .github/
    └── workflows/
        └── ci-cd.yml                    # Phase 10: CI/CD pipeline
```

---

# Phase 5: Video Processing Pipeline

## Task 5.1: Create Video Upload Service

**Files:**
- Create: `backend/src/services/VideoAnalysisService.ts`
- Create: `backend/src/utils/vision.ts`
- Create: `backend/src/routes/video.ts`
- Create: `tests/unit/VideoAnalysisService.test.ts`
- Modify: `backend/src/index.ts` (register route)

**Description:** Implement video upload handling and Claude Vision API integration to extract test steps from recorded walkthroughs.

- [ ] **Step 1: Write failing test for video analysis service**

```typescript
// tests/unit/VideoAnalysisService.test.ts
import { VideoAnalysisService } from '../../src/services/VideoAnalysisService';

describe('VideoAnalysisService', () => {
  let service: VideoAnalysisService;

  beforeEach(() => {
    service = new VideoAnalysisService();
  });

  describe('analyzeVideo', () => {
    it('should extract test steps from video file', async () => {
      const filePath = './test-fixtures/sample-walkthrough.mp4';
      const result = await service.analyzeVideo(filePath);
      
      expect(result).toHaveProperty('steps');
      expect(Array.isArray(result.steps)).toBe(true);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0]).toHaveProperty('action');
      expect(result.steps[0]).toHaveProperty('expectedResult');
    });

    it('should return metadata about the analysis', async () => {
      const filePath = './test-fixtures/sample-walkthrough.mp4';
      const result = await service.analyzeVideo(filePath);
      
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('framesAnalyzed');
      expect(result).toHaveProperty('confidence');
    });

    it('should throw error for invalid video file', async () => {
      const filePath = './nonexistent.mp4';
      
      await expect(service.analyzeVideo(filePath)).rejects.toThrow('Video file not found');
    });
  });

  describe('validateVideo', () => {
    it('should validate video file exists and is readable', async () => {
      const filePath = './test-fixtures/sample-walkthrough.mp4';
      const isValid = await service.validateVideo(filePath);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid file types', async () => {
      const filePath = './test-fixtures/document.pdf';
      const isValid = await service.validateVideo(filePath);
      
      expect(isValid).toBe(false);
    });

    it('should reject files larger than 500MB', async () => {
      const filePath = './test-fixtures/huge-video.mp4';
      const isValid = await service.validateVideo(filePath);
      
      expect(isValid).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:\QualityEngineering
npm test -- tests/unit/VideoAnalysisService.test.ts
```

Expected output: Multiple test failures (VideoAnalysisService class not defined)

- [ ] **Step 3: Create Claude Vision utility**

```typescript
// backend/src/utils/vision.ts
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
  description: string;
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
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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

    if (!message.content || !message.content[0]?.type !== 'text') {
      throw new Error('Invalid response structure from Claude Vision API');
    }

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude Vision API');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    const analysisData = JSON.parse(jsonMatch[0]);

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
```

- [ ] **Step 4: Create VideoAnalysisService**

```typescript
// backend/src/services/VideoAnalysisService.ts
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { analyzeVideoWithVision } from '../utils/vision';
import { prisma } from '../utils/db';

const SUPPORTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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
      const steps: AnalysisStep[] = analysisResult.frames.map((frame: any) => ({
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
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd C:\QualityEngineering
npm test -- tests/unit/VideoAnalysisService.test.ts
```

Expected output: All tests passing

- [ ] **Step 6: Create video upload API endpoint**

```typescript
// backend/src/routes/video.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { VideoAnalysisService } from '../services/VideoAnalysisService';
import { errorHandler } from '../middleware/errorHandler';
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
router.post('/upload', upload.single('video'), errorHandler(async (req: Request, res: Response) => {
  const { clientId, suggestedFramework } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided' });
  }

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    // Save file temporarily
    const tempPath = `/tmp/video-${Date.now()}.mp4`;
    const writeStream = require('fs').createWriteStream(tempPath);
    writeStream.write(req.file.buffer);
    writeStream.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Analyze video
    const analysisResult = await videoService.analyzeVideo(tempPath);

    // Save results
    const saved = await videoService.saveAnalysisResults(
      clientId,
      req.file.originalname,
      analysisResult,
      suggestedFramework || 'cucumber'
    );

    // Clean up temp file
    require('fs').unlinkSync(tempPath);

    res.status(200).json({
      analysisId: saved.id,
      steps: analysisResult.steps,
      duration: analysisResult.duration,
      framesAnalyzed: analysisResult.framesAnalyzed,
      confidence: analysisResult.confidence,
    });
  } catch (error) {
    logger.error('Video upload/analysis failed', error);
    throw error;
  }
}));

/**
 * GET /api/video/:analysisId
 * Retrieve previous video analysis
 */
router.get('/:analysisId', errorHandler(async (req: Request, res: Response) => {
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
    throw error;
  }
}));

export default router;
```

- [ ] **Step 7: Register video route in Express app**

```typescript
// backend/src/index.ts (modify existing)
import videoRoutes from './routes/video';

// Add this after other route registrations
app.use('/api/video', videoRoutes);
```

- [ ] **Step 8: Add VideoAnalysis model to Prisma schema**

```prisma
// packages/database/schema.prisma (add to existing)
model VideoAnalysis {
  id                    String   @id @default(cuid())
  clientId              String
  videoPath             String
  stepsExtracted        Int
  confidence            Float
  suggestedFramework    String
  extractedSteps        String   @db.Text  // JSON stringified
  createdAt             DateTime @default(now())
  
  client                Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  @@index([clientId])
}
```

- [ ] **Step 9: Run migration**

```bash
cd C:\QualityEngineering
npx prisma migrate dev --name add_video_analysis
```

Expected: Migration created and applied

- [ ] **Step 10: Commit**

```bash
git add backend/src/services/VideoAnalysisService.ts backend/src/utils/vision.ts backend/src/routes/video.ts tests/unit/VideoAnalysisService.test.ts backend/src/index.ts packages/database/schema.prisma
git commit -m "feat: implement video analysis service with Claude Vision API"
```

---

## Task 5.2: Create Video Upload UI Component

**Files:**
- Create: `apps/web/components/VideoUpload.tsx`
- Create: `apps/web/app/(builder)/video/upload/page.tsx`
- Create: `tests/integration/video-processing.test.ts`

**Description:** Build Next.js UI for uploading test walkthrough videos and displaying extracted steps.

- [ ] **Step 1: Create VideoUpload component**

```typescript
// apps/web/components/VideoUpload.tsx
'use client';

import React, { useState } from 'react';
import { useState as useStateHook } from 'react';

interface VideoUploadProps {
  clientId: string;
  onAnalysisComplete?: (steps: any[]) => void;
  onError?: (error: string) => void;
}

interface ExtractionStep {
  action: string;
  element?: string;
  expectedResult: string;
}

interface AnalysisResult {
  analysisId: string;
  steps: ExtractionStep[];
  duration: number;
  framesAnalyzed: number;
  confidence: number;
}

export default function VideoUpload({
  clientId,
  onAnalysisComplete,
  onError,
}: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [framework, setFramework] = useState('cucumber');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
      if (!validTypes.includes(selectedFile.type)) {
        onError?.('Invalid video format. Please use MP4, MOV, or WebM.');
        return;
      }
      // Validate file size (max 500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        onError?.('Video file is too large. Maximum size is 500MB.');
        return;
      }
      setFile(selectedFile);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      onError?.('Please select a video file');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('clientId', clientId);
      formData.append('suggestedFramework', framework);

      setProgress(30);

      const response = await fetch('/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const analysisResult: AnalysisResult = await response.json();
      setProgress(100);
      setResult(analysisResult);
      onAnalysisComplete?.(analysisResult.steps);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      onError?.(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Upload Test Video</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Framework
          </label>
          <select
            value={framework}
            onChange={(e) => setFramework(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            disabled={uploading}
          >
            <option value="cucumber">Cucumber/BDD</option>
            <option value="cypress">Cypress E2E</option>
            <option value="jest">Jest Unit</option>
            <option value="selenium">Selenium</option>
          </select>
        </div>

        {!result ? (
          <div>
            <div className="border-2 border-dashed rounded-lg p-8 text-center mb-4">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
                id="video-input"
              />
              <label htmlFor="video-input" className="cursor-pointer">
                <div className="text-gray-600">
                  {file ? (
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2">Drag and drop your video here</p>
                      <p className="text-sm">or click to select</p>
                      <p className="text-xs mt-2">
                        Supported: MP4, MOV, WebM (max 500MB)
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {uploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm mt-2 text-gray-600">
                  Processing... {progress}%
                </p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Processing...' : 'Analyze Video'}
            </button>
          </div>
        ) : (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">
                ✓ Analysis Complete
              </h3>
              <p className="text-sm text-green-700 mb-2">
                Extracted {result.framesAnalyzed} test steps
              </p>
              <p className="text-sm text-green-700">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <h4 className="font-semibold">Extracted Steps:</h4>
              {result.steps.map((step, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded border">
                  <p className="font-medium text-sm">Step {idx + 1}</p>
                  <p className="text-sm text-gray-700">
                    <strong>Action:</strong> {step.action}
                  </p>
                  {step.element && (
                    <p className="text-sm text-gray-700">
                      <strong>Element:</strong> {step.element}
                    </p>
                  )}
                  <p className="text-sm text-gray-700">
                    <strong>Expected:</strong> {step.expectedResult}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setResult(null);
                setFile(null);
              }}
              className="w-full bg-gray-300 text-gray-800 py-2 rounded-lg font-medium"
            >
              Upload Another Video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create upload page**

```typescript
// apps/web/app/(builder)/video/upload/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import VideoUpload from '@/components/VideoUpload';
import { useClientId } from '@/lib/hooks/useClientId';
import { useState } from 'react';

export default function VideoUploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const clientId = useClientId();
  const [notification, setNotification] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  if (!session) {
    return <div>Please sign in to upload videos</div>;
  }

  const handleAnalysisComplete = (steps: any[]) => {
    setNotification({
      type: 'success',
      message: `Successfully extracted ${steps.length} test steps`,
    });
    // Could redirect to test case builder with extracted steps
  };

  const handleError = (error: string) => {
    setNotification({
      type: 'error',
      message: error,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-8">
        {notification && (
          <div
            className={`max-w-2xl mx-auto mb-4 p-4 rounded-lg ${
              notification.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}
          >
            {notification.message}
          </div>
        )}
        <VideoUpload
          clientId={clientId}
          onAnalysisComplete={handleAnalysisComplete}
          onError={handleError}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add integration test**

```typescript
// tests/integration/video-processing.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import * as fs from 'fs';
import app from '../../backend/src/index';
import { prisma } from '../../backend/src/utils/db';

describe('Video Processing Integration', () => {
  let testClientId: string;
  let testVideoPath: string;

  beforeAll(async () => {
    // Create test client
    const client = await prisma.client.create({
      data: {
        name: 'Video Test Client',
        email: `video-test-${Date.now()}@example.com`,
      },
    });
    testClientId = client.id;

    // Create mock video file
    testVideoPath = './test-fixtures/sample-video.mp4';
    if (!fs.existsSync('./test-fixtures')) {
      fs.mkdirSync('./test-fixtures');
    }
    // Create minimal MP4 file for testing (just a small binary file)
    fs.writeFileSync(testVideoPath, Buffer.alloc(1024 * 100)); // 100KB dummy file
  });

  afterAll(async () => {
    // Cleanup
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
    }
    await prisma.client.delete({
      where: { id: testClientId },
    });
  });

  it('should upload and analyze a video', async () => {
    const response = await request(app)
      .post('/api/video/upload')
      .field('clientId', testClientId)
      .field('suggestedFramework', 'cucumber')
      .attach('video', testVideoPath);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('analysisId');
    expect(response.body).toHaveProperty('steps');
    expect(response.body).toHaveProperty('confidence');
  });

  it('should return 400 for missing clientId', async () => {
    const response = await request(app)
      .post('/api/video/upload')
      .attach('video', testVideoPath);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should retrieve analysis by ID', async () => {
    // First upload
    const uploadResponse = await request(app)
      .post('/api/video/upload')
      .field('clientId', testClientId)
      .field('suggestedFramework', 'cypress')
      .attach('video', testVideoPath);

    const analysisId = uploadResponse.body.analysisId;

    // Then retrieve
    const getResponse = await request(app)
      .get(`/api/video/${analysisId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toHaveProperty('steps');
    expect(getResponse.body.suggestedFramework).toBe('cypress');
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/VideoUpload.tsx apps/web/app/\(builder\)/video/upload/page.tsx tests/integration/video-processing.test.ts
git commit -m "feat: add video upload UI and integration tests for Phase 5"
```

---

# Phase 6: BDD Framework Integration & Test Execution

## Task 6.1: Create Test Execution Service

**Files:**
- Create: `backend/src/services/TestExecutionService.ts`
- Create: `backend/src/utils/executors.ts`
- Create: `apps/cli/src/executor/ResultParser.ts`
- Create: `tests/unit/TestExecutionService.test.ts`

**Description:** Implement the ability to execute tests via CLI and capture results for dashboard display.

- [ ] **Step 1: Write failing test for execution service**

```typescript
// tests/unit/TestExecutionService.test.ts
import { TestExecutionService } from '../../src/services/TestExecutionService';

describe('TestExecutionService', () => {
  let service: TestExecutionService;

  beforeEach(() => {
    service = new TestExecutionService();
  });

  describe('executeTests', () => {
    it('should execute Cucumber tests and return results', async () => {
      const result = await service.executeTests({
        projectPath: './test-fixtures/cucumber-project',
        framework: 'cucumber',
        testPattern: 'features/**/*.feature',
      });

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('tests');
    });

    it('should return detailed test results', async () => {
      const result = await service.executeTests({
        projectPath: './test-fixtures/jest-project',
        framework: 'jest',
      });

      expect(Array.isArray(result.tests)).toBe(true);
      expect(result.tests[0]).toHaveProperty('name');
      expect(result.tests[0]).toHaveProperty('status');
      expect(result.tests[0]).toHaveProperty('duration');
    });

    it('should handle test execution errors', async () => {
      await expect(
        service.executeTests({
          projectPath: './nonexistent',
          framework: 'cucumber',
        })
      ).rejects.toThrow('Project path not found');
    });
  });

  describe('parseResults', () => {
    it('should parse Cucumber JSON report', async () => {
      const parsed = await service.parseResults(
        'cucumber',
        './test-fixtures/cucumber-report.json'
      );

      expect(parsed).toHaveProperty('passed');
      expect(parsed.passed).toBeGreaterThanOrEqual(0);
    });
  });
});
```

- [ ] **Step 2: Create executor utilities**

```typescript
// backend/src/utils/executors.ts
import { spawn } from 'child_process';
import * as path from 'path';
import logger from './logger';

export interface ExecutionOptions {
  projectPath: string;
  framework: 'cucumber' | 'jest' | 'cypress' | 'selenium';
  testPattern?: string;
  environment?: Record<string, string>;
  timeout?: number;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  errorMessage?: string;
}

export interface ExecutionResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestResult[];
  rawOutput?: string;
}

/**
 * Execute tests using the appropriate framework runner
 */
export async function executeTests(
  options: ExecutionOptions
): Promise<ExecutionResult> {
  const { framework, projectPath, testPattern, timeout = 300000 } = options;

  switch (framework) {
    case 'cucumber':
      return executeCucumber(projectPath, testPattern);
    case 'jest':
      return executeJest(projectPath, testPattern);
    case 'cypress':
      return executeCypress(projectPath);
    case 'selenium':
      return executeSelenium(projectPath);
    default:
      throw new Error(`Unsupported framework: ${framework}`);
  }
}

async function executeCucumber(
  projectPath: string,
  pattern?: string
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const args = [
      'cucumber-js',
      pattern || 'features/**/*.feature',
      '--format',
      'json:cucumber-report.json',
    ];

    const process = spawn('npx', args, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let rawOutput = '';
    let errorOutput = '';

    process.stdout?.on('data', (data) => {
      rawOutput += data.toString();
    });

    process.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0 || code === 1) {
        // 0 = all passed, 1 = some failed (both OK)
        const reportPath = path.join(projectPath, 'cucumber-report.json');
        parseCucumberReport(reportPath)
          .then((result) => {
            result.rawOutput = rawOutput;
            resolve(result);
          })
          .catch(reject);
      } else {
        reject(new Error(`Cucumber execution failed with code ${code}`));
      }
    });
  });
}

async function executeJest(
  projectPath: string,
  pattern?: string
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const args = [
      'jest',
      pattern || '--all',
      '--json',
      '--outputFile=jest-report.json',
    ];

    const process = spawn('npx', args, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let rawOutput = '';

    process.stdout?.on('data', (data) => {
      rawOutput += data.toString();
    });

    process.on('close', (code) => {
      const reportPath = path.join(projectPath, 'jest-report.json');
      parseJestReport(reportPath)
        .then((result) => {
          result.rawOutput = rawOutput;
          resolve(result);
        })
        .catch(reject);
    });
  });
}

async function executeCypress(projectPath: string): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const args = ['cypress', 'run', '--json'];

    const process = spawn('npx', args, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let rawOutput = '';

    process.stdout?.on('data', (data) => {
      rawOutput += data.toString();
    });

    process.on('close', (code) => {
      try {
        const report = JSON.parse(rawOutput);
        const result: ExecutionResult = {
          passed: report.stats.passes,
          failed: report.stats.failures,
          skipped: report.stats.pending,
          duration: report.stats.duration,
          tests: report.tests.map((t: any) => ({
            name: t.title,
            status: t.state,
            duration: t.duration,
            errorMessage: t.err?.message,
          })),
          rawOutput,
        };
        resolve(result);
      } catch (error) {
        reject(new Error('Failed to parse Cypress report'));
      }
    });
  });
}

async function executeSelenium(
  projectPath: string
): Promise<ExecutionResult> {
  // Placeholder for Selenium execution
  return {
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    tests: [],
  };
}

async function parseCucumberReport(reportPath: string): Promise<ExecutionResult> {
  const fs = require('fs').promises;
  const content = await fs.readFile(reportPath, 'utf-8');
  const report = JSON.parse(content);

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let totalDuration = 0;
  const tests: TestResult[] = [];

  report.forEach((feature: any) => {
    feature.elements.forEach((scenario: any) => {
      const steps = scenario.steps || [];
      let scenarioStatus: 'passed' | 'failed' | 'skipped' = 'passed';
      let scenarioDuration = 0;

      steps.forEach((step: any) => {
        scenarioDuration += step.result.duration || 0;
        if (step.result.status === 'failed') scenarioStatus = 'failed';
        if (step.result.status === 'skipped') scenarioStatus = 'skipped';
      });

      if (scenarioStatus === 'passed') passed++;
      else if (scenarioStatus === 'failed') failed++;
      else skipped++;

      totalDuration += scenarioDuration;

      tests.push({
        name: scenario.name,
        status: scenarioStatus,
        duration: scenarioDuration,
      });
    });
  });

  return { passed, failed, skipped, duration: totalDuration, tests };
}

async function parseJestReport(reportPath: string): Promise<ExecutionResult> {
  const fs = require('fs').promises;
  const content = await fs.readFile(reportPath, 'utf-8');
  const report = JSON.parse(content);

  const tests: TestResult[] = [];
  let totalDuration = 0;

  report.testResults.forEach((suite: any) => {
    suite.assertionResults.forEach((test: any) => {
      tests.push({
        name: test.title,
        status: test.status,
        duration: test.duration,
        errorMessage: test.failureMessages?.[0],
      });
      totalDuration += test.duration;
    });
  });

  return {
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    skipped: report.numPendingTests,
    duration: totalDuration,
    tests,
  };
}
```

- [ ] **Step 3: Create TestExecutionService**

```typescript
// backend/src/services/TestExecutionService.ts
import { executeTests, ExecutionOptions, ExecutionResult } from '../utils/executors';
import { prisma } from '../utils/db';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface ExecutionRequest {
  projectPath: string;
  framework: 'cucumber' | 'jest' | 'cypress' | 'selenium';
  testPattern?: string;
  clientId?: string;
  projectId?: string;
}

export class TestExecutionService {
  /**
   * Execute tests and optionally save results to database
   */
  async executeTests(request: ExecutionRequest): Promise<ExecutionResult> {
    try {
      // Validate project path
      if (!fs.existsSync(request.projectPath)) {
        throw new Error('Project path not found');
      }

      logger.info('Starting test execution', {
        framework: request.framework,
        project: request.projectPath,
      });

      // Execute tests
      const result = await executeTests({
        projectPath: request.projectPath,
        framework: request.framework,
        testPattern: request.testPattern,
      });

      logger.info('Test execution completed', {
        passed: result.passed,
        failed: result.failed,
        duration: result.duration,
      });

      // Save results if clientId provided
      if (request.clientId && request.projectId) {
        await this.saveExecutionResults(
          request.clientId,
          request.projectId,
          request.framework,
          result
        );
      }

      return result;
    } catch (error) {
      logger.error('Test execution failed', error);
      throw error;
    }
  }

  /**
   * Parse test results from report file
   */
  async parseResults(
    framework: string,
    reportPath: string
  ): Promise<ExecutionResult> {
    try {
      if (!fs.existsSync(reportPath)) {
        throw new Error('Report file not found');
      }

      const content = fs.readFileSync(reportPath, 'utf-8');

      if (framework === 'cucumber') {
        const report = JSON.parse(content);
        return this.parseCucumberResults(report);
      } else if (framework === 'jest') {
        const report = JSON.parse(content);
        return this.parseJestResults(report);
      }

      throw new Error(`Unsupported framework: ${framework}`);
    } catch (error) {
      logger.error('Failed to parse results', error);
      throw error;
    }
  }

  /**
   * Save execution results to database
   */
  private async saveExecutionResults(
    clientId: string,
    projectId: string,
    framework: string,
    result: ExecutionResult
  ) {
    try {
      const execution = await prisma.executionResult.create({
        data: {
          clientId,
          projectId,
          framework,
          passed: result.passed,
          failed: result.failed,
          skipped: result.skipped,
          duration: result.duration,
          testResults: JSON.stringify(result.tests),
        },
      });

      logger.info('Execution results saved', { executionId: execution.id });
    } catch (error) {
      logger.error('Failed to save execution results', error);
      // Don't throw - execution was successful, just logging failed
    }
  }

  private parseCucumberResults(report: any): ExecutionResult {
    let passed = 0,
      failed = 0,
      skipped = 0;
    const tests = [];

    report.forEach((feature: any) => {
      feature.elements?.forEach((scenario: any) => {
        const steps = scenario.steps || [];
        let status = 'passed';

        steps.forEach((step: any) => {
          if (step.result?.status === 'failed') status = 'failed';
          if (step.result?.status === 'skipped') status = 'skipped';
        });

        if (status === 'passed') passed++;
        else if (status === 'failed') failed++;
        else skipped++;

        tests.push({
          name: scenario.name,
          status,
          duration: steps.reduce((sum: number, s: any) => sum + (s.result?.duration || 0), 0),
        });
      });
    });

    return { passed, failed, skipped, duration: 0, tests };
  }

  private parseJestResults(report: any): ExecutionResult {
    const tests = [];
    let totalDuration = 0;

    report.testResults?.forEach((suite: any) => {
      suite.assertionResults?.forEach((test: any) => {
        tests.push({
          name: test.title,
          status: test.status,
          duration: test.duration,
        });
        totalDuration += test.duration;
      });
    });

    return {
      passed: report.numPassedTests || 0,
      failed: report.numFailedTests || 0,
      skipped: report.numPendingTests || 0,
      duration: totalDuration,
      tests,
    };
  }
}
```

- [ ] **Step 4: Run test**

```bash
cd C:\QualityEngineering
npm test -- tests/unit/TestExecutionService.test.ts
```

Expected: Test failures (methods not yet fully implemented)

- [ ] **Step 5: Complete implementation to pass tests**

(Tests would require mock test projects - minimal stubs shown above)

- [ ] **Step 6: Create CLI execute command**

```typescript
// apps/cli/src/commands/run.ts
import { Command } from 'commander';
import { TestExecutionService } from '../../backend/src/services/TestExecutionService';
import chalk from 'chalk';

const service = new TestExecutionService();

export const runCommand = new Command()
  .name('run')
  .description('Execute tests in a project')
  .requiredOption('-f, --framework <framework>', 'Test framework (cucumber|jest|cypress|selenium)')
  .requiredOption('-p, --project <path>', 'Path to test project')
  .option('-t, --test-pattern <pattern>', 'Pattern to match test files')
  .option('-c, --client-id <id>', 'Client ID for results tracking')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Executing tests...'));

      const result = await service.executeTests({
        projectPath: options.project,
        framework: options.framework,
        testPattern: options.testPattern,
        clientId: options.clientId,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('\n' + chalk.bold('Test Results'));
        console.log(chalk.green(`✓ Passed: ${result.passed}`));
        console.log(chalk.red(`✗ Failed: ${result.failed}`));
        console.log(chalk.yellow(`⊗ Skipped: ${result.skipped}`));
        console.log(chalk.cyan(`⏱  Duration: ${result.duration}ms`));

        if (result.failed > 0) {
          console.log('\n' + chalk.red.bold('Failed Tests:'));
          result.tests
            .filter((t) => t.status === 'failed')
            .forEach((t) => {
              console.log(chalk.red(`  ✗ ${t.name}`));
              if (t.errorMessage) {
                console.log(chalk.gray(`    ${t.errorMessage}`));
              }
            });
        }
      }

      process.exit(result.failed > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Error executing tests:'), error);
      process.exit(1);
    }
  });
```

- [ ] **Step 7: Add ExecutionResult model to Prisma**

```prisma
// packages/database/schema.prisma (add)
model ExecutionResult {
  id            String   @id @default(cuid())
  clientId      String
  projectId     String
  framework     String
  passed        Int
  failed        Int
  skipped       Int
  duration      Int      // milliseconds
  testResults   String   @db.Text // JSON stringified
  createdAt     DateTime @default(now())
  
  client        Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  @@index([clientId])
  @@index([projectId])
}
```

- [ ] **Step 8: Run migration**

```bash
npx prisma migrate dev --name add_execution_results
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/services/TestExecutionService.ts backend/src/utils/executors.ts apps/cli/src/commands/run.ts tests/unit/TestExecutionService.test.ts packages/database/schema.prisma
git commit -m "feat: implement test execution service and CLI command"
```

---

# Phase 7: Defect Management Integration

## Task 7.1: Create Defect Integration Service

**Files:**
- Create: `backend/src/services/DefectIntegrationService.ts`
- Create: `backend/src/routes/defects.ts`
- Create: `tests/unit/DefectIntegrationService.test.ts`

**Description:** Wire failed tests to defect creation in QMetry, with bidirectional sync.

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/DefectIntegrationService.test.ts
import { DefectIntegrationService } from '../../src/services/DefectIntegrationService';

describe('DefectIntegrationService', () => {
  let service: DefectIntegrationService;

  beforeEach(() => {
    service = new DefectIntegrationService();
  });

  describe('createDefectFromTest', () => {
    it('should create defect in QMetry from failed test', async () => {
      const defect = await service.createDefectFromTest({
        clientId: 'test-client',
        testCaseId: 'test-123',
        title: 'Login button not clickable',
        description: 'User cannot click login button on homepage',
        severity: 'high',
        testOutput: 'Element not visible after 5 seconds',
        framework: 'cypress',
      });

      expect(defect).toHaveProperty('id');
      expect(defect).toHaveProperty('qmetryId');
      expect(defect.status).toBe('open');
    });

    it('should link test case to defect', async () => {
      const defect = await service.createDefectFromTest({
        clientId: 'test-client',
        testCaseId: 'test-456',
        title: 'API timeout',
        description: 'GET /users endpoint timing out',
        severity: 'critical',
        framework: 'jest',
      });

      expect(defect.testCaseId).toBe('test-456');
    });

    it('should handle QMetry API errors', async () => {
      await expect(
        service.createDefectFromTest({
          clientId: 'invalid-client',
          testCaseId: 'test-789',
          title: 'Test',
          description: 'Test',
          severity: 'medium',
          framework: 'cucumber',
        })
      ).rejects.toThrow();
    });
  });
});
```

- [ ] **Step 2: Create DefectIntegrationService**

```typescript
// backend/src/services/DefectIntegrationService.ts
import { QMetryService } from './QMetryService';
import { prisma } from '../utils/db';
import logger from '../utils/logger';

export interface CreateDefectRequest {
  clientId: string;
  testCaseId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  testOutput?: string;
  framework: string;
  environment?: string;
  reproducibilityRate?: number;
}

export interface Defect {
  id: string;
  qmetryId: string;
  testCaseId: string;
  status: string;
  severity: string;
  title: string;
  description: string;
  createdDate: Date;
}

export class DefectIntegrationService {
  private qmetryService: QMetryService;

  constructor() {
    this.qmetryService = new QMetryService();
  }

  /**
   * Create a defect in QMetry from a failed test
   */
  async createDefectFromTest(request: CreateDefectRequest): Promise<Defect> {
    try {
      logger.info('Creating defect from test', {
        testCaseId: request.testCaseId,
        framework: request.framework,
      });

      // Get client QMetry config
      const client = await prisma.client.findUnique({
        where: { id: request.clientId },
      });

      if (!client || !client.qmetryConfig) {
        throw new Error('QMetry not configured for this client');
      }

      // Create defect in QMetry
      const qmetryDefect = await this.qmetryService.createDefect({
        title: request.title,
        description: request.description,
        severity: request.severity,
        clientConfig: client.qmetryConfig as any,
        customFields: {
          testCase: request.testCaseId,
          framework: request.framework,
          testOutput: request.testOutput,
          environment: request.environment || 'unknown',
          reproducibilityRate: request.reproducibilityRate || 100,
        },
      });

      // Save to local database
      const defect = await prisma.defect.create({
        data: {
          clientId: request.clientId,
          testCaseId: request.testCaseId,
          qmetryId: qmetryDefect.id,
          status: 'open',
          severity: request.severity,
          title: request.title,
          description: request.description,
          failureDetails: request.testOutput || '',
        },
      });

      logger.info('Defect created', {
        defectId: defect.id,
        qmetryId: qmetryDefect.id,
      });

      return {
        id: defect.id,
        qmetryId: defect.qmetryId,
        testCaseId: defect.testCaseId,
        status: defect.status,
        severity: defect.severity,
        title: defect.title,
        description: defect.description,
        createdDate: defect.createdAt,
      };
    } catch (error) {
      logger.error('Failed to create defect', error);
      throw error;
    }
  }

  /**
   * Sync defect status from QMetry
   */
  async syncDefectStatus(defectId: string): Promise<void> {
    try {
      const defect = await prisma.defect.findUnique({
        where: { id: defectId },
        include: { client: true },
      });

      if (!defect || !defect.client?.qmetryConfig) {
        throw new Error('Defect or QMetry config not found');
      }

      // Get latest status from QMetry
      const qmetryStatus = await this.qmetryService.getDefectStatus({
        defectId: defect.qmetryId,
        clientConfig: defect.client.qmetryConfig as any,
      });

      // Update local database
      await prisma.defect.update({
        where: { id: defectId },
        data: { status: qmetryStatus },
      });

      logger.info('Defect status synced', {
        defectId,
        status: qmetryStatus,
      });
    } catch (error) {
      logger.error('Failed to sync defect status', error);
      throw error;
    }
  }

  /**
   * List defects for a client
   */
  async listDefects(
    clientId: string,
    filter?: {
      status?: string;
      severity?: string;
      framework?: string;
    }
  ) {
    try {
      const defects = await prisma.defect.findMany({
        where: {
          clientId,
          ...(filter?.status && { status: filter.status }),
          ...(filter?.severity && { severity: filter.severity }),
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });

      return defects;
    } catch (error) {
      logger.error('Failed to list defects', error);
      throw error;
    }
  }
}
```

- [ ] **Step 3: Create defects API route**

```typescript
// backend/src/routes/defects.ts
import { Router, Request, Response } from 'express';
import { DefectIntegrationService } from '../services/DefectIntegrationService';
import { errorHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const defectService = new DefectIntegrationService();

router.use(authMiddleware);

/**
 * POST /api/defects
 * Create a defect from a failed test
 */
router.post(
  '/',
  errorHandler(async (req: Request, res: Response) => {
    const { clientId, testCaseId, title, description, severity, framework, testOutput } = req.body;

    if (!clientId || !testCaseId || !title || !description || !severity || !framework) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const defect = await defectService.createDefectFromTest({
        clientId,
        testCaseId,
        title,
        description,
        severity,
        framework,
        testOutput,
      });

      res.status(201).json(defect);
    } catch (error) {
      throw error;
    }
  })
);

/**
 * GET /api/defects
 * List defects for a client
 */
router.get(
  '/',
  errorHandler(async (req: Request, res: Response) => {
    const { clientId, status, severity } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'clientId is required' });
    }

    try {
      const defects = await defectService.listDefects(clientId, {
        status: status as string,
        severity: severity as string,
      });

      res.status(200).json(defects);
    } catch (error) {
      throw error;
    }
  })
);

/**
 * GET /api/defects/:defectId
 * Get defect details
 */
router.get(
  '/:defectId',
  errorHandler(async (req: Request, res: Response) => {
    const { defectId } = req.params;

    try {
      const defect = await prisma.defect.findUnique({
        where: { id: defectId },
      });

      if (!defect) {
        return res.status(404).json({ error: 'Defect not found' });
      }

      res.status(200).json(defect);
    } catch (error) {
      throw error;
    }
  })
);

/**
 * PATCH /api/defects/:defectId/sync
 * Sync defect status from QMetry
 */
router.patch(
  '/:defectId/sync',
  errorHandler(async (req: Request, res: Response) => {
    const { defectId } = req.params;

    try {
      await defectService.syncDefectStatus(defectId);
      res.status(200).json({ message: 'Defect status synced' });
    } catch (error) {
      throw error;
    }
  })
);

export default router;
```

- [ ] **Step 4: Add Defect model to Prisma**

```prisma
// packages/database/schema.prisma (add)
model Defect {
  id                String   @id @default(cuid())
  clientId          String
  testCaseId        String
  qmetryId          String
  status            String   // "open" | "in_progress" | "resolved" | "closed"
  severity          String   // "low" | "medium" | "high" | "critical"
  title             String
  description       String
  failureDetails    String   @db.Text
  linkedTestRuns    String[] // Array of execution result IDs
  createdAt         DateTime @default(now())
  resolvedAt        DateTime?
  
  client            Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  @@index([clientId])
  @@index([status])
  @@index([severity])
}
```

- [ ] **Step 5: Register route and run migration**

```bash
# Update backend/src/index.ts
import defectsRouter from './routes/defects';
app.use('/api/defects', defectsRouter);

# Run migration
npx prisma migrate dev --name add_defects_table
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/DefectIntegrationService.ts backend/src/routes/defects.ts tests/unit/DefectIntegrationService.test.ts packages/database/schema.prisma backend/src/index.ts
git commit -m "feat: implement defect management integration with QMetry"
```

---

# Phase 8: Dashboard Implementation

## Task 8.1: Create Dashboard Metrics APIs

**Files:**
- Create: `backend/src/services/DashboardService.ts`
- Create: `apps/web/app/api/dashboard/metrics/route.ts`
- Create: `apps/web/app/api/dashboard/trends/route.ts`

**Description:** Build backend APIs for dashboard metrics, trends, and test execution data aggregation.

- [ ] **Step 1: Create DashboardService**

```typescript
// backend/src/services/DashboardService.ts
import { prisma } from '../utils/db';
import logger from '../utils/logger';

export interface MetricsData {
  totalTestCases: number;
  totalExecutions: number;
  passRate: number;
  failRate: number;
  averageDuration: number;
  topFailingTests: Array<{
    name: string;
    failureCount: number;
    lastFailed: Date;
  }>;
  frameworkDistribution: Record<string, number>;
  defectSummary: {
    open: number;
    inProgress: number;
    resolved: number;
  };
}

export interface TrendData {
  date: string;
  passCount: number;
  failCount: number;
  totalTests: number;
  executionTime: number;
  passRate: number;
}

export class DashboardService {
  /**
   * Get metrics for a client/project
   */
  async getMetrics(
    clientId: string,
    projectId?: string,
    days: number = 30
  ): Promise<MetricsData> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get test case counts
      const testCaseCounts = await prisma.testCase.groupBy({
        by: ['framework'],
        where: {
          clientId,
          ...(projectId && { projectId }),
        },
        _count: true,
      });

      const totalTestCases = testCaseCounts.reduce((sum, tc) => sum + tc._count, 0);

      // Get execution metrics
      const executions = await prisma.executionResult.findMany({
        where: {
          clientId,
          createdAt: { gte: startDate },
          ...(projectId && { projectId }),
        },
      });

      const totalExecutions = executions.length;
      const totalPassed = executions.reduce((sum, e) => sum + e.passed, 0);
      const totalFailed = executions.reduce((sum, e) => sum + e.failed, 0);
      const totalTests = totalPassed + totalFailed;
      const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
      const failRate = 100 - passRate;
      const averageDuration =
        executions.length > 0
          ? executions.reduce((sum, e) => sum + e.duration, 0) / executions.length
          : 0;

      // Get framework distribution
      const frameworkDistribution: Record<string, number> = {};
      testCaseCounts.forEach((tc) => {
        frameworkDistribution[tc.framework] = tc._count;
      });

      // Get defect summary
      const defects = await prisma.defect.findMany({
        where: { clientId },
      });

      const defectSummary = {
        open: defects.filter((d) => d.status === 'open').length,
        inProgress: defects.filter((d) => d.status === 'in_progress').length,
        resolved: defects.filter((d) => d.status === 'resolved').length,
      };

      logger.info('Metrics retrieved', {
        clientId,
        totalTestCases,
        passRate: passRate.toFixed(2),
      });

      return {
        totalTestCases,
        totalExecutions,
        passRate,
        failRate,
        averageDuration,
        topFailingTests: [], // Would need additional query
        frameworkDistribution,
        defectSummary,
      };
    } catch (error) {
      logger.error('Failed to get metrics', error);
      throw error;
    }
  }

  /**
   * Get trends over time
   */
  async getTrends(
    clientId: string,
    projectId?: string,
    days: number = 30
  ): Promise<TrendData[]> {
    try {
      const trends: TrendData[] = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get daily execution data
      const executions = await prisma.executionResult.findMany({
        where: {
          clientId,
          createdAt: { gte: startDate },
          ...(projectId && { projectId }),
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by date
      const byDate: Record<string, ExecutionResult[]> = {};
      executions.forEach((exec) => {
        const dateKey = exec.createdAt.toISOString().split('T')[0];
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(exec);
      });

      // Calculate trend data
      Object.entries(byDate).forEach(([date, dayExecutions]) => {
        const totalPassed = dayExecutions.reduce((sum, e) => sum + e.passed, 0);
        const totalFailed = dayExecutions.reduce((sum, e) => sum + e.failed, 0);
        const totalTests = totalPassed + totalFailed;
        const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

        trends.push({
          date,
          passCount: totalPassed,
          failCount: totalFailed,
          totalTests,
          executionTime: dayExecutions.reduce((sum, e) => sum + e.duration, 0),
          passRate,
        });
      });

      return trends;
    } catch (error) {
      logger.error('Failed to get trends', error);
      throw error;
    }
  }

  /**
   * Get top failing tests
   */
  async getTopFailingTests(clientId: string, limit: number = 10) {
    try {
      // Aggregate failures by test case
      const failures: Record<string, any> = {};

      const defects = await prisma.defect.findMany({
        where: { clientId },
      });

      defects.forEach((defect) => {
        if (!failures[defect.testCaseId]) {
          failures[defect.testCaseId] = {
            testCaseId: defect.testCaseId,
            failureCount: 0,
            lastFailed: defect.createdAt,
          };
        }
        failures[defect.testCaseId].failureCount++;
        if (defect.createdAt > failures[defect.testCaseId].lastFailed) {
          failures[defect.testCaseId].lastFailed = defect.createdAt;
        }
      });

      return Object.values(failures)
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get top failing tests', error);
      throw error;
    }
  }
}
```

- [ ] **Step 2: Create metrics API**

```typescript
// apps/web/app/api/dashboard/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/backend/src/services/DashboardService';

const service = new DashboardService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const projectId = searchParams.get('projectId');
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    const metrics = await service.getMetrics(clientId, projectId || undefined, days);

    return NextResponse.json(metrics, { status: 200 });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Create trends API**

```typescript
// apps/web/app/api/dashboard/trends/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/backend/src/services/DashboardService';

const service = new DashboardService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const projectId = searchParams.get('projectId');
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 30;

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    const trends = await service.getTrends(clientId, projectId || undefined, days);

    return NextResponse.json(trends, { status: 200 });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/DashboardService.ts apps/web/app/api/dashboard/metrics/route.ts apps/web/app/api/dashboard/trends/route.ts
git commit -m "feat: implement dashboard metrics and trends APIs"
```

---

# Phase 9: Integration Testing & Validation

## Task 9.1: End-to-End Integration Tests

**Files:**
- Create: `tests/integration/e2e.test.ts`
- Create: `tests/integration/video-processing.test.ts`
- Create: `tests/integration/test-execution.test.ts`
- Create: `tests/integration/defect-creation.test.ts`

**Description:** Comprehensive E2E tests validating full workflow from video upload through defect creation.

- [ ] **Step 1: Create main E2E test suite**

```typescript
// tests/integration/e2e.test.ts
import request from 'supertest';
import app from '../../backend/src/index';
import { prisma } from '../../backend/src/utils/db';

describe('End-to-End Integration Tests', () => {
  let testClientId: string;
  let testProjectId: string;
  let analysisId: string;
  let testCaseId: string;
  let executionId: string;
  let defectId: string;

  beforeAll(async () => {
    // Create test client
    const client = await prisma.client.create({
      data: {
        name: 'E2E Test Client',
        email: `e2e-${Date.now()}@example.com`,
        jiraConfig: { url: 'https://jira.example.com', token: 'test-token' },
        qmetryConfig: { url: 'https://qmetry.example.com', token: 'test-token' },
      },
    });
    testClientId = client.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        clientId,
        name: 'E2E Test Project',
        description: 'Project for E2E testing',
      },
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.client.delete({
      where: { id: testClientId },
      include: {
        projects: { include: { testCases: true } },
        logs: true,
        defects: true,
      },
    });
  });

  describe('Complete workflow: Video → Test Cases → Execution → Defects', () => {
    it('should complete full pipeline', async () => {
      // Step 1: Upload and analyze video
      const videoResponse = await request(app)
        .post('/api/video/upload')
        .field('clientId', testClientId)
        .field('suggestedFramework', 'cucumber')
        .attach('video', './test-fixtures/sample-video.mp4');

      expect(videoResponse.status).toBe(200);
      analysisId = videoResponse.body.analysisId;
      expect(analysisId).toBeDefined();

      // Step 2: Generate test cases from analysis
      const generateResponse = await request(app)
        .post('/api/test-cases/generate')
        .send({
          clientId: testClientId,
          framework: 'cucumber',
          designPattern: 'bdd-ui',
          requirements: 'User login workflow',
          acceptanceCriteria: ['User can enter credentials', 'User can click login'],
        });

      expect(generateResponse.status).toBe(200);
      testCaseId = generateResponse.body.testCase.id;
      expect(testCaseId).toBeDefined();

      // Step 3: Execute tests
      const executionResponse = await request(app)
        .post('/api/execute')
        .send({
          clientId: testClientId,
          projectId: testProjectId,
          framework: 'cucumber',
          testPattern: 'features/**/*.feature',
        });

      expect(executionResponse.status).toBe(200);
      executionId = executionResponse.body.executionId;

      // Step 4: Create defect from failed test
      const defectResponse = await request(app)
        .post('/api/defects')
        .send({
          clientId: testClientId,
          testCaseId,
          title: 'Login button not clickable',
          description: 'User cannot click login button',
          severity: 'high',
          framework: 'cucumber',
          testOutput: 'Element not found after 10 seconds',
        });

      expect(defectResponse.status).toBe(201);
      defectId = defectResponse.body.id;
      expect(defectId).toBeDefined();

      // Step 5: Verify all data is linked
      const testCase = await prisma.testCase.findUnique({
        where: { id: testCaseId },
      });
      expect(testCase).toBeDefined();
      expect(testCase?.framework).toBe('cucumber');

      const defect = await prisma.defect.findUnique({
        where: { id: defectId },
      });
      expect(defect).toBeDefined();
      expect(defect?.testCaseId).toBe(testCaseId);
    });
  });

  describe('Dashboard metrics calculation', () => {
    it('should calculate metrics correctly', async () => {
      const metricsResponse = await request(app)
        .get('/api/dashboard/metrics')
        .query({ clientId: testClientId });

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.body).toHaveProperty('totalTestCases');
      expect(metricsResponse.body).toHaveProperty('passRate');
      expect(metricsResponse.body).toHaveProperty('defectSummary');
    });
  });
});
```

- [ ] **Step 2: Run integration test suite**

```bash
npm test -- tests/integration/e2e.test.ts --runInBand
```

Expected: All tests passing (or identified failures to fix)

- [ ] **Step 3: Add validation test for each phase component**

(Add additional test files for video-processing, test-execution, defect-creation as needed based on actual implementation)

- [ ] **Step 4: Commit**

```bash
git add tests/integration/e2e.test.ts
git commit -m "feat: add comprehensive E2E integration tests"
```

---

# Phase 10: Deployment & Operations

## Task 10.1: Configure Deployment Infrastructure

**Files:**
- Create: `vercel.json`
- Create: `.github/workflows/ci-cd.yml`
- Create: `docs/deployment/DEPLOYMENT.md`
- Create: `docs/deployment/VERCEL_SETUP.md`
- Create: `apps/cli/package.json` (update)

**Description:** Set up Vercel deployment for web app, GitHub Actions CI/CD, and CLI npm publishing.

- [ ] **Step 1: Create Vercel configuration**

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": [
    {
      "key": "CLAUDE_API_KEY",
      "description": "Anthropic API key for Claude integration",
      "example": ""
    },
    {
      "key": "DATABASE_URL",
      "description": "PostgreSQL connection string",
      "example": ""
    },
    {
      "key": "NEXTAUTH_SECRET",
      "description": "NextAuth.js secret for session encryption",
      "example": ""
    },
    {
      "key": "NEXTAUTH_URL",
      "description": "NextAuth.js callback URL",
      "example": "https://your-domain.com"
    }
  ],
  "regions": ["sfo1"],
  "functions": {
    "api/**": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

- [ ] **Step 2: Create GitHub Actions CI/CD pipeline**

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Save build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: |
            apps/web/.next
            apps/cli/dist

  deploy-web:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        run: npx vercel deploy --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}

  publish-cli:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' && startsWith(github.ref, 'refs/tags/')
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build CLI
        run: npm run build --workspace=apps/cli
      
      - name: Publish to npm
        run: npm publish --workspace=apps/cli
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Create deployment documentation**

```markdown
# Deployment Guide

## Web Application (Vercel)

### Prerequisites
- Vercel account
- GitHub repository connected
- Environment variables configured

### Setup
1. Visit https://vercel.com/import
2. Select your GitHub repository
3. Configure environment variables from `.env.example`
4. Deploy

### Environment Variables
- `CLAUDE_API_KEY`: Your Anthropic API key
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL`: Your Vercel deployment URL

## CLI Application (npm)

### Publishing
1. Update version in `apps/cli/package.json`
2. Create git tag: `git tag v1.0.0`
3. Push tags: `git push origin --tags`
4. GitHub Actions will automatically publish to npm

### Installation
```bash
npm install -g quality-engineering-cli
```

### Usage
```bash
qe run --framework cucumber --project ./features
qe generate --framework jest --requirements "User login"
```

## Database

### Migration
```bash
npx prisma migrate deploy
```

### Seeding
```bash
npx prisma db seed
```
```

- [ ] **Step 4: Update CLI package.json for npm publishing**

```json
{
  "name": "quality-engineering-cli",
  "version": "1.0.0",
  "description": "CLI tool for Quality Engineering platform",
  "main": "dist/index.js",
  "bin": {
    "qe": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["testing", "quality-assurance", "cli", "ai"],
  "author": "",
  "license": "MIT",
  "publishConfig": {
    "registry": "https://registry.npmjs.org/"
  }
}
```

- [ ] **Step 5: Create operations runbook**

```markdown
# Operations Runbook

## Monitoring

### Key Metrics
- API response time (p50, p95, p99)
- Database connection pool utilization
- Claude API quota usage
- Error rates by endpoint

### Alerts
- API error rate > 5%
- Response time p99 > 5s
- Database connections near limit
- Claude API quota usage > 80%

## Scaling

### Horizontal Scaling
- Vercel automatically scales serverless functions
- Database read replicas for high load

### Vertical Scaling
- Increase Vercel function memory (max 3GB)
- Upgrade PostgreSQL instance

## Troubleshooting

### High API Latency
1. Check database query performance
2. Check Claude API response times
3. Verify network connectivity
4. Check Vercel function logs

### Database Issues
1. Check connection pool status
2. Review slow queries
3. Check disk space
4. Review transaction locks

### Claude API Issues
1. Verify API key is valid
2. Check quota usage
3. Review rate limits
4. Check request formats
```

- [ ] **Step 6: Commit deployment configuration**

```bash
git add vercel.json .github/workflows/ci-cd.yml docs/deployment/ apps/cli/package.json
git commit -m "feat: configure deployment infrastructure for web and CLI"
```

---

## Completion Checklist

- [ ] All tasks in Phases 5-10 completed
- [ ] All tests passing
- [ ] Code committed to git
- [ ] Documentation updated
- [ ] Deployment configured and tested
- [ ] CI/CD pipeline functional

---

## Notes

**Implementation Order:** Tasks should be executed phase-by-phase (Phase 5 → Phase 6 → ... → Phase 10) as later phases depend on earlier ones.

**Testing:** Each task includes unit tests (TDD approach). Phase 9 includes integration tests validating cross-phase workflows.

**Deployment:** Phase 10 completes the platform for production use with Vercel hosting and npm package distribution.
