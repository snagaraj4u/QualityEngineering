import { Router, Request, Response } from 'express';
import { DefectIntegrationService, DefectSeverityInput } from '../services/DefectIntegrationService';
import { prisma } from '../utils/db';
import logger from '../utils/logger';
import { ApiError } from '../utils/ApiError';

export const defectsRouter = Router();

const defectService = new DefectIntegrationService();

const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];

/**
 * Translate a thrown error into an HTTP response, mirroring the convention used
 * by routes/test.ts (ApiError carries code + statusCode; ISOLATION_VIOLATION is
 * surfaced as a generic 401-style "Unauthorized").
 */
function handleError(error: unknown, res: Response, context: string): Response {
  if (error instanceof ApiError) {
    if (error.code === 'ISOLATION_VIOLATION') {
      logger.warn(`${context}: isolation violation`);
      return res.status(error.statusCode).json({ error: 'Unauthorized' });
    }
    return res.status(error.statusCode).json({ error: error.message });
  }

  logger.error(`${context}: ${error instanceof Error ? error.message : String(error)}`);
  return res.status(500).json({ error: context });
}

/**
 * POST /api/defects
 * Create a defect from a failed test (and push it to QMetry).
 */
defectsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      projectId,
      testCaseId,
      title,
      description,
      severity,
      executionResultId,
      testOutput,
      clientId,
    } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: projectId' });
    }
    if (!testCaseId || typeof testCaseId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: testCaseId' });
    }
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: title' });
    }
    if (!severity || typeof severity !== 'string' || !VALID_SEVERITIES.includes(severity.toLowerCase())) {
      return res.status(400).json({
        error: `Missing or invalid severity. Supported: ${VALID_SEVERITIES.join(', ')}`,
      });
    }

    const defect = await defectService.createDefectFromTest({
      projectId,
      testCaseId,
      title,
      description,
      severity: severity.toLowerCase() as DefectSeverityInput,
      executionResultId,
      testOutput,
      clientId,
    });

    return res.status(201).json(defect);
  } catch (error) {
    return handleError(error, res, 'Failed to create defect');
  }
});

/**
 * GET /api/defects?projectId=...&status=...&severity=...
 * List defects for a project.
 */
defectsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, status, severity, clientId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const defects = await defectService.listDefects(
      projectId,
      {
        status: status ? (String(status) as any) : undefined,
        severity: severity ? (String(severity) as any) : undefined,
      },
      clientId ? String(clientId) : undefined
    );

    return res.status(200).json(defects);
  } catch (error) {
    return handleError(error, res, 'Failed to list defects');
  }
});

/**
 * GET /api/defects/:defectId
 * Fetch a single defect (multi-tenant isolation via its project's clientId).
 */
defectsRouter.get('/:defectId', async (req: Request, res: Response) => {
  try {
    const { defectId } = req.params;
    const { clientId } = req.query;

    const defect = await prisma.defect.findUnique({
      where: { id: defectId },
      include: { project: true },
    });

    if (!defect) {
      return res.status(404).json({ error: 'Defect not found' });
    }

    if (clientId && defect.project?.clientId !== String(clientId)) {
      logger.warn(`Unauthorized access to defect ${defectId}`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    return res.status(200).json(defect);
  } catch (error) {
    return handleError(error, res, 'Failed to fetch defect');
  }
});

/**
 * PATCH /api/defects/:defectId/sync
 * Pull the latest status from QMetry into the local record.
 */
defectsRouter.patch('/:defectId/sync', async (req: Request, res: Response) => {
  try {
    const { defectId } = req.params;
    const { clientId } = req.body;

    const defect = await defectService.syncDefectStatus(
      defectId,
      clientId ? String(clientId) : undefined
    );

    return res.status(200).json(defect);
  } catch (error) {
    if (error instanceof Error && /not linked to QMetry/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    return handleError(error, res, 'Failed to sync defect');
  }
});

export default defectsRouter;
