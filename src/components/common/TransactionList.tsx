/**
 * Transactions grouped under day headers ("Today · ₹1,250"), newest first
 */

import React, { useMemo } from 'react';
import type { Expense, ExchangeRates } from '../../types';
import { formatAmount, getExpenseAmountInCurrency } from '../../utils';
import { ExpenseItem } from './ExpenseItem';

interface TransactionListProps {
  /** Sorted newest first */
  expenses: Expense[];
  currency: string;
  exchangeRates: ExchangeRates | null;
  onEdit: (id: string) => void;
  onViewReceipt?: (id: string) => void;
}

const dayLabel = (date: Date, today: Date): string => {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOf(today) - startOf(date)) / (24 * 60 * 60 * 1000));
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
};

export const TransactionList: React.FC<TransactionListProps> = ({ expenses, currency, exchangeRates, onEdit, onViewReceipt }) => {
  const groups = useMemo(() => {
    const today = new Date();
    const byDay: { key: string; label: string; spent: number; items: Expense[] }[] = [];
    for (const expense of expenses) {
      const key = expense.timestamp.toDateString();
      let group = byDay[byDay.length - 1];
      if (!group || group.key !== key) {
        group = { key, label: dayLabel(expense.timestamp, today), spent: 0, items: [] };
        byDay.push(group);
      }
      group.items.push(expense);
      if (expense.type !== 'credit') group.spent += getExpenseAmountInCurrency(expense, currency, exchangeRates);
    }
    return byDay;
  }, [expenses, currency, exchangeRates]);

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <section key={group.key}>
          <h4 className="flex justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide pb-1 border-b border-gray-200">
            <span>{group.label}</span>
            {group.spent > 0 && <span>{formatAmount(group.spent, currency)}</span>}
          </h4>
          <div className="divide-y divide-gray-100">
            {group.items.map(expense => (
              <ExpenseItem key={expense.id} expense={expense} onEdit={onEdit} currency={currency} onViewReceipt={onViewReceipt} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
