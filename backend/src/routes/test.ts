import express, { Router, Request, Response } from 'express';
import { TestExecutionService } from '../services/TestExecutionService';
import { ExecutionResultService } from '../services/ExecutionResultService';
import logger from '../utils/logger';
import { ApiError } from '../utils/ApiError';

export const testRouter = Router();

const testExecutionService = new TestExecutionService();
const executionResultService = new ExecutionResultService();

// Validation utilities
const VALID_FRAMEWORKS = ['cucumber', 'jest', 'cypress', 'selenium'];

function validateFramework(framework: string): boolean {
  return VALID_FRAMEWORKS.includes(framework);
}

function validateUUID(id: string): boolean {
  // Simple UUID v4 validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Also accept CUID format (used by Prisma)
  const cuidRegex = /^[a-z0-9]+$/i;
  return uuidRegex.test(id) || cuidRegex.test(id);
}

/**
 * POST /api/test/execute
 * Start a test execution
 */
testRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const { projectId, clientId, framework, projectPath, testPattern } = req.body;

    // Validation
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid required field: projectId',
      });
    }

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid required field: clientId',
      });
    }

    if (!framework || typeof framework !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid required field: framework',
      });
    }

    if (!validateFramework(framework)) {
      return res.status(400).json({
        error: `Invalid framework: ${framework}. Supported frameworks: ${VALID_FRAMEWORKS.join(', ')}`,
      });
    }

    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid required field: projectPath',
      });
    }

    // Optional validation
    if (testPattern && typeof testPattern !== 'string') {
      return res.status(400).json({
        error: 'Invalid testPattern: must be a string',
      });
    }

    // Create execution record in database with pending status
    const executionStart = await executionResultService.saveExecutionStart(
      clientId,
      projectId,
      framework
    );

    logger.info(
      `Test execution started: ${executionStart.executionId} for project ${projectId} using ${framework}`
    );

    // Start async test execution (fire-and-forget)
    // In a production system, this would be queued or sent to a worker
    testExecutionService
      .executeTests({
        projectPath,
        framework: framework as 'cucumber' | 'jest' | 'cypress' | 'selenium',
        testPattern,
        clientId,
        projectId,
      })
      .catch(async (error) => {
        logger.error(
          `Test execution failed for ${executionStart.executionId}: ${error instanceof Error ? error.message : String(error)}`
        );
        // Issue 3 Fix: Update execution status to FAILED on error instead of fire-and-forget
        try {
          await executionResultService.updateExecutionStatus(
            executionStart.executionId,
            'FAILED',
            clientId,
            {
              passed: 0,
              failed: 0,
              skipped: 0,
              duration: 0,
              tests: [],
            }
          );
        } catch (updateError) {
          logger.error(
            `Failed to update execution status after error: ${
              updateError instanceof Error ? updateError.message : String(updateError)
            }`
          );
        }
      });

    // Return immediately with execution ID
    res.status(200).json(executionStart);
  } catch (error) {
    logger.error(
      `Error starting test execution: ${error instanceof Error ? error.message : String(error)}`
    );
    res.status(500).json({
      error: 'Failed to start test execution',
    });
  }
});

/**
 * GET /api/test/:executionId
 * Get execution result
 */
testRouter.get('/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const { clientId } = req.query;

    // Validate execution ID format (basic)
    if (!executionId || typeof executionId !== 'string' || executionId.length === 0) {
      return res.status(400).json({
        error: 'Invalid executionId format',
      });
    }

    // Convert clientId from query to string if provided
    const clientIdStr = clientId ? String(clientId) : undefined;

    // Get execution result from database
    const executionResult = await executionResultService.getExecutionResult(
      executionId,
      clientIdStr
    );

    if (!executionResult) {
      return res.status(404).json({
        error: 'Execution not found',
      });
    }

    res.status(200).json(executionResult);
  } catch (error) {
    // Issue 6 Fix: Use ApiError with code property instead of string matching
    if (error instanceof ApiError) {
      if (error.code === 'ISOLATION_VIOLATION') {
        logger.warn(`Unauthorized access to execution: ${req.params.executionId}`);
        return res.status(error.statusCode).json({
          error: 'Unauthorized',
        });
      }
      return res.status(error.statusCode).json({
        error: error.message,
      });
    }

    logger.error(
      `Error fetching execution result: ${error instanceof Error ? error.message : String(error)}`
    );
    res.status(500).json({
      error: 'Failed to fetch execution result',
    });
  }
});

/**
 * POST /api/test/:executionId/cancel
 * Cancel a pending execution
 */
testRouter.post('/:executionId/cancel', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const { clientId } = req.body;

    // Validation
    if (!executionId || typeof executionId !== 'string' || executionId.length === 0) {
      return res.status(400).json({
        error: 'Invalid executionId format',
      });
    }

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid required field: clientId',
      });
    }

    // Cancel execution
    const cancelResult = await executionResultService.cancelExecution(executionId, clientId);

    res.status(200).json(cancelResult);
  } catch (error) {
    // Issue 6 Fix: Use ApiError with code property instead of string matching
    if (error instanceof ApiError) {
      if (error.code === 'ISOLATION_VIOLATION') {
        logger.warn(`Unauthorized cancel attempt for execution: ${req.params.executionId}`);
        return res.status(error.statusCode).json({
          error: 'Unauthorized',
        });
      }
      return res.status(error.statusCode).json({
        error: error.message,
      });
    }

    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message === 'Execution not found') {
        logger.warn(`Attempted to cancel non-existent execution: ${req.params.executionId}`);
        return res.status(404).json({
          error: 'Execution not found',
        });
      }

      if (error.message.includes('Cannot cancel')) {
        logger.warn(`Cannot cancel execution: ${req.params.executionId}`);
        return res.status(400).json({
          error: error.message,
        });
      }
    }

    logger.error(
      `Error cancelling execution: ${error instanceof Error ? error.message : String(error)}`
    );
    res.status(500).json({
      error: 'Failed to cancel execution',
    });
  }
});

export default testRouter;
