/**
 * Enhanced category breakdown with pie chart, horizontal bars, and interactive cards
 */

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatAmount } from '../../utils';
import { COLORS } from './ExpenseTrendChart';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '../../constants';

interface CategoryItem {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  avgPerTransaction: number;
}

interface CategoryBreakdownProps {
  categoryData: CategoryItem[];
  currency: string;
  onCategoryClick: (tag: string | null) => void;
  selectedCategory: string | null;
}

const CategoryTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800">{data.name}</p>
        <p className="text-indigo-600 font-bold">{formatAmount(data.amount, currency)}</p>
        <p className="text-gray-600 text-sm">{data.count} transaction{data.count !== 1 ? 's' : ''}</p>
        <p className="text-gray-500 text-xs">{data.percentage.toFixed(1)}% of total</p>
      </div>
    );
  }
  return null;
};

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categoryData,
  currency,
  onCategoryClick,
  selectedCategory,
}) => {
  if (categoryData.length === 0) return null;

  const handlePieClick = (_: any, index: number) => {
    const tag = categoryData[index]?.name;
    if (!tag) return;
    onCategoryClick(selectedCategory === tag ? null : tag);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-5">
      <h4 className="text-lg font-semibold text-gray-800">Category Breakdown</h4>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                outerRadius={90}
                dataKey="amount"
                style={{ cursor: 'pointer' }}
                onClick={handlePieClick}
              >
                {categoryData.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedCategory && selectedCategory !== categoryData[index].name ? 0.4 : 1}
                    stroke={selectedCategory === categoryData[index].name ? '#4f46e5' : 'none'}
                    strokeWidth={selectedCategory === categoryData[index].name ? 3 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<CategoryTooltip currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Horizontal bar chart */}
        <div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={categoryData}
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
                dataKey="name"
                stroke="#6b7280"
                style={{ fontSize: '11px' }}
                width={70}
              />
              <Tooltip content={<CategoryTooltip currency={currency} />} />
              <Bar
                dataKey="amount"
                radius={[0, 6, 6, 0]}
                style={{ cursor: 'pointer' }}
                onClick={(_data: any, index: number) => {
                  const tag = categoryData[index]?.name;
                  if (tag) onCategoryClick(selectedCategory === tag ? null : tag);
                }}
              >
                {categoryData.map((_entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedCategory && selectedCategory !== categoryData[index].name ? 0.4 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categoryData.map((cat) => {
          const tagClasses = TAG_COLORS[cat.name] || DEFAULT_TAG_COLOR;
          const isSelected = selectedCategory === cat.name;
          // Extract the border color class for the left border
          const borderColor = tagClasses.split(' ').find(c => c.startsWith('border-')) || 'border-gray-300';

          return (
            <button
              key={cat.name}
              onClick={() => onCategoryClick(isSelected ? null : cat.name)}
              className={`text-left p-3 rounded-lg border-l-4 ${borderColor} bg-gray-50 hover:bg-gray-100 transition ${
                isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 bg-indigo-50' : ''
              }`}
            >
              <p className="text-sm font-semibold text-gray-800 truncate">{cat.name}</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(cat.amount, currency)}</p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">{cat.count} txn{cat.count !== 1 ? 's' : ''}</span>
                <span className="text-xs font-medium text-indigo-600">{cat.percentage.toFixed(1)}%</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Avg: {formatAmount(cat.avgPerTransaction, currency)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
