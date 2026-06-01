import { prisma } from '../utils/db';
import logger from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { QMetryService, QMetryConfig } from './QMetryService';

/**
 * Phase 7: Defect Management Integration.
 *
 * Wires failed tests to defect creation in QMetry and keeps a local copy in
 * the Prisma `Defect` table (which links to projectId/testCaseId/executionResultId).
 *
 * Notes on the adaptation to the real codebase:
 * - QMetryService takes a config object (built from env vars, mirroring routes/qmetry.ts).
 *   The instance is injectable so unit tests can supply a fake without env/network.
 * - `severity`/`status` are Prisma enums (DefectSeverity/DefectStatus), not free strings.
 * - Multi-tenant isolation flows through Project.clientId (Defect has no clientId column).
 */

export type DefectSeverityInput =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW';

type DefectSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type DefectStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface CreateDefectFromTestRequest {
  projectId: string;
  testCaseId: string;
  title: string;
  description?: string;
  severity: DefectSeverityInput;
  executionResultId?: string;
  testOutput?: string;
  /** When provided, the project must belong to this client (multi-tenant isolation). */
  clientId?: string;
}

export interface DefectResponse {
  id: string;
  qmetryId: string | null;
  testCaseId: string;
  projectId: string;
  status: string;
  severity: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export interface ListDefectsFilter {
  status?: DefectStatus;
  severity?: DefectSeverity;
}

const SEVERITY_TO_PRIORITY: Record<DefectSeverity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export class DefectIntegrationService {
  private qmetryService: QMetryService;

  constructor(qmetryService?: QMetryService) {
    this.qmetryService =
      qmetryService ??
      new QMetryService(DefectIntegrationService.buildConfigFromEnv());
  }

  private static buildConfigFromEnv(): QMetryConfig {
    return {
      apiKey: process.env.QMETRY_API_KEY || '',
      apiSecret: process.env.QMETRY_API_SECRET || '',
      baseUrl: process.env.QMETRY_BASE_URL || 'https://api.qmetry.com',
    };
  }

  /**
   * Create a defect in QMetry from a failed test and persist a local copy.
   */
  async createDefectFromTest(request: CreateDefectFromTestRequest): Promise<DefectResponse> {
    try {
      logger.info('Creating defect from test', {
        testCaseId: request.testCaseId,
        projectId: request.projectId,
      });

      // Multi-tenant isolation: the target project must exist and (if a clientId
      // is supplied) belong to that client.
      const project = await prisma.project.findUnique({
        where: { id: request.projectId },
      });

      if (!project) {
        throw new ApiError('Project not found', 'NOT_FOUND', 404);
      }

      if (request.clientId && project.clientId !== request.clientId) {
        logger.warn(
          `Unauthorized defect creation for project ${request.projectId} from clientId ${request.clientId}`
        );
        throw new ApiError('Multi-tenant isolation violation', 'ISOLATION_VIOLATION', 403);
      }

      const severity = this.normalizeSeverity(request.severity);

      // Push to QMetry first; if this fails we never persist a dangling local record.
      const qmetryResult = await this.qmetryService.createDefect({
        title: request.title,
        description: request.description || '',
        priority: SEVERITY_TO_PRIORITY[severity],
        status: 'OPEN',
      });

      const qmetryId = this.extractQmetryId(qmetryResult);

      const defect = await prisma.defect.create({
        data: {
          title: request.title,
          description: request.description,
          testCaseId: request.testCaseId,
          projectId: request.projectId,
          executionResultId: request.executionResultId,
          severity,
          status: 'OPEN',
          qmetryId,
        },
      });

      logger.info('Defect created', { defectId: defect.id, qmetryId });

      return this.toResponse(defect);
    } catch (error) {
      logger.error(
        `Failed to create defect from test: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Pull the latest status from QMetry and update the local record.
   */
  async syncDefectStatus(defectId: string, clientId?: string): Promise<DefectResponse> {
    try {
      const defect = await prisma.defect.findUnique({
        where: { id: defectId },
        include: { project: true },
      });

      if (!defect) {
        throw new ApiError('Defect not found', 'NOT_FOUND', 404);
      }

      if (clientId && defect.project?.clientId !== clientId) {
        logger.warn(
          `Unauthorized defect sync for ${defectId} from clientId ${clientId}`
        );
        throw new ApiError('Multi-tenant isolation violation', 'ISOLATION_VIOLATION', 403);
      }

      if (!defect.qmetryId) {
        throw new Error('Defect is not linked to QMetry');
      }

      const qmetryDefect = await this.qmetryService.getDefect(defect.qmetryId);
      const status = this.normalizeStatus(qmetryDefect?.status);

      const updated = await prisma.defect.update({
        where: { id: defectId },
        data: {
          status,
          qmetrySyncedAt: new Date(),
        },
      });

      logger.info('Defect status synced', { defectId, status });

      return this.toResponse(updated);
    } catch (error) {
      logger.error(
        `Failed to sync defect status: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * List defects for a project, optionally filtered by status/severity.
   */
  async listDefects(projectId: string, filter?: ListDefectsFilter, clientId?: string) {
    try {
      if (clientId) {
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (project && project.clientId !== clientId) {
          throw new ApiError('Multi-tenant isolation violation', 'ISOLATION_VIOLATION', 403);
        }
      }

      return await prisma.defect.findMany({
        where: {
          projectId,
          ...(filter?.status && { status: filter.status }),
          ...(filter?.severity && { severity: filter.severity }),
        },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error(
        `Failed to list defects: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private normalizeSeverity(severity: DefectSeverityInput): DefectSeverity {
    const upper = String(severity).toUpperCase();
    if (upper === 'CRITICAL' || upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
      return upper;
    }
    throw new ApiError(`Invalid severity: ${severity}`, 'VALIDATION_ERROR', 400);
  }

  private normalizeStatus(status: unknown): DefectStatus {
    const normalized = String(status ?? '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
    switch (normalized) {
      case 'OPEN':
      case 'NEW':
        return 'OPEN';
      case 'IN_PROGRESS':
      case 'INPROGRESS':
        return 'IN_PROGRESS';
      case 'RESOLVED':
      case 'FIXED':
        return 'RESOLVED';
      case 'CLOSED':
      case 'DONE':
        return 'CLOSED';
      default:
        // Unknown QMetry status — leave it open rather than guessing.
        return 'OPEN';
    }
  }

  private extractQmetryId(qmetryResult: any): string | null {
    if (!qmetryResult) {
      return null;
    }
    return (
      qmetryResult.defectId ||
      qmetryResult.id ||
      qmetryResult.key ||
      null
    );
  }

  private toResponse(defect: {
    id: string;
    qmetryId: string | null;
    testCaseId: string;
    projectId: string;
    status: string;
    severity: string;
    title: string;
    description: string | null;
    createdAt: Date;
  }): DefectResponse {
    return {
      id: defect.id,
      qmetryId: defect.qmetryId,
      testCaseId: defect.testCaseId,
      projectId: defect.projectId,
      status: defect.status,
      severity: defect.severity,
      title: defect.title,
      description: defect.description,
      createdAt: defect.createdAt.toISOString(),
    };
  }
}
