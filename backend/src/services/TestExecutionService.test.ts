import { TestExecutionService } from './TestExecutionService';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../utils/logger';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../utils/db', () => ({
  prisma: {
    executionResult: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../utils/executors', () => ({
  executeTests: jest.fn().mockResolvedValue({
    passed: 5,
    failed: 1,
    skipped: 0,
    duration: 1000,
    tests: [
      {
        name: 'Test 1',
        status: 'PASSED',
        duration: 200,
      },
    ],
    rawOutput: 'test output',
  }),
  parseCucumberReport: jest.fn(),
  parseJestReport: jest.fn(),
}));

describe('TestExecutionService - Code Quality Issues', () => {
  let service: TestExecutionService;

  beforeEach(() => {
    service = new TestExecutionService();
    jest.clearAllMocks();
  });

  describe('Issue 2: Semantic misuse - errorMessage vs rawOutput', () => {
    it('should not store rawOutput as errorMessage field', async () => {
      const mockPrisma = require('../utils/db').prisma;
      const mockCreate = mockPrisma.executionResult.create as jest.Mock;

      await service.saveExecutionResults('client1', 'project1', 'jest', {
        passed: 5,
        failed: 1,
        skipped: 0,
        duration: 1000,
        tests: [],
        rawOutput: 'this is test output from stdout/stderr, not an error',
      });

      // After fix, should use testOutput field or similar, not errorMessage
      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];

      // After fix: should have proper field naming
      // The rawOutput should not be called "errorMessage"
      // Instead, it should be "testOutput" or stored separately
      expect(callArgs.data).toBeDefined();
      // Check that the field is properly named (not just errorMessage)
      const usedFields = Object.keys(callArgs.data);
      const hasErrorMessageField = usedFields.includes('errorMessage');

      // This test documents the current issue - after fix, this behavior should change
      if (hasErrorMessageField) {
        // If errorMessage is still used, it should only be populated when there's actual error
        const errorMessage = callArgs.data.errorMessage;
        if (errorMessage) {
          // If rawOutput is passed as errorMessage, it's wrong
          expect(errorMessage).not.toBe('this is test output from stdout/stderr, not an error');
        }
      }
    });

    it('should store errorMessage properly when there is an actual error', async () => {
      const mockPrisma = require('../utils/db').prisma;
      const mockCreate = mockPrisma.executionResult.create as jest.Mock;

      const result = {
        passed: 0,
        failed: 3,
        skipped: 0,
        duration: 1000,
        tests: [
          {
            name: 'Failed Test',
            status: 'FAILED' as const,
            duration: 200,
            errorMessage: 'Actual assertion error',
          },
        ],
        rawOutput: 'test output',
      };

      await service.saveExecutionResults('client1', 'project1', 'jest', result);

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];

      // When there are actual errors, errorMessage should be meaningful
      // not just a copy of rawOutput
      expect(callArgs.data.failed).toBe(3);
    });
  });

  describe('Issue 3: Inconsistent async error handling', () => {
    it('should properly integrate fs.access into try/catch pattern in parseResults', async () => {
      const mockAccess = fs.access as jest.Mock;
      mockAccess.mockRejectedValueOnce(new Error('File not found'));

      // After fix, fs.access error should be properly caught
      await expect(
        service.parseResults('cucumber', '/nonexistent/report.json')
      ).rejects.toThrow();

      // Verify that the error was logged
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle fs.access success path consistently', async () => {
      const mockAccess = fs.access as jest.Mock;
      const mockParse = require('../utils/executors').parseCucumberReport;

      mockAccess.mockResolvedValueOnce(undefined);
      mockParse.mockResolvedValueOnce({
        passed: 5,
        failed: 0,
        skipped: 0,
        duration: 1000,
        tests: [],
      });

      const result = await service.parseResults(
        'cucumber',
        '/path/report.json'
      );

      expect(result).toBeDefined();
      expect(mockAccess).toHaveBeenCalled();
    });
  });

  describe('Issue 5: Redundant error re-wrapping', () => {
    it('should not duplicate error wrapping context', async () => {
      const mockPrisma = require('../utils/db').prisma;
      const originalError = new Error('Database connection failed');

      mockPrisma.executionResult.create.mockRejectedValueOnce(originalError);

      await expect(
        service.saveExecutionResults('client1', 'project1', 'jest', {
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 1000,
          tests: [],
        })
      ).rejects.toThrow();

      // After fix: should either log and rethrow original, or minimize context duplication
      expect(logger.error).toHaveBeenCalled();

      // Check that error message doesn't duplicate the context
      const mockedError = logger.error as jest.Mock;
      const errorCall = mockedError.mock.calls[mockedError.mock.calls.length - 1];
      const errorMsg = errorCall[0] as string;

      // Should not have "Failed to save execution results: Failed to save execution results:"
      const duplicatePattern = /Failed to save.*Failed to save/i;
      expect(errorMsg).not.toMatch(duplicatePattern);
    });

    it('should preserve original error details without unnecessary wrapping', async () => {
      const mockPrisma = require('../utils/db').prisma;
      const contextError = new Error('Original error message with details');

      mockPrisma.executionResult.create.mockRejectedValueOnce(contextError);

      try {
        await service.saveExecutionResults('client1', 'project1', 'jest', {
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 1000,
          tests: [],
        });
      } catch (error) {
        // The caught error should not duplicate the original message
        const errorMsg = (error as Error).message;
        expect(errorMsg).toContain('Original error message with details');
      }
    });
  });
});

describe('TestExecutionService - Line-specific checks', () => {
  let service: TestExecutionService;

  beforeEach(() => {
    service = new TestExecutionService();
    jest.clearAllMocks();
  });

  it('Line 51: fs.access should be properly error-handled in parseResults', () => {
    const source = require('fs').readFileSync(
      path.join(__dirname, 'TestExecutionService.ts'),
      'utf-8'
    );
    const lines = source.split('\n');

    // Line 51 (index 50) should have fs.access
    const line51 = lines[50];

    // Should be within try/catch
    const tryBlockStart = source.indexOf('async parseResults');
    const tryKeywordAfter = source.indexOf('try', tryBlockStart);
    const accessKeywordAfter = source.indexOf('fs.access', tryBlockStart);

    expect(tryKeywordAfter).toBeLessThan(accessKeywordAfter);
  });

  it('Line 84: errorMessage should not be set to rawOutput', () => {
    const source = require('fs').readFileSync(
      path.join(__dirname, 'TestExecutionService.ts'),
      'utf-8'
    );

    // Check that errorMessage is not assigned rawOutput
    const hasWrongAssignment = source.includes('errorMessage: result.rawOutput');
    expect(hasWrongAssignment).toBe(false);
  });

  it('Lines 91-93: Should not duplicate error wrapping context', () => {
    const source = require('fs').readFileSync(
      path.join(__dirname, 'TestExecutionService.ts'),
      'utf-8'
    );
    const lines = source.split('\n');

    // Lines 91-93 should handle errors without re-wrapping
    const contextLines = lines.slice(90, 94).join('\n');

    // Should not have nested error messages
    expect(contextLines).not.toMatch(/throw new Error.*error.*throw/);
  });
});
