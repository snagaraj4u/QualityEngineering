'use client';

import React from 'react';

export interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Tailwind text color class for the value, e.g. "text-green-600". */
  accentClassName?: string;
}

/**
 * A single headline metric tile (title + big value + optional subtitle/icon).
 */
export function MetricsCard({ title, value, subtitle, icon, accentClassName }: MetricsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {icon ? <span className="text-gray-400">{icon}</span> : null}
      </div>
      <span className={`text-3xl font-bold ${accentClassName ?? 'text-gray-900'}`}>{value}</span>
      {subtitle ? <span className="text-xs text-gray-400">{subtitle}</span> : null}
    </div>
  );
}

export default MetricsCard;
