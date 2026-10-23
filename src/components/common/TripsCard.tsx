/**
 * Trip totals in each trip's own currency, with budget bar, top tags and an expandable expense list
 */

import React, { useMemo, useState } from 'react';
import { Plane, ChevronDown, ChevronRight } from 'lucide-react';
import type { Expense, ExchangeRates, Trip } from '../../types';
import { formatAmount, getExpenseAmountInCurrency } from '../../utils';
import { TransactionList } from './TransactionList';

interface TripsCardProps {
  trips: Record<string, Trip>;
  /** Spending only (no income) */
  expenses: Expense[];
  exchangeRates: ExchangeRates | null;
  currency: string;
  onEdit: (id: string) => void;
  onViewReceipt: (id: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const TripsCard: React.FC<TripsCardProps> = ({ trips, expenses, exchangeRates, currency, onEdit, onViewReceipt }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summaries = useMemo(() => Object.entries(trips)
    .sort(([, a], [, b]) => b.startDate.localeCompare(a.startDate))
    .map(([id, trip]) => {
      const tripExpenses = expenses.filter(e => e.tripId === id);
      const byTag: Record<string, number> = {};
      let total = 0;
      for (const expense of tripExpenses) {
        const amount = getExpenseAmountInCurrency(expense, trip.currency, exchangeRates);
        total += amount;
        byTag[expense.tag] = (byTag[expense.tag] || 0) + amount;
      }
      const days = Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / DAY_MS) + 1;
      const topTags = Object.entries(byTag).sort(([, a], [, b]) => b - a).slice(0, 3);
      return { id, trip, tripExpenses, total, days, topTags };
    }), [trips, expenses, exchangeRates]);

  if (summaries.length === 0) return null;

  return (
    <div className="mt-8 border border-gray-200 rounded-xl p-4 bg-gray-50">
      <h3 className="text-xl font-semibold mb-3 text-gray-700 flex items-center gap-2"><Plane className="w-5 h-5 text-blue-500" /> Trips</h3>
      <div className="space-y-3">
        {summaries.map(({ id, trip, tripExpenses, total, days, topTags }) => {
          const ratio = trip.budget ? total / trip.budget : 0;
          const expanded = expandedId === id;
          return (
            <div key={id} className="bg-white rounded-lg border border-gray-200 p-3">
              <button onClick={() => setExpandedId(expanded ? null : id)} className="w-full text-left" aria-expanded={expanded}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {trip.name}
                  </span>
                  <span className="font-bold text-indigo-600">{formatAmount(total, trip.currency)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {trip.startDate} → {trip.endDate} · {tripExpenses.length} expense{tripExpenses.length !== 1 ? 's' : ''} · {formatAmount(total / days, trip.currency)}/day
                </p>
                {trip.budget && (
                  <div className="mt-2">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${ratio > 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
                    </div>
                    <p className={`text-xs mt-1 ${ratio > 1 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {ratio > 1 ? `Over by ${formatAmount(total - trip.budget, trip.currency)}` : `${formatAmount(trip.budget - total, trip.currency)} of ${formatAmount(trip.budget, trip.currency)} left`}
                    </p>
                  </div>
                )}
                {topTags.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">{topTags.map(([tag, amount]) => `${tag} ${formatAmount(amount, trip.currency)}`).join(' · ')}</p>
                )}
              </button>
              {expanded && (
                <div className="mt-3">
                  {tripExpenses.length === 0
                    ? <p className="text-sm text-gray-500">No expenses on this trip yet.</p>
                    : <TransactionList expenses={tripExpenses} currency={currency} exchangeRates={exchangeRates} onEdit={onEdit} onViewReceipt={onViewReceipt} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
