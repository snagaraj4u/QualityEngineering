import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { executeTests, ExecutionResult } from './executors';

// Mock child_process
jest.mock('child_process');
jest.mock('fs/promises');
jest.mock('./logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('executors.ts - Code Quality Issues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Issue 1: Unnecessary null checks in executors.ts', () => {
    it('should not check if code !== null since Node.js close events never pass null', async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const mockEmitter = {
        stdout: {
          on: jest.fn(),
        },
        stderr: {
          on: jest.fn(),
        },
        on: jest.fn(function (event: string, handler: any) {
          if (event === 'close') {
            // Simulate close event with code 0 (success) - never null
            setImmediate(() => handler(0));
          } else if (event === 'error') {
            // Store error handler for potential use
          }
          return this;
        }),
      };

      mockSpawn.mockReturnValue(mockEmitter as any);
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      // On a clean (code 0) exit the executor parses the framework report;
      // return an empty cucumber report so parsing resolves deterministically.
      (fs.readFile as jest.Mock).mockResolvedValue('[]');

      // This test verifies that the code should handle code === 0 without checking for null
      // After fix, the condition should be: if (code !== 0)
      // Before fix, it was: if (code !== 0 && code !== null)
      const result = await executeTests({
        projectPath: '/test/path',
        framework: 'cucumber',
      });

      // The test should complete successfully without throwing
      expect(result).toBeDefined();
    });

    it('should properly handle non-zero exit codes without null check', async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

      const mockEmitter = {
        stdout: {
          on: jest.fn(),
        },
        stderr: {
          on: jest.fn(),
        },
        on: jest.fn(function (event: string, handler: any) {
          if (event === 'close') {
            // Auto-fire on registration. Firing synchronously from the test
            // races the dispatcher's `await fs.access` (the handler isn't
            // registered yet), which previously left the promise pending.
            setImmediate(() => handler(1));
          }
          return this;
        }),
      };

      mockSpawn.mockReturnValue(mockEmitter as any);
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      // Non-zero exit code must reject (code !== 0), independent of any null check.
      await expect(
        executeTests({
          projectPath: '/test/path',
          framework: 'jest',
        })
      ).rejects.toThrow();
    });
  });

  describe('Issue 6: Unclear regex escaping in executors.ts', () => {
    it('should have clear documentation about allowed characters in test pattern', () => {
      // This test checks that the regex pattern is documented
      // Line 9 has: /^[a-zA-Z0-9_\-./{}*?[\]]+$/
      // {} doesn't need escaping in character class
      // The fix should add a comment explaining the pattern

      const source = require('fs').readFileSync(
        path.join(__dirname, 'executors.ts'),
        'utf-8'
      );

      // Check that there's a comment explaining the allowed characters
      const hasCommentBeforeRegex = source.includes(
        'Only allow alphanumeric'
      );
      expect(hasCommentBeforeRegex).toBe(true);
    });
  });
});

describe('executors.ts - exit-code null-check regression guard', () => {
  // These guards previously hard-coded line numbers (201/267/335/401); the
  // code-quality fix shifted the file, so they checked unrelated lines. Assert
  // the intent directly against the whole source instead: Node.js close events
  // never pass null, so the close handlers must guard with `if (code !== 0)`
  // and never reintroduce the `code !== 0 && code !== null` anti-pattern.
  const readSource = () =>
    require('fs').readFileSync(path.join(__dirname, 'executors.ts'), 'utf-8') as string;

  it('does not use the `code !== 0 && code !== null` anti-pattern anywhere', () => {
    expect(readSource()).not.toMatch(/code !== 0 && code !== null/);
  });

  it('guards every framework executor with `if (code !== 0)` (cucumber, jest, cypress, selenium)', () => {
    const matches = readSource().match(/if \(code !== 0\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });
});
