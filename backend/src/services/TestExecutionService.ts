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
          testCaseId: projectId, // Using projectId as testCaseId for now (schema may vary)
          userId: clientId, // Using clientId as userId for now
          status: result.failed > 0 ? 'FAILED' : 'PASSED',
          duration: result.duration,
          errorMessage: result.rawOutput,
        },
      });
      logger.info(`Execution results saved for client ${clientId}, project ${projectId}`);
    } catch (error) {
      // Don't throw on save failure - execution itself succeeded
      logger.warn(`Failed to save execution results: ${(error as Error).message}`);
    }
  }
}
