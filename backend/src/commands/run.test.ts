import { runCommand } from './run';
import { TestExecutionService } from '../services/TestExecutionService';
import logger from '../utils/logger';

// Mock dependencies
jest.mock('../services/TestExecutionService');
jest.mock('../utils/logger', () => ({
  // __esModule marks this as an ES module so ts-jest's interop helper reads
  // `.default` directly instead of double-wrapping it (which left logger.error
  // undefined → "logger.error is not a function").
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('run.ts - Code Quality Issues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Issue 4: Missing projectId parameter in ExecutionRequest', () => {
    it('should include projectId in ExecutionRequest', async () => {
      const mockExecuteTests = jest.fn().mockResolvedValue({
        passed: 5,
        failed: 0,
        skipped: 0,
        duration: 1000,
        tests: [],
      });

      (TestExecutionService.prototype as any).executeTests = mockExecuteTests;

      await runCommand({
        projectPath: '/test/project',
        projectId: 'proj-123', // Issue 4: Must pass projectId
        framework: 'jest',
        clientId: 'client-1',
      });

      expect(mockExecuteTests).toHaveBeenCalled();
      const callArgs = mockExecuteTests.mock.calls[0][0];

      // After fix: projectId should be included in request
      expect(callArgs).toHaveProperty('projectId');
      expect(callArgs.projectId).toBe('proj-123');
    });

    it('should construct ExecutionRequest with all required fields', async () => {
      const mockExecuteTests = jest.fn().mockResolvedValue({
        passed: 5,
        failed: 0,
        skipped: 0,
        duration: 1000,
        tests: [],
      });

      (TestExecutionService.prototype as any).executeTests = mockExecuteTests;

      await runCommand({
        projectPath: '/test/project',
        projectId: 'proj-456',
        framework: 'cucumber',
        testPattern: '**/*.feature',
        clientId: 'client-2',
      });

      const callArgs = mockExecuteTests.mock.calls[0][0];

      // All fields should be present in ExecutionRequest
      expect(callArgs).toEqual({
        projectPath: '/test/project',
        projectId: 'proj-456',
        framework: 'cucumber',
        testPattern: '**/*.feature',
        clientId: 'client-2',
      });
    });
  });

  describe('Issue 7: Stack trace exposure - sensitive paths in production', () => {
    it('should not output error.stack in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      const testError = new Error('Test failed at /home/user/secret/project/src/test.ts');
      const mockExecuteTests = jest
        .fn()
        .mockRejectedValue(testError);

      (TestExecutionService.prototype as any).executeTests = mockExecuteTests;

      try {
        await runCommand({
          projectPath: '/test/project',
          projectId: 'proj-123',
          framework: 'jest',
        });
      } catch (error) {
        // After fix: Should not expose sensitive paths from stack trace
        const errorMsg = (error as Error).message;
        expect(errorMsg).not.toContain('/home/user/secret/project');
        expect(errorMsg).toBe('Test execution failed');
      }

      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    });

    it('should log only error message, not stack trace', async () => {
      const testError = new Error('Connection timeout');
      const mockExecuteTests = jest
        .fn()
        .mockRejectedValue(testError);

      (TestExecutionService.prototype as any).executeTests = mockExecuteTests;

      try {
        await runCommand({
          projectPath: '/test/project',
          projectId: 'proj-123',
          framework: 'jest',
        });
      } catch (error) {
        // Verify logger was called with safe error message
        expect(logger.error).toHaveBeenCalled();
        const errorLogCall = (logger.error as jest.Mock).mock.calls[0][0];

        // Should not contain stack trace
        expect(errorLogCall).not.toMatch(/at\s+\w+\s+/);
        // Should contain safe message
        expect(errorLogCall).toMatch(/Failed to execute tests/);
      }
    });

    it('should expose stack trace only in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';

      const testError = new Error('Development error with stack');
      const mockExecuteTests = jest
        .fn()
        .mockRejectedValue(testError);

      (TestExecutionService.prototype as any).executeTests = mockExecuteTests;

      try {
        await runCommand({
          projectPath: '/test/project',
          projectId: 'proj-123',
          framework: 'jest',
        });
      } catch (error) {
        // In development, original error is rethrown with full details
        expect((error as Error).message).toBe('Development error with stack');
      }

      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    });

    it('should not expose file paths in error messages', async () => {
      const errorWithPath = new Error(
        'Failed at /home/user/.config/secrets/database.json:42'
      );
      const mockExecuteTests = jest
        .fn()
        .mockRejectedValue(errorWithPath);

      (TestExecutionService.prototype as any).executeTests = mockExecuteTests;

      const originalEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      try {
        await runCommand({
          projectPath: '/test/project',
          projectId: 'proj-123',
          framework: 'jest',
        });
      } catch (error) {
        // Should not expose path or config details
        const msg = (error as Error).message;
        expect(msg).not.toContain('/home/user');
        expect(msg).not.toContain('.config');
        expect(msg).not.toContain('secrets');
      }

      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    });
  });

  describe('Issue 4 & 7 combined: Full integration', () => {
    it('should handle ExecutionRequest construction with proper error handling', async () => {
      const mockExecuteTests = jest
        .fn()
        .mockRejectedValue(
          new Error(
            'Execution failed in /sensitive/path/test.ts at line 42'
          )
        );

      (TestExecutionService.prototype as any).executeTests = mockExecuteTests;

      const originalEnv = process.env.NODE_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      await expect(
        runCommand({
          projectPath: '/test/project',
          projectId: 'proj-789', // Issue 4: Must include projectId
          framework: 'cypress',
        })
      ).rejects.toThrow('Test execution failed'); // Issue 7: Generic error message

      expect(mockExecuteTests).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-789',
        })
      );

      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    });
  });
});

describe('run.ts - Line-specific checks', () => {
  it('Line 24: ExecutionRequest construction must include projectId', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, 'run.ts'),
      'utf-8'
    );

    // Check that ExecutionRequest is constructed with projectId
    const executionRequestConstruction = source.match(
      /const\s+request:\s*ExecutionRequest\s*=\s*\{[\s\S]*?\};/
    );

    expect(executionRequestConstruction).toBeTruthy();
    expect(executionRequestConstruction![0]).toContain('projectId:');
  });

  it('Lines 50-52: Should not output error.stack directly', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, 'run.ts'),
      'utf-8'
    );

    // After fix: should not have error.stack in output
    expect(source).not.toMatch(/error\.stack/);

    // Should sanitize or only log in dev
    expect(source).toMatch(/NODE_ENV|development|production/);
  });
});
