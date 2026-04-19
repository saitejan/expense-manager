/**
 * Description-level spending analysis — shows top recurring expenses
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatAmount } from '../../utils';
import { COLORS } from './ExpenseTrendChart';
import type { Expense } from '../../types';

interface DescriptionAnalysisProps {
  expenses: Expense[];
  currency: string;
  getAmountInCurrency: (expense: Expense) => number;
  topN?: number;
}

interface DescriptionItem {
  name: string;
  total: number;
  count: number;
  avg: number;
}

const DescriptionTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DescriptionItem;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{data.name}</p>
        <p className="text-indigo-600 font-bold">{formatAmount(data.total, currency)}</p>
        <p className="text-gray-600 text-sm">{data.count} time{data.count !== 1 ? 's' : ''}</p>
        <p className="text-gray-500 text-xs">Avg: {formatAmount(data.avg, currency)}</p>
      </div>
    );
  }
  return null;
};

export const DescriptionAnalysis: React.FC<DescriptionAnalysisProps> = ({
  expenses,
  currency,
  getAmountInCurrency,
  topN = 10,
}) => {
  const descriptionData = useMemo<DescriptionItem[]>(() => {
    const groups: Record<string, { total: number; count: number; displayName: string }> = {};

    expenses.forEach(expense => {
      const key = expense.description.trim().toLowerCase();
      if (!key) return;
      if (!groups[key]) {
        groups[key] = { total: 0, count: 0, displayName: expense.description.trim() };
      }
      groups[key].total += getAmountInCurrency(expense);
      groups[key].count += 1;
    });

    return Object.values(groups)
      .map(data => ({
        name: data.displayName,
        total: data.total,
        count: data.count,
        avg: data.total / data.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, topN);
  }, [expenses, getAmountInCurrency, topN]);

  if (descriptionData.length === 0) return null;

  // Truncate long names for the chart Y-axis
  const chartData = descriptionData.map(d => ({
    ...d,
    shortName: d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name,
  }));

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
      <div>
        <h4 className="text-lg font-semibold text-gray-800">Top Recurring Spends</h4>
        <p className="text-xs text-gray-500 mt-0.5">Most spent descriptions by total amount</p>
      </div>

      {/* Horizontal bar chart */}
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
        >
          <XAxis
            type="number"
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
            tickFormatter={(value) => formatAmount(value, currency)}
          />
          <YAxis
            type="category"
            dataKey="shortName"
            stroke="#6b7280"
            style={{ fontSize: '11px' }}
            width={100}
          />
          <Tooltip content={<DescriptionTooltip currency={currency} />} />
          <Bar dataKey="total" radius={[0, 6, 6, 0]}>
            {chartData.map((_entry, index) => (
              <Cell key={`desc-bar-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Description list */}
      <div className="divide-y divide-gray-100">
        {descriptionData.map((item, index) => (
          <div
            key={item.name}
            className={`flex items-center justify-between py-2.5 px-2 ${index % 2 === 0 ? '' : 'bg-gray-50'} rounded`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-gray-800 truncate">{item.name}</span>
              <span className="text-xs font-medium text-gray-400 flex-shrink-0">{item.count}x</span>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-sm font-bold text-gray-900">{formatAmount(item.total, currency)}</p>
              <p className="text-xs text-gray-400">avg {formatAmount(item.avg, currency)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
