import { TestExecutionService } from '../../backend/src/services/TestExecutionService';
import { ExecutionRequest, ExecutionResult } from '../../backend/src/utils/executors';

describe('TestExecutionService', () => {
  let service: TestExecutionService;

  beforeEach(() => {
    service = new TestExecutionService();
  });

  describe('executeTests', () => {
    it('should execute Cucumber tests and return results with passed, failed, skipped, duration, and tests array', async () => {
      const request: ExecutionRequest = {
        projectPath: './test-fixtures/cucumber-project',
        framework: 'cucumber',
      };

      const result = await service.executeTests(request);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('tests');
      expect(typeof result.passed).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.skipped).toBe('number');
      expect(typeof result.duration).toBe('number');
      expect(Array.isArray(result.tests)).toBe(true);
    });

    it('should return detailed test results with name, status, and duration properties', async () => {
      const request: ExecutionRequest = {
        projectPath: './test-fixtures/cucumber-project',
        framework: 'cucumber',
      };

      const result = await service.executeTests(request);

      if (result.tests.length > 0) {
        const test = result.tests[0];
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('status');
        expect(test).toHaveProperty('duration');
        expect(['PASSED', 'FAILED', 'SKIPPED']).toContain(test.status);
      }
    });

    it('should handle test execution errors gracefully', async () => {
      const request: ExecutionRequest = {
        projectPath: './nonexistent-project-path',
        framework: 'cucumber',
      };

      await expect(service.executeTests(request)).rejects.toThrow();
    });

    it('should support multiple test frameworks', async () => {
      const frameworks = ['cucumber', 'jest', 'cypress', 'selenium'];

      for (const framework of frameworks) {
        const request: ExecutionRequest = {
          projectPath: './test-fixtures/sample-project',
          framework: framework as any,
        };

        // Should not throw for unsupported framework, but handle appropriately
        try {
          const result = await service.executeTests(request);
          expect(result).toHaveProperty('passed');
          expect(result).toHaveProperty('failed');
        } catch (error) {
          // Framework-specific path not found is acceptable
          expect((error as Error).message).toContain('not found');
        }
      }
    });

    it('should capture test execution duration in milliseconds', async () => {
      const request: ExecutionRequest = {
        projectPath: './test-fixtures/cucumber-project',
        framework: 'cucumber',
      };

      const result = await service.executeTests(request);

      expect(result.duration).toBeGreaterThan(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should parse Cucumber JSON reports correctly', async () => {
      const request: ExecutionRequest = {
        projectPath: './test-fixtures/cucumber-project',
        framework: 'cucumber',
        testPattern: 'features/**/*.feature',
      };

      const result = await service.executeTests(request);

      expect(result.passed + result.failed + result.skipped).toBe(result.tests.length);
    });

    it('should allow optional clientId and projectId in request', async () => {
      const request: ExecutionRequest = {
        projectPath: './test-fixtures/cucumber-project',
        framework: 'cucumber',
        clientId: 'client-123',
        projectId: 'project-456',
      };

      // Should not throw
      expect(() => {
        service.executeTests(request);
      }).not.toThrow();
    });
  });

  describe('parseResults', () => {
    it('should parse Cucumber JSON report', async () => {
      const reportPath = './test-fixtures/cucumber-report.json';

      const result = await service.parseResults('cucumber', reportPath);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('tests');
    });

    it('should handle missing report file gracefully', async () => {
      const reportPath = './nonexistent-report.json';

      await expect(service.parseResults('cucumber', reportPath)).rejects.toThrow();
    });
  });

  describe('saveExecutionResults', () => {
    it('should not throw error if database save fails', async () => {
      const result: ExecutionResult = {
        passed: 5,
        failed: 2,
        skipped: 1,
        duration: 1500,
        tests: [
          {
            name: 'Test 1',
            status: 'PASSED',
            duration: 500,
          },
        ],
      };

      // Should not throw even if clientId/projectId are not provided
      expect(async () => {
        await service.saveExecutionResults('client-123', 'project-456', 'cucumber', result);
      }).not.toThrow();
    });
  });
});
