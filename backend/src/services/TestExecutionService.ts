import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { prisma } from '../utils/db';
import logger from '../utils/logger';
import {
  executeTests,
  ExecutionOptions,
  ExecutionRequest,
  ExecutionResult,
  parseCucumberReport,
  parseJestReport,
  executeCucumber,
  executeJest,
  executeCypress,
  executeSelenium,
  TestResult,
} from '../utils/executors';

export class TestExecutionService extends EventEmitter {
  constructor() {
    super();
  }

  async executeTests(request: ExecutionRequest): Promise<string> {
    try {
      // Validate framework
      const validFrameworks = ['cucumber', 'jest', 'cypress', 'selenium'];
      if (!validFrameworks.includes(request.framework)) {
        throw new Error(`Unsupported framework: ${request.framework}`);
      }

      // Save execution start
      const execution = await prisma.executionResult.create({
        data: {
          clientId: request.clientId || '',
          projectId: request.projectId || '',
          framework: request.framework,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0,
          status: 'IN_PROGRESS',
          testResults: '[]',
        },
      });

      // Emit execution-started event
      this.emit('execution-started', {
        executionId: execution.id,
        framework: request.framework,
      });

      // Execute tests asynchronously (fire-and-forget)
      this.executeTestsAsync(execution.id, request).catch((error) => {
        logger.error('Async test execution failed', error);
        this.emit('execution-error', {
          executionId: execution.id,
          error: (error as Error).message,
        });
      });

      return execution.id;
    } catch (error) {
      logger.error('Failed to start test execution', error);
      throw error;
    }
  }

  private async executeTestsAsync(executionId: string, request: ExecutionRequest): Promise<void> {
    try {
      // Get the appropriate executor
      const executorMap: any = {
        cucumber: executeCucumber,
        jest: executeJest,
        cypress: executeCypress,
        selenium: executeSelenium,
      };

      const executor = executorMap[request.framework];
      if (!executor) {
        throw new Error(`No executor found for framework: ${request.framework}`);
      }

      // Execute tests
      const result = await executor(request.projectPath, request.testPattern);

      // Parse results
      const testResults = result.tests || [];

      // Emit test-complete event for each test
      testResults.forEach((test: TestResult, index: number) => {
        this.emit('test-complete', {
          executionId,
          index,
          test: {
            name: test.name,
            status: test.status,
            duration: test.duration,
            errorMessage: test.errorMessage,
          },
        });
      });

      // Update execution in database
      const execution = await prisma.executionResult.update({
        where: { id: executionId },
        data: {
          passed: testResults.filter((t: TestResult) => t.status === 'PASSED').length,
          failed: testResults.filter((t: TestResult) => t.status === 'FAILED').length,
          skipped: testResults.filter((t: TestResult) => t.status === 'SKIPPED').length,
          duration: result.duration,
          status: 'PASSED',
          testResults: JSON.stringify(testResults),
        },
      });

      // Emit execution-complete event
      this.emit('execution-complete', {
        executionId,
        passed: execution.passed,
        failed: execution.failed,
        skipped: execution.skipped,
        duration: execution.duration,
      });
    } catch (error) {
      logger.error('Test execution failed', error);
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
      // Only include rawOutput when there were test failures
      const dataToSave: any = {
        clientId,
        projectId,
        framework,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        status: result.failed > 0 ? 'FAILED' : 'PASSED',
        duration: result.duration,
        testResults: JSON.stringify(result.tests),
      };

      // Issue 2 fix: Only store rawOutput when there were actual failures
      if (result.failed > 0 && result.rawOutput) {
        dataToSave.testOutput = result.rawOutput;
      }

      await prisma.executionResult.create({ data: dataToSave });
      logger.info(`Execution results saved for client ${clientId}, project ${projectId}`);
    } catch (error) {
      // Issue 5 fix: Log original error without duplicating context
      if (error instanceof Error) {
        logger.error(`Failed to save execution results: ${error.message}`);
        throw error;
      }
      logger.error(`Failed to save execution results: ${String(error)}`);
      throw new Error('Failed to save execution results');
    }
  }
}
