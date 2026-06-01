import { VideoAnalysisService } from '../../backend/src/services/VideoAnalysisService';

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
      const filePath = './test-fixtures/huge-video.mp4';
      const isValid = await service.validateVideo(filePath);

      expect(isValid).toBe(false);
    });
  });
});
