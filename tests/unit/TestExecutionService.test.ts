import { TestExecutionService } from '../../backend/src/services/TestExecutionService';

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
