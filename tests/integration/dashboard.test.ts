import request from 'supertest';
import express, { Express } from 'express';

/**
 * HTTP-layer integration for the dashboard flow: real dashboardRouter + real
 * DashboardService with prisma mocked. Validates aggregation, query scoping,
 * required params and error mapping.
 */

jest.mock('../../backend/src/utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../backend/src/utils/db', () => ({
  prisma: {
    testCase: { count: jest.fn() },
    executionResult: { findMany: jest.fn() },
    defect: { findMany: jest.fn() },
  },
}));

import dashboardRouter from '../../backend/src/routes/dashboard';

const prisma = require('../../backend/src/utils/db').prisma as {
  testCase: { count: jest.Mock };
  executionResult: { findMany: jest.Mock };
  defect: { findMany: jest.Mock };
};

function makeApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRouter);
  return app;
}

describe('Dashboard API (integration)', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
    prisma.testCase.count.mockResolvedValue(0);
    prisma.executionResult.findMany.mockResolvedValue([]);
    prisma.defect.findMany.mockResolvedValue([]);
  });

  describe('GET /api/dashboard/metrics', () => {
    it('returns aggregated metrics for a client', async () => {
      prisma.testCase.count.mockResolvedValue(7);
      prisma.executionResult.findMany.mockResolvedValue([
        { passed: 9, failed: 1, skipped: 0, duration: 1000, framework: 'jest', createdAt: new Date() },
      ]);
      prisma.defect.findMany.mockResolvedValue([
        { testCaseId: 't1', status: 'OPEN', createdAt: new Date(), testCase: { name: 'A' } },
      ]);

      const res = await request(app).get('/api/dashboard/metrics').query({ clientId: 'c1' });

      expect(res.status).toBe(200);
      expect(res.body.totalTestCases).toBe(7);
      expect(res.body.passRate).toBeCloseTo(90, 5);
      expect(res.body.defectSummary).toEqual({ open: 1, inProgress: 0, resolved: 0 });
      expect(res.body.frameworkDistribution).toEqual({ jest: 1 });

      // Scoped to the client through the project relation.
      expect(prisma.testCase.count.mock.calls[0][0].where.project.clientId).toBe('c1');
    });

    it('returns 400 when clientId is missing', async () => {
      const res = await request(app).get('/api/dashboard/metrics');
      expect(res.status).toBe(400);
    });

    it('returns 500 when the data layer fails', async () => {
      prisma.testCase.count.mockRejectedValue(new Error('db down'));
      const res = await request(app).get('/api/dashboard/metrics').query({ clientId: 'c1' });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/dashboard/trends', () => {
    it('returns per-day trend buckets', async () => {
      prisma.executionResult.findMany.mockResolvedValue([
        { passed: 4, failed: 1, duration: 500, createdAt: new Date('2026-05-30T08:00:00Z') },
        { passed: 6, failed: 4, duration: 1500, createdAt: new Date('2026-05-30T18:00:00Z') },
      ]);

      const res = await request(app).get('/api/dashboard/trends').query({ clientId: 'c1' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].date).toBe('2026-05-30');
      expect(res.body[0].passCount).toBe(10);
      expect(res.body[0].failCount).toBe(5);
    });

    it('returns 400 when clientId is missing', async () => {
      const res = await request(app).get('/api/dashboard/trends');
      expect(res.status).toBe(400);
    });
  });
});
