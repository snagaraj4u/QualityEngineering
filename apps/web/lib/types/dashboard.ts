/**
 * Shapes returned by the backend /api/dashboard endpoints (DashboardService).
 * Kept in the web app so components don't reach across the package boundary
 * into backend/src.
 */

export interface TopFailingTest {
  testCaseId: string;
  name: string;
  failureCount: number;
  lastFailed: string | Date;
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
