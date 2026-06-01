import { TestExecutionService } from '../services/TestExecutionService';
import { ExecutionRequest } from '../utils/executors';
import logger from '../utils/logger';

/**
 * Command handler for running tests
 * Constructs ExecutionRequest with proper parameters
 */
export async function runCommand(options: {
  projectPath: string;
  projectId: string;
  framework: string;
  testPattern?: string;
  clientId?: string;
}): Promise<void> {
  try {
    // Issue 4 fix: Ensure ExecutionRequest has both projectId and projectPath
    const request: ExecutionRequest = {
      projectPath: options.projectPath,
      projectId: options.projectId, // Now properly included
      framework: options.framework as any,
      testPattern: options.testPattern,
      clientId: options.clientId,
    };

    const service = new TestExecutionService();
    // executeTests is fire-and-forget: it persists a pending record, kicks off
    // the run asynchronously, and returns the executionId. Results are reported
    // via the API / SSE stream, not synchronously here.
    const executionId = await service.executeTests(request);

    // Issue 7 fix: Sanitize stack traces and avoid exposing sensitive paths
    logger.info(`Test execution started: ${executionId}`);

    return;
  } catch (error) {
    // Issue 7 fix: Don't output full stack trace with sensitive paths
    const errorMessage = (error as Error).message || 'Unknown error';

    // Only log the error message, not the full stack trace
    logger.error(`Failed to execute tests: ${errorMessage}`);

    // In production, don't expose stack traces or file paths
    if (process.env.NODE_ENV !== 'development') {
      // Log stack trace only in development
      throw new Error('Test execution failed');
    } else {
      throw error;
    }
  }
}
