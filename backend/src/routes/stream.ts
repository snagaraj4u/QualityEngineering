import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import { testExecutionService } from '../services/TestExecutionService';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/test/:executionId/stream
 * Stream test progress updates as Server-Sent Events.
 *
 * Subscribes to the shared TestExecutionService EventEmitter so that events
 * emitted by the runner (started via POST /api/test/execute) are forwarded to
 * connected clients in real time.
 */
router.get('/:executionId/stream', async (req: Request, res: Response, next: NextFunction) => {
  const { executionId } = req.params;
  const { clientId } = req.query;

  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    // Verify execution exists and belongs to client
    const execution = await prisma.executionResult.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (execution.clientId !== clientId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection event
    res.write('data: {"status":"connected","executionId":"' + executionId + '"}\n\n');

    // If execution already reached a terminal state, replay the final result and close.
    if (execution.status && execution.status !== 'IN_PROGRESS') {
      let testResults;
      try {
        testResults = JSON.parse(execution.testResults || '[]');
      } catch (parseError) {
        logger.warn('Invalid JSON in testResults for execution ' + executionId, parseError);
        testResults = [];
      }

      res.write('data: ' + JSON.stringify({
        type: 'execution-complete',
        passed: execution.passed,
        failed: execution.failed,
        skipped: execution.skipped,
        duration: execution.duration,
        tests: testResults,
      }) + '\n\n');
      res.end();
      return;
    }

    // Execution is in progress: subscribe to runner events scoped to this executionId.
    const handleTestComplete = (event: { executionId: string; test: unknown }) => {
      if (event.executionId === executionId) {
        res.write('data: ' + JSON.stringify({
          type: 'test-complete',
          test: event.test,
        }) + '\n\n');
      }
    };

    const handleExecutionComplete = (event: {
      executionId: string;
      passed: number;
      failed: number;
      skipped: number;
      duration: number;
    }) => {
      if (event.executionId === executionId) {
        res.write('data: ' + JSON.stringify({
          type: 'execution-complete',
          passed: event.passed,
          failed: event.failed,
          skipped: event.skipped,
          duration: event.duration,
        }) + '\n\n');
        res.end();
      }
    };

    const handleExecutionError = (event: { executionId: string; error: string }) => {
      if (event.executionId === executionId) {
        res.write('data: ' + JSON.stringify({
          type: 'execution-error',
          error: event.error,
        }) + '\n\n');
        res.end();
      }
    };

    testExecutionService.on('test-complete', handleTestComplete);
    testExecutionService.on('execution-complete', handleExecutionComplete);
    testExecutionService.on('execution-error', handleExecutionError);

    // Keep-alive comment prevents idle proxies from closing the connection.
    const keepAliveInterval = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keep-alive\n\n');
      }
    }, 30000);

    // Hard timeout: close after 30 minutes of inactivity.
    const timeout = setTimeout(() => {
      res.end();
    }, 30 * 60 * 1000);

    // Clean up listeners and timers when the client disconnects or the stream ends.
    const cleanup = () => {
      clearInterval(keepAliveInterval);
      clearTimeout(timeout);
      testExecutionService.removeListener('test-complete', handleTestComplete);
      testExecutionService.removeListener('execution-complete', handleExecutionComplete);
      testExecutionService.removeListener('execution-error', handleExecutionError);
    };

    res.on('close', cleanup);
  } catch (error) {
    logger.error('Failed to establish SSE stream', error);
    next(error);
  }
});

export default router;
