'use client';

import React from 'react';

export interface DefectStatusProps {
  summary: {
    open: number;
    inProgress: number;
    resolved: number;
  };
}

const ROWS: Array<{ key: keyof DefectStatusProps['summary']; label: string; dot: string }> = [
  { key: 'open', label: 'Open', dot: 'bg-red-500' },
  { key: 'inProgress', label: 'In Progress', dot: 'bg-amber-500' },
  { key: 'resolved', label: 'Resolved', dot: 'bg-green-500' },
];

/**
 * Defect overview: counts by status plus a total.
 */
export function DefectStatus({ summary }: DefectStatusProps) {
  const total = summary.open + summary.inProgress + summary.resolved;

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Defects</h3>
        <span data-testid="defect-total" className="text-sm font-bold text-gray-900">
          {total}
        </span>
      </div>
      <ul className="space-y-2">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${row.dot}`} aria-hidden="true" />
              {row.label}
            </span>
            <span className="font-medium text-gray-900">{summary[row.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DefectStatus;
