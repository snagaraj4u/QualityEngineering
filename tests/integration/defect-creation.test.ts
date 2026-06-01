import request from 'supertest';
import express, { Express } from 'express';

/**
 * HTTP-layer integration for the defect flow: real defectsRouter + real
 * DefectIntegrationService, with the persistence (prisma) and the external
 * QMetry client mocked. This exercises route validation, the service logic,
 * status-code mapping and multi-tenant isolation in one pass.
 */

jest.mock('../../backend/src/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../backend/src/utils/db', () => ({
  prisma: {
    project: { findUnique: jest.fn() },
    defect: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../backend/src/services/QMetryService', () => {
  const createDefect = jest.fn();
  const getDefect = jest.fn();
  return {
    __esModule: true,
    QMetryService: jest.fn().mockImplementation(() => ({ createDefect, getDefect })),
  };
});

import defectsRouter from '../../backend/src/routes/defects';
import { QMetryService } from '../../backend/src/services/QMetryService';

const prisma = require('../../backend/src/utils/db').prisma as {
  project: { findUnique: jest.Mock };
  defect: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; findMany: jest.Mock };
};

// All mocked QMetryService instances share these fns.
const qmetry = new QMetryService({} as any) as unknown as {
  createDefect: jest.Mock;
  getDefect: jest.Mock;
};

function makeApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/defects', defectsRouter);
  return app;
}

describe('Defect creation API (integration)', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();

    prisma.project.findUnique.mockResolvedValue({ id: 'p1', clientId: 'c1' });
    prisma.defect.create.mockImplementation(async ({ data }: any) => ({
      id: 'defect-1',
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      ...data,
    }));
  });

  describe('POST /api/defects', () => {
    it('creates a defect from a failed test and returns 201', async () => {
      qmetry.createDefect.mockResolvedValue({ defectId: 'QM-1' });

      const res = await request(app).post('/api/defects').send({
        projectId: 'p1',
        testCaseId: 'tc-1',
        title: 'Login broken',
        description: 'cannot log in',
        severity: 'high',
        clientId: 'c1',
      });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('defect-1');
      expect(res.body.qmetryId).toBe('QM-1');
      expect(qmetry.createDefect).toHaveBeenCalledTimes(1);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/defects')
        .send({ projectId: 'p1', title: 'x', severity: 'high' }); // no testCaseId

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(qmetry.createDefect).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid severity', async () => {
      const res = await request(app).post('/api/defects').send({
        projectId: 'p1',
        testCaseId: 'tc-1',
        title: 'x',
        severity: 'catastrophic',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/severity/i);
    });

    it('returns 403 (Unauthorized) on multi-tenant isolation violation', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'p1', clientId: 'owner' });

      const res = await request(app).post('/api/defects').send({
        projectId: 'p1',
        testCaseId: 'tc-1',
        title: 'x',
        severity: 'low',
        clientId: 'intruder',
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Unauthorized');
      expect(qmetry.createDefect).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/defects', () => {
    it('lists defects for a project', async () => {
      prisma.defect.findMany.mockResolvedValue([{ id: 'defect-1' }, { id: 'defect-2' }]);

      const res = await request(app).get('/api/defects').query({ projectId: 'p1' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      const arg = prisma.defect.findMany.mock.calls[0][0];
      expect(arg.where.projectId).toBe('p1');
    });

    it('returns 400 without projectId', async () => {
      const res = await request(app).get('/api/defects');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/defects/:defectId', () => {
    it('returns the defect', async () => {
      prisma.defect.findUnique.mockResolvedValue({
        id: 'defect-1',
        project: { id: 'p1', clientId: 'c1' },
      });

      const res = await request(app).get('/api/defects/defect-1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('defect-1');
    });

    it('returns 404 when not found', async () => {
      prisma.defect.findUnique.mockResolvedValue(null);
      const res = await request(app).get('/api/defects/missing');
      expect(res.status).toBe(404);
    });

    it('returns 403 when clientId does not own the defect', async () => {
      prisma.defect.findUnique.mockResolvedValue({
        id: 'defect-1',
        project: { id: 'p1', clientId: 'owner' },
      });

      const res = await request(app).get('/api/defects/defect-1').query({ clientId: 'intruder' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('PATCH /api/defects/:defectId/sync', () => {
    it('syncs status from QMetry', async () => {
      prisma.defect.findUnique.mockResolvedValue({
        id: 'defect-1',
        qmetryId: 'QM-1',
        status: 'OPEN',
        project: { id: 'p1', clientId: 'c1' },
      });
      qmetry.getDefect.mockResolvedValue({ status: 'Resolved' });
      prisma.defect.update.mockImplementation(async ({ data }: any) => ({
        id: 'defect-1',
        qmetryId: 'QM-1',
        testCaseId: 'tc-1',
        projectId: 'p1',
        severity: 'HIGH',
        title: 'x',
        description: null,
        createdAt: new Date(),
        ...data,
      }));

      const res = await request(app).patch('/api/defects/defect-1/sync').send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RESOLVED');
      expect(qmetry.getDefect).toHaveBeenCalledWith('QM-1');
    });

    it('returns 400 when the defect is not linked to QMetry', async () => {
      prisma.defect.findUnique.mockResolvedValue({
        id: 'defect-1',
        qmetryId: null,
        status: 'OPEN',
        project: { id: 'p1', clientId: 'c1' },
      });

      const res = await request(app).patch('/api/defects/defect-1/sync').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not linked to QMetry/i);
    });
  });
});
