import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';
import logger from '../utils/logger';

export const dashboardRouter = Router();

const dashboardService = new DashboardService();

/** Parse the optional `days` query param, defaulting to 30 and clamping to a sane range. */
function parseDays(raw: unknown): number {
  const parsed = parseInt(String(raw ?? ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 30;
  }
  return Math.min(parsed, 365);
}

/**
 * GET /api/dashboard/metrics?clientId=...&projectId=...&days=30
 */
dashboardRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { clientId, projectId, days } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const metrics = await dashboardService.getMetrics(
      clientId,
      projectId ? String(projectId) : undefined,
      parseDays(days)
    );

    return res.status(200).json(metrics);
  } catch (error) {
    logger.error(
      `Error fetching dashboard metrics: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/dashboard/trends?clientId=...&projectId=...&days=30
 */
dashboardRouter.get('/trends', async (req: Request, res: Response) => {
  try {
    const { clientId, projectId, days } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const trends = await dashboardService.getTrends(
      clientId,
      projectId ? String(projectId) : undefined,
      parseDays(days)
    );

    return res.status(200).json(trends);
  } catch (error) {
    logger.error(
      `Error fetching dashboard trends: ${error instanceof Error ? error.message : String(error)}`
    );
    return res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

export default dashboardRouter;
