import { DefectIntegrationService } from '../../backend/src/services/DefectIntegrationService';
import { ApiError } from '../../backend/src/utils/ApiError';
import type { QMetryService } from '../../backend/src/services/QMetryService';

// logger is a default export; without __esModule:true ts-jest interop double-wraps
// it and logger.error becomes undefined (see qe-jest-test-gotchas memory).
jest.mock('../../backend/src/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Factory-mock the prisma boundary so no live database is needed.
jest.mock('../../backend/src/utils/db', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    defect: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('DefectIntegrationService', () => {
  let service: DefectIntegrationService;
  let mockCreateDefect: jest.Mock;
  let mockGetDefect: jest.Mock;
  let mockPrisma: {
    project: { findUnique: jest.Mock };
    defect: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Inject a fake QMetryService so we don't touch the network or env config.
    mockCreateDefect = jest.fn();
    mockGetDefect = jest.fn();
    const fakeQmetry = {
      createDefect: mockCreateDefect,
      getDefect: mockGetDefect,
    } as unknown as QMetryService;

    service = new DefectIntegrationService(fakeQmetry);

    mockPrisma = require('../../backend/src/utils/db').prisma;

    // Default: project exists and belongs to client "c1".
    mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', clientId: 'c1' });

    // Default: persisting a defect echoes the data back with a generated id.
    mockPrisma.defect.create.mockImplementation(async ({ data }: any) => ({
      id: 'defect-1',
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      qmetrySyncedAt: null,
      ...data,
    }));
  });

  describe('createDefectFromTest', () => {
    it('should create a defect in QMetry from a failed test and persist it locally', async () => {
      mockCreateDefect.mockResolvedValue({ defectId: 'QM-123' });

      const defect = await service.createDefectFromTest({
        projectId: 'p1',
        testCaseId: 'test-123',
        title: 'Login button not clickable',
        description: 'User cannot click login button on homepage',
        severity: 'high',
        testOutput: 'Element not visible after 5 seconds',
      });

      // Pushed to QMetry with mapped priority/status
      expect(mockCreateDefect).toHaveBeenCalledTimes(1);
      const qmetryArg = mockCreateDefect.mock.calls[0][0];
      expect(qmetryArg.title).toBe('Login button not clickable');
      expect(qmetryArg.priority).toBe('High');
      expect(qmetryArg.status).toBe('OPEN');

      // Persisted with the external QMetry id and normalized enum values
      expect(mockPrisma.defect.create).toHaveBeenCalledTimes(1);
      const createData = mockPrisma.defect.create.mock.calls[0][0].data;
      expect(createData.qmetryId).toBe('QM-123');
      expect(createData.severity).toBe('HIGH');
      expect(createData.status).toBe('OPEN');
      expect(createData.testCaseId).toBe('test-123');
      expect(createData.projectId).toBe('p1');

      // Returned shape
      expect(defect.id).toBe('defect-1');
      expect(defect.qmetryId).toBe('QM-123');
      expect(defect.status).toBe('OPEN');
    });

    it('should link the test case to the created defect', async () => {
      mockCreateDefect.mockResolvedValue({ id: 'QM-456' });

      const defect = await service.createDefectFromTest({
        projectId: 'p1',
        testCaseId: 'test-456',
        title: 'API timeout',
        description: 'GET /users endpoint timing out',
        severity: 'critical',
      });

      expect(defect.testCaseId).toBe('test-456');
      // QMetry response used `id` rather than `defectId` — still captured
      expect(defect.qmetryId).toBe('QM-456');
    });

    it('should enforce multi-tenant isolation when clientId does not own the project', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ id: 'p1', clientId: 'other-client' });

      await expect(
        service.createDefectFromTest({
          projectId: 'p1',
          testCaseId: 'test-789',
          title: 'Test',
          description: 'Test',
          severity: 'medium',
          clientId: 'c1',
        })
      ).rejects.toMatchObject({ code: 'ISOLATION_VIOLATION', statusCode: 403 });

      // Must not push to QMetry or persist when isolation fails
      expect(mockCreateDefect).not.toHaveBeenCalled();
      expect(mockPrisma.defect.create).not.toHaveBeenCalled();
    });

    it('should reject when the target project does not exist', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.createDefectFromTest({
          projectId: 'missing',
          testCaseId: 'test-1',
          title: 'Test',
          description: 'Test',
          severity: 'low',
        })
      ).rejects.toBeInstanceOf(ApiError);

      expect(mockPrisma.defect.create).not.toHaveBeenCalled();
    });

    it('should propagate QMetry API errors and not persist a defect', async () => {
      mockCreateDefect.mockRejectedValue(new Error('Failed to create defect: 500'));

      await expect(
        service.createDefectFromTest({
          projectId: 'p1',
          testCaseId: 'test-1',
          title: 'Test',
          description: 'Test',
          severity: 'medium',
        })
      ).rejects.toThrow('Failed to create defect');

      expect(mockPrisma.defect.create).not.toHaveBeenCalled();
    });
  });

  describe('syncDefectStatus', () => {
    it('should pull the latest status from QMetry and update the local record', async () => {
      mockPrisma.defect.findUnique.mockResolvedValue({
        id: 'defect-1',
        qmetryId: 'QM-123',
        status: 'OPEN',
        project: { id: 'p1', clientId: 'c1' },
      });
      mockGetDefect.mockResolvedValue({ status: 'Resolved' });
      mockPrisma.defect.update.mockImplementation(async ({ data }: any) => ({
        id: 'defect-1',
        qmetryId: 'QM-123',
        testCaseId: 'test-1',
        projectId: 'p1',
        severity: 'HIGH',
        title: 'x',
        description: null,
        createdAt: new Date(),
        ...data,
      }));

      const result = await service.syncDefectStatus('defect-1');

      expect(mockGetDefect).toHaveBeenCalledWith('QM-123');
      const updateArg = mockPrisma.defect.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'defect-1' });
      expect(updateArg.data.status).toBe('RESOLVED');
      expect(updateArg.data.qmetrySyncedAt).toBeInstanceOf(Date);
      expect(result.status).toBe('RESOLVED');
    });

    it('should throw when the defect is not linked to QMetry', async () => {
      mockPrisma.defect.findUnique.mockResolvedValue({
        id: 'defect-1',
        qmetryId: null,
        status: 'OPEN',
        project: { id: 'p1', clientId: 'c1' },
      });

      await expect(service.syncDefectStatus('defect-1')).rejects.toThrow(/not linked to QMetry/i);
      expect(mockGetDefect).not.toHaveBeenCalled();
    });

    it('should enforce multi-tenant isolation on sync', async () => {
      mockPrisma.defect.findUnique.mockResolvedValue({
        id: 'defect-1',
        qmetryId: 'QM-123',
        status: 'OPEN',
        project: { id: 'p1', clientId: 'other-client' },
      });

      await expect(service.syncDefectStatus('defect-1', 'c1')).rejects.toMatchObject({
        code: 'ISOLATION_VIOLATION',
        statusCode: 403,
      });
      expect(mockGetDefect).not.toHaveBeenCalled();
    });
  });

  describe('listDefects', () => {
    it('should list defects for a project with optional filters', async () => {
      const rows = [{ id: 'defect-1' }, { id: 'defect-2' }];
      mockPrisma.defect.findMany.mockResolvedValue(rows);

      const result = await service.listDefects('p1', { status: 'OPEN', severity: 'HIGH' });

      expect(mockPrisma.defect.findMany).toHaveBeenCalledTimes(1);
      const arg = mockPrisma.defect.findMany.mock.calls[0][0];
      expect(arg.where.projectId).toBe('p1');
      expect(arg.where.status).toBe('OPEN');
      expect(arg.where.severity).toBe('HIGH');
      expect(result).toBe(rows);
    });
  });
});
