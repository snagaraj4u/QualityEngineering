import { prisma } from '../utils/db';
import logger from '../utils/logger';
import { ApiError } from '../utils/ApiError';

export interface ExecutionStartResponse {
  executionId: string;
  status: string;
  framework: string;
  createdAt: string;
}

export interface ExecutionResultResponse {
  id: string;
  clientId?: string;
  projectId?: string;
  status: string;
  passed: number;
  failed: number;
  skipped: number;
  duration?: number;
  tests: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    errorMessage?: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

export interface CancelExecutionResponse {
  id: string;
  status: string;
  message: string;
}

export class ExecutionResultService {
  /**
   * Save the initial execution request to database with pending status
   */
  async saveExecutionStart(
    clientId: string,
    projectId: string,
    framework: string
  ): Promise<ExecutionStartResponse> {
    try {
      // Prisma will auto-generate the ID (CUID) since it's marked as @default(cuid())
      const result = await prisma.executionResult.create({
        data: {
          clientId,
          projectId,
          framework,
          status: 'IN_PROGRESS',
          passed: 0,
          failed: 0,
          skipped: 0,
          testResults: JSON.stringify([]),
        },
      });

      logger.info(`Execution created: ${result.id}`);

      return {
        executionId: result.id,
        status: 'pending',
        framework: result.framework || '',
        createdAt: result.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error(
        `Failed to save execution start: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Retrieve execution result by ID with multi-tenant validation
   */
  async getExecutionResult(executionId: string, clientId?: string): Promise<ExecutionResultResponse | null> {
    try {
      const result = await prisma.executionResult.findUnique({
        where: { id: executionId },
      });

      if (!result) {
        logger.info(`Execution not found: ${executionId}`);
        return null;
      }

      // Multi-tenant isolation: verify clientId matches if provided
      if (clientId && result.clientId !== clientId) {
        logger.warn(
          `Unauthorized access attempt to execution ${executionId} from clientId ${clientId}`
        );
        throw new ApiError(
          'Multi-tenant isolation violation',
          'ISOLATION_VIOLATION',
          403
        );
      }

      // Parse testResults from JSON string
      let tests: Array<{
        name: string;
        status: 'passed' | 'failed' | 'skipped';
        duration: number;
        errorMessage?: string;
      }> = [];

      if (result.testResults) {
        try {
          tests = JSON.parse(result.testResults);
        } catch (parseError) {
          logger.error(`Failed to parse testResults JSON for execution ${executionId}`);
          tests = [];
        }
      }

      // Map database status to API response format
      const statusMap: Record<string, string> = {
        IN_PROGRESS: 'pending',
        PASSED: 'completed',
        FAILED: 'completed',
        SKIPPED: 'completed',
      };

      return {
        id: result.id,
        clientId: result.clientId || undefined,
        projectId: result.projectId || undefined,
        status: statusMap[result.status] || 'pending',
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        duration: result.duration || undefined,
        tests,
        createdAt: result.createdAt.toISOString(),
        completedAt: result.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error(
        `Failed to get execution result: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Update execution status to completed with final results
   * Issue 1 Fix: Now includes clientId parameter and validates ownership
   */
  async updateExecutionStatus(
    executionId: string,
    status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'CANCELLED',
    clientId: string,
    results: {
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
      tests: Array<{
        name: string;
        status: 'PASSED' | 'FAILED' | 'SKIPPED';
        duration: number;
        errorMessage?: string;
      }>;
    }
  ): Promise<void> {
    try {
      // Multi-tenant isolation: Verify execution belongs to this client
      const execution = await prisma.executionResult.findUnique({
        where: { id: executionId },
      });

      if (!execution) {
        throw new Error('Execution not found');
      }

      if (execution.clientId !== clientId) {
        logger.warn(
          `Unauthorized status update attempt for execution ${executionId} from clientId ${clientId}`
        );
        throw new ApiError(
          'Multi-tenant isolation violation',
          'ISOLATION_VIOLATION',
          403
        );
      }

      // Normalize test results
      const normalizedTests = results.tests.map(test => ({
        name: test.name,
        status: test.status,
        duration: test.duration,
        errorMessage: test.errorMessage,
      }));

      // Map to Prisma ExecutionStatus enum
      const statusMap: Record<string, 'PASSED' | 'FAILED' | 'SKIPPED' | 'CANCELLED'> = {
        'PASSED': 'PASSED',
        'FAILED': 'FAILED',
        'SKIPPED': 'SKIPPED',
        'CANCELLED': 'CANCELLED',
      };

      await prisma.executionResult.update({
        where: { id: executionId },
        data: {
          status: statusMap[status],
          passed: results.passed,
          failed: results.failed,
          skipped: results.skipped,
          duration: results.duration,
          testResults: JSON.stringify(normalizedTests),
        },
      });

      logger.info(`Execution updated: ${executionId} - ${status}`);
    } catch (error) {
      logger.error(
        `Failed to update execution status: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Cancel a pending execution
   * Issue 4 Fix: Uses CANCELLED status instead of FAILED for semantic correctness
   */
  async cancelExecution(executionId: string, clientId?: string): Promise<CancelExecutionResponse> {
    try {
      // First, fetch the execution to verify it exists and check status
      const execution = await prisma.executionResult.findUnique({
        where: { id: executionId },
      });

      if (!execution) {
        logger.warn(`Attempted to cancel non-existent execution: ${executionId}`);
        throw new Error('Execution not found');
      }

      // Multi-tenant isolation
      if (clientId && execution.clientId !== clientId) {
        logger.warn(
          `Unauthorized cancel attempt for execution ${executionId} from clientId ${clientId}`
        );
        throw new ApiError(
          'Multi-tenant isolation violation',
          'ISOLATION_VIOLATION',
          403
        );
      }

      // Check if execution is still pending (IN_PROGRESS)
      if (execution.status !== 'IN_PROGRESS') {
        logger.warn(
          `Attempted to cancel non-pending execution: ${executionId} with status ${execution.status}`
        );
        throw new Error(`Cannot cancel ${execution.status} execution`);
      }

      // Update status to CANCELLED instead of FAILED (proper semantic status)
      await prisma.executionResult.update({
        where: { id: executionId },
        data: {
          status: 'CANCELLED',
        },
      });

      logger.info(`Execution cancelled: ${executionId}`);

      return {
        id: executionId,
        status: 'cancelled',
        message: 'Test execution cancelled',
      };
    } catch (error) {
      logger.error(
        `Failed to cancel execution: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
}
