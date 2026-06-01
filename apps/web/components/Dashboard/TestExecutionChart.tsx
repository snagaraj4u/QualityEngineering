'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export interface TestExecutionChartProps {
  passed: number;
  failed: number;
  skipped?: number;
}

const COLORS = {
  passed: '#16a34a',
  failed: '#dc2626',
  skipped: '#d1d5db',
};

/**
 * Pass/fail/skip breakdown for executions in the window. The recharts pie is
 * the visual; an accessible legend list carries the numbers (and is what the
 * tests assert on, since recharts is mocked there).
 */
export function TestExecutionChart({ passed, failed, skipped = 0 }: TestExecutionChartProps) {
  const total = passed + failed + skipped;

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Execution Status</h3>
        <p className="text-sm text-gray-400">No execution data for this period.</p>
      </div>
    );
  }

  const data = [
    { name: 'Passed', value: passed, color: COLORS.passed },
    { name: 'Failed', value: failed, color: COLORS.failed },
    { name: 'Skipped', value: skipped, color: COLORS.skipped },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Execution Status</h3>
      <PieChart width={240} height={200}>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
      <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <li>
          <span className="block text-gray-500">Passed</span>
          <span data-testid="exec-passed" className="font-bold text-green-600">
            {passed}
          </span>
        </li>
        <li>
          <span className="block text-gray-500">Failed</span>
          <span data-testid="exec-failed" className="font-bold text-red-600">
            {failed}
          </span>
        </li>
        <li>
          <span className="block text-gray-500">Skipped</span>
          <span data-testid="exec-skipped" className="font-bold text-gray-500">
            {skipped}
          </span>
        </li>
      </ul>
    </div>
  );
}

export default TestExecutionChart;
