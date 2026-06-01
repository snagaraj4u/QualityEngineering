import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/db';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/test/:executionId/stream
 * Stream test progress updates as Server-Sent Events
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

    // If execution is already completed, send current results and close
    if (execution.status && execution.status !== 'IN_PROGRESS') {
      let testResults;
      try {
        testResults = JSON.parse(execution.testResults || '[]');
      } catch (parseError) {
        logger.warn('Invalid JSON in testResults for execution ' + executionId, parseError);
        testResults = [];
      }

      res.write('data: ' + JSON.stringify({
        type: 'complete',
        passed: execution.passed,
        failed: execution.failed,
        skipped: execution.skipped,
        duration: execution.duration,
        tests: testResults,
      }) + '\n\n');
      res.end();
    } else {
      // Keep connection open for future events (handled by TestExecutionService)
      res.write(': keep-alive\n\n');

      // Set timeout to close connection after 30 minutes of inactivity
      const timeout = setTimeout(() => {
        res.end();
      }, 30 * 60 * 1000);

      res.on('close', () => clearTimeout(timeout));
    }
  } catch (error) {
    logger.error('Failed to establish SSE stream', error);
    next(error);
  }
});

export default router;
