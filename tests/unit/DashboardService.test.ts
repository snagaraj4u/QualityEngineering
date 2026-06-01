import { DashboardService } from '../../backend/src/services/DashboardService';

jest.mock('../../backend/src/utils/logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../backend/src/utils/db', () => ({
  prisma: {
    testCase: { count: jest.fn() },
    executionResult: { findMany: jest.fn() },
    defect: { findMany: jest.fn() },
  },
}));

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrisma: {
    testCase: { count: jest.Mock };
    executionResult: { findMany: jest.Mock };
    defect: { findMany: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService();
    mockPrisma = require('../../backend/src/utils/db').prisma;

    // Sensible empty defaults; individual tests override.
    mockPrisma.testCase.count.mockResolvedValue(0);
    mockPrisma.executionResult.findMany.mockResolvedValue([]);
    mockPrisma.defect.findMany.mockResolvedValue([]);
  });

  describe('getMetrics', () => {
    it('should compute pass/fail rate, average duration, and framework distribution from executions', async () => {
      mockPrisma.testCase.count.mockResolvedValue(12);
      mockPrisma.executionResult.findMany.mockResolvedValue([
        { passed: 8, failed: 2, skipped: 0, duration: 1000, framework: 'jest', createdAt: new Date() },
        { passed: 5, failed: 5, skipped: 0, duration: 3000, framework: 'cucumber', createdAt: new Date() },
      ]);

      const metrics = await service.getMetrics('c1');

      expect(metrics.totalTestCases).toBe(12);
      expect(metrics.totalExecutions).toBe(2);
      // 13 passed + 7 failed = 20 total
      expect(metrics.passRate).toBeCloseTo((13 / 20) * 100, 5);
      expect(metrics.failRate).toBeCloseTo((7 / 20) * 100, 5);
      expect(metrics.averageDuration).toBe(2000);
      expect(metrics.frameworkDistribution).toEqual({ jest: 1, cucumber: 1 });
    });

    it('should summarize defects by enum status and build topFailingTests', async () => {
      const d1 = new Date('2026-05-30T00:00:00.000Z');
      const d2 = new Date('2026-05-31T00:00:00.000Z');
      const d3 = new Date('2026-05-29T00:00:00.000Z');
      mockPrisma.defect.findMany.mockResolvedValue([
        { testCaseId: 't1', status: 'OPEN', createdAt: d1, testCase: { name: 'Login' } },
        { testCaseId: 't1', status: 'RESOLVED', createdAt: d2, testCase: { name: 'Login' } },
        { testCaseId: 't2', status: 'IN_PROGRESS', createdAt: d3, testCase: { name: 'Search' } },
      ]);

      const metrics = await service.getMetrics('c1');

      expect(metrics.defectSummary).toEqual({ open: 1, inProgress: 1, resolved: 1 });
      expect(metrics.topFailingTests[0]).toMatchObject({
        testCaseId: 't1',
        name: 'Login',
        failureCount: 2,
        lastFailed: d2,
      });
    });

    it('should scope queries to the client (via project relation) and project', async () => {
      await service.getMetrics('c1', 'p1');

      const tcArg = mockPrisma.testCase.count.mock.calls[0][0];
      expect(tcArg.where.project.clientId).toBe('c1');
      expect(tcArg.where.projectId).toBe('p1');

      const exArg = mockPrisma.executionResult.findMany.mock.calls[0][0];
      expect(exArg.where.clientId).toBe('c1');
      expect(exArg.where.projectId).toBe('p1');
      expect(exArg.where.createdAt.gte).toBeInstanceOf(Date);

      const defArg = mockPrisma.defect.findMany.mock.calls[0][0];
      expect(defArg.where.project.clientId).toBe('c1');
      expect(defArg.where.projectId).toBe('p1');
    });

    it('should not divide by zero when there are no executions', async () => {
      const metrics = await service.getMetrics('c1');

      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.passRate).toBe(0);
      expect(metrics.failRate).toBe(0);
      expect(metrics.averageDuration).toBe(0);
      expect(metrics.frameworkDistribution).toEqual({});
    });
  });

  describe('getTrends', () => {
    it('should group executions by day with per-day pass/fail and pass rate', async () => {
      mockPrisma.executionResult.findMany.mockResolvedValue([
        { passed: 4, failed: 1, duration: 500, createdAt: new Date('2026-05-30T08:00:00.000Z') },
        { passed: 6, failed: 4, duration: 1500, createdAt: new Date('2026-05-30T18:00:00.000Z') },
        { passed: 10, failed: 0, duration: 2000, createdAt: new Date('2026-05-31T10:00:00.000Z') },
      ]);

      const trends = await service.getTrends('c1');

      expect(trends).toHaveLength(2);
      const day1 = trends.find((t) => t.date === '2026-05-30')!;
      expect(day1.passCount).toBe(10);
      expect(day1.failCount).toBe(5);
      expect(day1.totalTests).toBe(15);
      expect(day1.executionTime).toBe(2000);
      expect(day1.passRate).toBeCloseTo((10 / 15) * 100, 5);

      const day2 = trends.find((t) => t.date === '2026-05-31')!;
      expect(day2.passRate).toBe(100);
    });
  });

  describe('getTopFailingTests', () => {
    it('should aggregate defects by test case, sort by failure count, and respect the limit', async () => {
      mockPrisma.defect.findMany.mockResolvedValue([
        { testCaseId: 't1', createdAt: new Date('2026-05-01'), testCase: { name: 'A' } },
        { testCaseId: 't2', createdAt: new Date('2026-05-02'), testCase: { name: 'B' } },
        { testCaseId: 't2', createdAt: new Date('2026-05-03'), testCase: { name: 'B' } },
        { testCaseId: 't2', createdAt: new Date('2026-05-04'), testCase: { name: 'B' } },
        { testCaseId: 't1', createdAt: new Date('2026-05-05'), testCase: { name: 'A' } },
      ]);

      const top = await service.getTopFailingTests('c1', 1);

      expect(top).toHaveLength(1);
      expect(top[0]).toMatchObject({ testCaseId: 't2', name: 'B', failureCount: 3 });
    });
  });
});
