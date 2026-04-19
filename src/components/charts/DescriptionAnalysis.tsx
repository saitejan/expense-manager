/**
 * Description-level spending analysis — shows top recurring expenses
 * Supports exact and smart grouping modes with expandable transaction drill-down
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatAmount } from '../../utils';
import { COLORS } from './ExpenseTrendChart';
import { matchDescriptionGroup, stripStopPrefix } from '../../constants/descriptionGroups';
import type { Expense } from '../../types';

interface DescriptionAnalysisProps {
  expenses: Expense[];
  currency: string;
  getAmountInCurrency: (expense: Expense) => number;
  topN?: number;
}

interface DescriptionGroup {
  key: string;
  name: string;
  total: number;
  count: number;
  avg: number;
  subGroups: { name: string; total: number; count: number }[];
  expenses: Expense[];
}

type GroupMode = 'exact' | 'smart';

const DescriptionTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
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

const PAGE_SIZE = 20;

/**
 * Smart grouping: uses predefined keyword-based rules first,
 * then strips stop prefixes ("at", "for", "shopping in", etc.),
 * falls back to colon-prefix or first-word grouping.
 */
function getSmartGroupKey(description: string): string {
  // 1. Check predefined rules
  const ruleMatch = matchDescriptionGroup(description);
  if (ruleMatch) return ruleMatch.toLowerCase();

  // 2. Strip stop prefixes so "At xyz" doesn't create an "At" group
  const stripped = stripStopPrefix(description).toLowerCase();

  // 3. Colon prefix (e.g. "baby: amazon" → "baby")
  const colonIdx = stripped.indexOf(':');
  if (colonIdx > 0) {
    return stripped.slice(0, colonIdx).trim();
  }

  // 4. First word fallback
  return stripped.split(/\s+/)[0] || stripped;
}

/** Get display name for a smart group key */
function getSmartDisplayName(description: string): string {
  const ruleMatch = matchDescriptionGroup(description);
  if (ruleMatch) return ruleMatch;

  const stripped = stripStopPrefix(description);
  const lower = stripped.toLowerCase();

  const colonIdx = lower.indexOf(':');
  if (colonIdx > 0) {
    const prefix = lower.slice(0, colonIdx).trim();
    return prefix.replace(/\b\w/g, c => c.toUpperCase());
  }

  const firstWord = lower.split(/\s+/)[0] || lower;
  return firstWord.replace(/\b\w/g, c => c.toUpperCase());
}

export const DescriptionAnalysis: React.FC<DescriptionAnalysisProps> = ({
  expenses,
  currency,
  getAmountInCurrency,
  topN = 10,
}) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('smart');

  const allGroups = useMemo<DescriptionGroup[]>(() => {
    if (groupMode === 'exact') {
      const groups: Record<string, { displayName: string; total: number; count: number; expenses: Expense[] }> = {};
      expenses.forEach(expense => {
        const key = expense.description.trim().toLowerCase();
        if (!key) return;
        if (!groups[key]) {
          groups[key] = { displayName: expense.description.trim(), total: 0, count: 0, expenses: [] };
        }
        groups[key].total += getAmountInCurrency(expense);
        groups[key].count += 1;
        groups[key].expenses.push(expense);
      });

      return Object.entries(groups)
        .map(([key, data]) => ({
          key,
          name: data.displayName,
          total: data.total,
          count: data.count,
          avg: data.total / data.count,
          subGroups: [],
          expenses: data.expenses,
        }))
        .sort((a, b) => b.total - a.total);
    }

    // Smart mode: keyword rules → colon prefix → first word
    const keyMap: Record<string, {
      displayName: string;
      exactGroups: Record<string, { displayName: string; total: number; count: number; expenses: Expense[] }>;
    }> = {};

    expenses.forEach(expense => {
      const desc = expense.description.trim();
      if (!desc) return;
      const smartKey = getSmartGroupKey(desc);
      const exactKey = desc.toLowerCase();

      if (!keyMap[smartKey]) {
        keyMap[smartKey] = { displayName: getSmartDisplayName(desc), exactGroups: {} };
      }
      if (!keyMap[smartKey].exactGroups[exactKey]) {
        keyMap[smartKey].exactGroups[exactKey] = { displayName: desc, total: 0, count: 0, expenses: [] };
      }
      keyMap[smartKey].exactGroups[exactKey].total += getAmountInCurrency(expense);
      keyMap[smartKey].exactGroups[exactKey].count += 1;
      keyMap[smartKey].exactGroups[exactKey].expenses.push(expense);
    });

    const result: DescriptionGroup[] = [];

    Object.entries(keyMap).forEach(([smartKey, data]) => {
      const exactEntries = Object.values(data.exactGroups);
      const totalAmount = exactEntries.reduce((s, e) => s + e.total, 0);
      const totalCount = exactEntries.reduce((s, e) => s + e.count, 0);
      const allExp = exactEntries.flatMap(e => e.expenses);

      if (exactEntries.length === 1) {
        const entry = exactEntries[0];
        result.push({
          key: smartKey,
          name: entry.displayName,
          total: entry.total,
          count: entry.count,
          avg: entry.total / entry.count,
          subGroups: [],
          expenses: entry.expenses,
        });
      } else {
        result.push({
          key: smartKey,
          name: data.displayName,
          total: totalAmount,
          count: totalCount,
          avg: totalAmount / totalCount,
          subGroups: exactEntries
            .map(e => ({ name: e.displayName, total: e.total, count: e.count }))
            .sort((a, b) => b.total - a.total),
          expenses: allExp,
        });
      }
    });

    return result.sort((a, b) => b.total - a.total);
  }, [expenses, getAmountInCurrency, groupMode]);

  const chartData = useMemo(() =>
    allGroups.slice(0, topN).map(d => ({
      ...d,
      shortName: d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name,
    })),
    [allGroups, topN]
  );

  const visibleItems = allGroups.slice(0, visibleCount);
  const hasMore = visibleCount < allGroups.length;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50 && hasMore) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  const handleModeChange = (mode: GroupMode) => {
    setGroupMode(mode);
    setExpandedKey(null);
    setVisibleCount(PAGE_SIZE);
  };

  if (allGroups.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">Top Recurring Spends</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {allGroups.length} {groupMode === 'smart' ? 'groups' : 'unique descriptions'}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => handleModeChange('smart')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
              groupMode === 'smart' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Smart
          </button>
          <button
            onClick={() => handleModeChange('exact')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
              groupMode === 'exact' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Exact
          </button>
        </div>
      </div>

      {/* Horizontal bar chart — top N only */}
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

      {/* Full list — scrollable with infinite load and expandable rows */}
      <div
        className="divide-y divide-gray-100"
        style={{ maxHeight: '50vh', overflowY: 'auto' }}
        onScroll={handleScroll}
      >
        {visibleItems.map((item, index) => {
          const isExpanded = expandedKey === item.key;
          const hasSubGroups = item.subGroups.length > 0;

          return (
            <div key={item.key}>
              <button
                onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                className={`w-full flex items-center justify-between py-2.5 px-2 text-left hover:bg-indigo-50 transition ${
                  isExpanded ? 'bg-indigo-50' : index % 2 !== 0 ? 'bg-gray-50' : ''
                } rounded`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  }
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-800 truncate">{item.name}</span>
                  {hasSubGroups && (
                    <span className="text-xs text-indigo-500 flex-shrink-0">
                      {item.subGroups.length} variants
                    </span>
                  )}
                  <span className="text-xs font-medium text-gray-400 flex-shrink-0">{item.count}x</span>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-gray-900">{formatAmount(item.total, currency)}</p>
                  <p className="text-xs text-gray-400">avg {formatAmount(item.avg, currency)}</p>
                </div>
              </button>

              {isExpanded && (
                <div className="bg-gray-50 border-l-2 border-indigo-300 ml-3 mb-1 animate-fade-in">
                  {hasSubGroups && (
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Grouped descriptions:</p>
                      {item.subGroups.map(sub => (
                        <div key={sub.name} className="flex justify-between py-1 text-xs">
                          <span className="text-gray-600 truncate mr-2">
                            {sub.name} <span className="text-gray-400">({sub.count}x)</span>
                          </span>
                          <span className="text-gray-800 font-medium flex-shrink-0">
                            {formatAmount(sub.total, currency)}
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 mt-1.5 mb-1" />
                    </div>
                  )}

                  <div className="px-3 pb-2">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">
                      Transactions ({item.expenses.length}):
                    </p>
                    <div className="space-y-0.5" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {[...item.expenses]
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                        .map(expense => (
                          <div key={expense.id} className="flex justify-between py-1.5 px-1 text-xs rounded hover:bg-white">
                            <div className="flex gap-2 min-w-0 flex-1">
                              <span className="text-gray-400 flex-shrink-0">
                                {expense.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                              </span>
                              <span className="text-gray-700 truncate">{expense.description}</span>
                            </div>
                            <span className="text-gray-900 font-medium flex-shrink-0 ml-2">
                              {formatAmount(expense.amount, expense.currency)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {hasMore && (
          <div className="text-center py-3 text-xs text-gray-400">
            Scroll for more...
          </div>
        )}
      </div>
    </div>
  );
};
