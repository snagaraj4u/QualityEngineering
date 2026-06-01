'use client';

import React, { useEffect, useState } from 'react';
import { MetricsCard } from './MetricsCard';
import { DefectStatus } from './DefectStatus';
import { TestExecutionChart } from './TestExecutionChart';
import { TrendChart } from './TrendChart';
import type { MetricsData, TrendData } from '../../lib/types/dashboard';

export interface DashboardViewProps {
  clientId: string;
  projectId?: string;
  days?: number;
}

/**
 * Top-level dashboard: fetches metrics + trends from the backend and composes
 * the metric cards, charts, defect status and top-failing list.
 */
export function DashboardView({ clientId, projectId, days = 30 }: DashboardViewProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const params = new URLSearchParams({ clientId, days: String(days) });
        if (projectId) {
          params.set('projectId', projectId);
        }
        const qs = params.toString();

        const [metricsRes, trendsRes] = await Promise.all([
          fetch(`${base}/api/dashboard/metrics?${qs}`),
          fetch(`${base}/api/dashboard/trends?${qs}`),
        ]);

        if (!metricsRes.ok || !trendsRes.ok) {
          throw new Error('Dashboard request failed');
        }

        const metricsData: MetricsData = await metricsRes.json();
        const trendsData: TrendData[] = await trendsRes.json();

        if (!cancelled) {
          setMetrics(metricsData);
          setTrends(trendsData);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clientId, projectId, days]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading dashboard…</div>;
  }

  if (error || !metrics) {
    return <div className="p-8 text-red-600">Failed to load dashboard.</div>;
  }

  // Raw pass/fail counts over the window come from the trend buckets.
  const passed = trends.reduce((sum, d) => sum + d.passCount, 0);
  const failed = trends.reduce((sum, d) => sum + d.failCount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Pass Rate"
          value={`${metrics.passRate.toFixed(0)}%`}
          subtitle={`last ${days} days`}
          accentClassName="text-green-600"
        />
        <MetricsCard title="Total Executions" value={metrics.totalExecutions} />
        <MetricsCard title="Total Test Cases" value={metrics.totalTestCases} />
        <MetricsCard title="Avg Duration" value={`${Math.round(metrics.averageDuration)} ms`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TrendChart data={trends} />
        </div>
        <TestExecutionChart passed={passed} failed={failed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DefectStatus summary={metrics.defectSummary} />
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Failing Tests</h3>
          {metrics.topFailingTests.length === 0 ? (
            <p className="text-sm text-gray-400">No failing tests.</p>
          ) : (
            <ul className="divide-y">
              {metrics.topFailingTests.map((t) => (
                <li key={t.testCaseId} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-700">{t.name}</span>
                  <span className="font-medium text-red-600">{t.failureCount}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
