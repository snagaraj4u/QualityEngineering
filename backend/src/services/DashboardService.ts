import { prisma } from '../utils/db';
import logger from '../utils/logger';

/**
 * Phase 8: Dashboard metrics & trends aggregation.
 *
 * Adapted to the real schema (the plan doc drifted):
 * - TestCase has no `framework`/`clientId`; test cases are scoped to a client
 *   through `project.clientId`, and framework distribution is derived from
 *   ExecutionResult.framework (executions carry the framework, test cases don't).
 * - Defect has no `clientId`; defects are scoped through `project.clientId`.
 * - status/severity are Prisma enums (uppercase), so defect summary keys map to
 *   OPEN / IN_PROGRESS / RESOLVED.
 */

export interface TopFailingTest {
  testCaseId: string;
  name: string;
  failureCount: number;
  lastFailed: Date;
}

export interface MetricsData {
  totalTestCases: number;
  totalExecutions: number;
  passRate: number;
  failRate: number;
  averageDuration: number;
  topFailingTests: TopFailingTest[];
  frameworkDistribution: Record<string, number>;
  defectSummary: {
    open: number;
    inProgress: number;
    resolved: number;
  };
}

export interface TrendData {
  date: string;
  passCount: number;
  failCount: number;
  totalTests: number;
  executionTime: number;
  passRate: number;
}

export class DashboardService {
  /**
   * Aggregate headline metrics for a client (optionally a single project).
   */
  async getMetrics(clientId: string, projectId?: string, days: number = 30): Promise<MetricsData> {
    try {
      const startDate = this.sinceDate(days);

      const totalTestCases = await prisma.testCase.count({
        where: {
          project: { clientId },
          ...(projectId && { projectId }),
        },
      });

      const executions = await prisma.executionResult.findMany({
        where: {
          clientId,
          createdAt: { gte: startDate },
          ...(projectId && { projectId }),
        },
      });

      const defects = await prisma.defect.findMany({
        where: {
          project: { clientId },
          ...(projectId && { projectId }),
        },
        include: { testCase: true },
      });

      const totalPassed = executions.reduce((sum, e) => sum + (e.passed || 0), 0);
      const totalFailed = executions.reduce((sum, e) => sum + (e.failed || 0), 0);
      const totalTests = totalPassed + totalFailed;
      const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
      const failRate = totalTests > 0 ? (totalFailed / totalTests) * 100 : 0;
      const averageDuration =
        executions.length > 0
          ? executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length
          : 0;

      const frameworkDistribution: Record<string, number> = {};
      executions.forEach((e) => {
        if (e.framework) {
          frameworkDistribution[e.framework] = (frameworkDistribution[e.framework] || 0) + 1;
        }
      });

      const defectSummary = {
        open: defects.filter((d) => d.status === 'OPEN').length,
        inProgress: defects.filter((d) => d.status === 'IN_PROGRESS').length,
        resolved: defects.filter((d) => d.status === 'RESOLVED').length,
      };

      const topFailingTests = this.aggregateFailures(defects, 5);

      logger.info('Dashboard metrics retrieved', {
        clientId,
        totalTestCases,
        passRate: passRate.toFixed(2),
      });

      return {
        totalTestCases,
        totalExecutions: executions.length,
        passRate,
        failRate,
        averageDuration,
        topFailingTests,
        frameworkDistribution,
        defectSummary,
      };
    } catch (error) {
      logger.error(
        `Failed to get dashboard metrics: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Daily pass/fail trend over the requested window.
   */
  async getTrends(clientId: string, projectId?: string, days: number = 30): Promise<TrendData[]> {
    try {
      const startDate = this.sinceDate(days);

      const executions = await prisma.executionResult.findMany({
        where: {
          clientId,
          createdAt: { gte: startDate },
          ...(projectId && { projectId }),
        },
        orderBy: { createdAt: 'asc' },
      });

      const byDate: Record<string, TrendData> = {};

      executions.forEach((exec) => {
        const dateKey = exec.createdAt.toISOString().split('T')[0];
        if (!byDate[dateKey]) {
          byDate[dateKey] = {
            date: dateKey,
            passCount: 0,
            failCount: 0,
            totalTests: 0,
            executionTime: 0,
            passRate: 0,
          };
        }
        byDate[dateKey].passCount += exec.passed || 0;
        byDate[dateKey].failCount += exec.failed || 0;
        byDate[dateKey].executionTime += exec.duration || 0;
      });

      return Object.values(byDate)
        .map((day) => {
          day.totalTests = day.passCount + day.failCount;
          day.passRate = day.totalTests > 0 ? (day.passCount / day.totalTests) * 100 : 0;
          return day;
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error(
        `Failed to get dashboard trends: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Tests with the most associated defects.
   */
  async getTopFailingTests(
    clientId: string,
    limit: number = 10,
    projectId?: string
  ): Promise<TopFailingTest[]> {
    try {
      const defects = await prisma.defect.findMany({
        where: {
          project: { clientId },
          ...(projectId && { projectId }),
        },
        include: { testCase: true },
      });

      return this.aggregateFailures(defects, limit);
    } catch (error) {
      logger.error(
        `Failed to get top failing tests: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private aggregateFailures(
    defects: Array<{ testCaseId: string; createdAt: Date; testCase?: { name: string } | null }>,
    limit: number
  ): TopFailingTest[] {
    const failures: Record<string, TopFailingTest> = {};

    defects.forEach((defect) => {
      const existing = failures[defect.testCaseId];
      if (!existing) {
        failures[defect.testCaseId] = {
          testCaseId: defect.testCaseId,
          name: defect.testCase?.name || defect.testCaseId,
          failureCount: 1,
          lastFailed: defect.createdAt,
        };
      } else {
        existing.failureCount += 1;
        if (defect.createdAt > existing.lastFailed) {
          existing.lastFailed = defect.createdAt;
        }
      }
    });

    return Object.values(failures)
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, limit);
  }

  private sinceDate(days: number): Date {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return startDate;
  }
}
