/**
 * This month's spending against the monthly budget (total and per tag)
 */

import React, { useMemo } from 'react';
import { Target } from 'lucide-react';
import type { Budgets, Expense, ExchangeRates } from '../../types';
import { formatAmount, getExpenseAmountInCurrency } from '../../utils';

interface BudgetCardProps {
  budgets: Budgets | null;
  /** Spending only (no income) */
  expenses: Expense[];
  exchangeRates: ExchangeRates | null;
  onSetBudget: () => void;
}

const barColor = (ratio: number) => (ratio > 1 ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-green-500');

const Bar: React.FC<{ label: string; spent: number; budget: number; currency: string }> = ({ label, spent, budget, currency }) => {
  const ratio = budget > 0 ? spent / budget : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span className={ratio > 1 ? 'text-red-600 font-semibold' : ''}>
          {formatAmount(spent, currency)} / {formatAmount(budget, currency)}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${barColor(ratio)}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
    </div>
  );
};

export const BudgetCard: React.FC<BudgetCardProps> = ({ budgets, expenses, exchangeRates, onSetBudget }) => {
  const summary = useMemo(() => {
    if (!budgets) return null;
    const now = new Date();
    const monthExpenses = expenses.filter(e => e.timestamp.getMonth() === now.getMonth() && e.timestamp.getFullYear() === now.getFullYear());
    const amountOf = (e: Expense) => getExpenseAmountInCurrency(e, budgets.currency, exchangeRates);
    const spent = monthExpenses.reduce((sum, e) => sum + amountOf(e), 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate() + 1; // today still counts
    const tags = (budgets.tags || [])
      .filter(t => t.amount > 0)
      .map(t => ({ ...t, spent: monthExpenses.filter(e => e.tag === t.tag).reduce((sum, e) => sum + amountOf(e), 0) }))
      .sort((a, b) => b.spent / b.amount - a.spent / a.amount);
    return { spent, daysLeft, tags };
  }, [budgets, expenses, exchangeRates]);

  if (!budgets || !summary || (!budgets.total && summary.tags.length === 0)) {
    return (
      <button onClick={onSetBudget} className="mb-4 w-full text-left text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
        <Target className="w-4 h-4" /> Set a monthly budget →
      </button>
    );
  }

  const { currency, total } = budgets;
  const left = (total || 0) - summary.spent;

  return (
    <div className="mb-4 p-4 border border-gray-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1">
          <Target className="w-4 h-4 text-indigo-500" /> This month's budget
        </h3>
        <button onClick={onSetBudget} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
      </div>
      {!!total && (
        <>
          <Bar label="Total" spent={summary.spent} budget={total} currency={currency} />
          <p className={`text-xs ${left < 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            {left >= 0
              ? `${formatAmount(left, currency)} left · ${formatAmount(left / summary.daysLeft, currency)}/day for ${summary.daysLeft} day${summary.daysLeft !== 1 ? 's' : ''}`
              : `Over budget by ${formatAmount(-left, currency)}`}
          </p>
        </>
      )}
      {summary.tags.map(t => (
        <Bar key={t.tag} label={t.tag} spent={t.spent} budget={t.amount} currency={currency} />
      ))}
    </div>
  );
};
