import { VideoAnalysisService } from '../../backend/src/services/VideoAnalysisService';
import * as fs from 'fs';

// The >500MB fixture is generated on demand as a sparse file (reports its
// logical size to fs.stat but uses ~0 bytes on disk) so it never has to be
// committed to git. validateVideo only checks fs.statSync().size.
const HUGE_FIXTURE = './test-fixtures/huge-video.mp4';
const HUGE_FIXTURE_SIZE = 600 * 1024 * 1024;

// analyzeVideo delegates frame extraction to the Claude Vision util, which
// requires a live Anthropic SDK/API key. Mock that boundary so the tests
// exercise the service's frames->steps transformation deterministically.
// validateVideo tests below still use the real fs + ./test-fixtures files.
jest.mock('../../backend/src/utils/vision', () => ({
  __esModule: true,
  analyzeVideoWithVision: jest.fn().mockResolvedValue({
    frames: [
      {
        timestamp: 0,
        action: 'Click the login button',
        element: 'button#login',
        expectedResult: 'Login form is displayed',
      },
      {
        timestamp: 1200,
        action: 'Enter credentials and submit',
        element: 'form#auth',
        expectedResult: 'User is authenticated',
      },
    ],
  }),
}));

describe('VideoAnalysisService', () => {
  let service: VideoAnalysisService;

  beforeAll(() => {
    // Create the oversized fixture as a sparse file if it isn't present.
    if (!fs.existsSync(HUGE_FIXTURE) || fs.statSync(HUGE_FIXTURE).size < HUGE_FIXTURE_SIZE) {
      const fd = fs.openSync(HUGE_FIXTURE, 'w');
      try {
        fs.ftruncateSync(fd, HUGE_FIXTURE_SIZE);
      } finally {
        fs.closeSync(fd);
      }
    }
  });

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

      await expect(service.analyzeVideo(filePath)).rejects.toThrow('Video file validation failed');
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
      const filePath = HUGE_FIXTURE;
      const isValid = await service.validateVideo(filePath);

      expect(isValid).toBe(false);
    });
  });
});
