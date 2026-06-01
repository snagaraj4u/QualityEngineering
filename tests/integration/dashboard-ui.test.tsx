/**
 * @jest-environment jsdom
 *
 * Tests for the Phase 8 dashboard UI components. Runs in jsdom (per-file
 * docblock) like the video-processing suite.
 *
 * recharts is mocked: it pulls in ESM-only d3 subpackages that jest's default
 * transformIgnorePatterns won't transpile, and we assert on the components'
 * own headings / accessible summaries rather than SVG internals.
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('recharts', () => {
  const React = require('react');
  const Passthrough = ({ children }: any) => React.createElement('div', null, children);
  // Any named export (LineChart, Pie, XAxis, ResponsiveContainer, ...) becomes
  // a passthrough that just renders its children.
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        return Passthrough;
      },
    }
  );
});

import { MetricsCard } from '../../apps/web/components/Dashboard/MetricsCard';
import { DefectStatus } from '../../apps/web/components/Dashboard/DefectStatus';
import { TestExecutionChart } from '../../apps/web/components/Dashboard/TestExecutionChart';
import { TrendChart } from '../../apps/web/components/Dashboard/TrendChart';
import { DashboardView } from '../../apps/web/components/Dashboard/DashboardView';
import type { MetricsData, TrendData } from '../../apps/web/lib/types/dashboard';

describe('MetricsCard', () => {
  it('renders the title, value and subtitle', () => {
    render(<MetricsCard title="Pass Rate" value="65%" subtitle="last 30 days" />);
    expect(screen.getByText('Pass Rate')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('last 30 days')).toBeInTheDocument();
  });
});

describe('DefectStatus', () => {
  it('renders open / in-progress / resolved counts and a total', () => {
    render(<DefectStatus summary={{ open: 3, inProgress: 2, resolved: 5 }} />);
    expect(screen.getByText(/open/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/resolved/i)).toBeInTheDocument();
    // total = 10
    expect(screen.getByTestId('defect-total')).toHaveTextContent('10');
  });
});

describe('TestExecutionChart', () => {
  it('renders an accessible legend with the counts', () => {
    render(<TestExecutionChart passed={8} failed={2} skipped={1} />);
    expect(screen.getByText(/passed/i)).toBeInTheDocument();
    expect(screen.getByTestId('exec-passed')).toHaveTextContent('8');
    expect(screen.getByTestId('exec-failed')).toHaveTextContent('2');
    expect(screen.getByTestId('exec-skipped')).toHaveTextContent('1');
  });

  it('shows an empty state when there is no execution data', () => {
    render(<TestExecutionChart passed={0} failed={0} skipped={0} />);
    expect(screen.getByText(/no execution data/i)).toBeInTheDocument();
  });
});

describe('TrendChart', () => {
  const trends: TrendData[] = [
    { date: '2026-05-30', passCount: 10, failCount: 5, totalTests: 15, executionTime: 2000, passRate: 66.6 },
    { date: '2026-05-31', passCount: 10, failCount: 0, totalTests: 10, executionTime: 1000, passRate: 100 },
  ];

  it('renders a heading when data is present', () => {
    render(<TrendChart data={trends} />);
    expect(screen.getByRole('heading', { name: /pass rate trend/i })).toBeInTheDocument();
  });

  it('shows an empty state when there is no trend data', () => {
    render(<TrendChart data={[]} />);
    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });
});

describe('DashboardView', () => {
  const metrics: MetricsData = {
    totalTestCases: 12,
    totalExecutions: 4,
    passRate: 65,
    failRate: 35,
    averageDuration: 2000,
    topFailingTests: [
      { testCaseId: 't1', name: 'Login flow', failureCount: 3, lastFailed: '2026-05-31T00:00:00.000Z' },
    ],
    frameworkDistribution: { jest: 2, cucumber: 2 },
    defectSummary: { open: 3, inProgress: 2, resolved: 5 },
  };

  const trends: TrendData[] = [
    { date: '2026-05-30', passCount: 20, failCount: 10, totalTests: 30, executionTime: 5000, passRate: 66.6 },
  ];

  function mockFetchOk() {
    (global as any).fetch = jest.fn((url: string) => {
      const body = url.includes('/trends') ? trends : metrics;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state then renders metrics for the client', async () => {
    mockFetchOk();
    render(<DashboardView clientId="c1" />);

    // Loading first
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Then the metrics resolve
    await waitFor(() => {
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    // Calls both endpoints, scoped to the client
    const calls = ((global as any).fetch as jest.Mock).mock.calls.map((c: any[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes('/api/dashboard/metrics') && u.includes('clientId=c1'))).toBe(true);
    expect(calls.some((u: string) => u.includes('/api/dashboard/trends') && u.includes('clientId=c1'))).toBe(true);

    // Composed children render
    expect(screen.getByText(/total test cases/i)).toBeInTheDocument();
    expect(screen.getByText(/login flow/i)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
    render(<DashboardView clientId="c1" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument();
    });
  });
});
