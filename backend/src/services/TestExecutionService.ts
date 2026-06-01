import * as fs from 'fs/promises';
import * as path from 'path';
import { prisma } from '../utils/db';
import { logger } from '../utils/logger';
import {
  executeTests,
  ExecutionOptions,
  ExecutionRequest,
  ExecutionResult,
  parseCucumberReport,
  parseJestReport,
} from '../utils/executors';

export class TestExecutionService {
  async executeTests(request: ExecutionRequest): Promise<ExecutionResult> {
    const { projectPath, framework, testPattern, clientId, projectId } = request;

    // Runtime validation of framework parameter
    const validFrameworks = ['cucumber', 'jest', 'cypress', 'selenium'];
    if (!validFrameworks.includes(framework)) {
      throw new Error(
        `Invalid framework: ${framework}. Supported frameworks: ${validFrameworks.join(', ')}`
      );
    }

    const options: ExecutionOptions = {
      projectPath,
      framework,
      testPattern,
    };

    try {
      const result = await executeTests(options);
      logger.info(`Test execution completed: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`);

      // Save results to database if clientId and projectId are provided
      if (clientId && projectId) {
        await this.saveExecutionResults(clientId, projectId, framework, result);
      }

      return result;
    } catch (error) {
      logger.error(`Test execution failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async parseResults(framework: string, reportPath: string): Promise<ExecutionResult> {
    try {
      // Validate report file exists
      await fs.access(reportPath);

      switch (framework) {
        case 'cucumber':
          return await parseCucumberReport(reportPath);
        case 'jest':
          return await parseJestReport(reportPath);
        default:
          throw new Error(`Unsupported framework for parsing: ${framework}`);
      }
    } catch (error) {
      logger.error(`Failed to parse results: ${(error as Error).message}`);
      throw error;
    }
  }

  async saveExecutionResults(
    clientId: string,
    projectId: string,
    framework: string,
    result: ExecutionResult
  ): Promise<void> {
    try {
      await prisma.executionResult.create({
        data: {
          clientId,
          projectId,
          framework,
          passed: result.passed,
          failed: result.failed,
          skipped: result.skipped,
          status: result.failed > 0 ? 'FAILED' : 'PASSED',
          duration: result.duration,
          errorMessage: result.rawOutput,
          testResults: JSON.stringify(result.tests),
        },
      });
      logger.info(`Execution results saved for client ${clientId}, project ${projectId}`);
    } catch (error) {
      // Propagate the error so callers can detect save failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to save execution results: ${errorMessage}`);
      throw new Error(`Failed to save execution results: ${errorMessage}`);
    }
  }
}
