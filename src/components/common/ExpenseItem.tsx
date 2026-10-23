/**
 * Compact transaction row. Tapping the row opens it for editing (delete lives in the edit screen).
 */

import React from 'react';
import { Repeat, Paperclip } from 'lucide-react';
import type { Expense } from '../../types';
import { formatAmount } from '../../utils';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '../../constants';

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (id: string) => void;
  /** Show the date instead of the time (for lists not grouped by day) */
  showDate?: boolean;
  /** Preferred currency; other currencies get a small label */
  currency: string;
  onViewReceipt?: (id: string) => void;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, onEdit, showDate = false, currency, onViewReceipt }) => {
  const isPending = expense.syncStatus === 'pending';
  const isIncome = expense.type === 'credit';
  const isRecurring = expense.id.startsWith('rec-');
  const when = showDate
    ? expense.timestamp.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      ...(expense.timestamp.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}),
    })
    : expense.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={`flex items-center gap-1 ${isPending ? 'bg-orange-50 -mx-2 px-2 rounded-lg' : ''}`}>
      <button
        type="button"
        onClick={() => onEdit(expense.id)}
        className="flex-1 min-w-0 flex items-center gap-3 py-2.5 text-left"
        aria-label={`Edit ${expense.description}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{expense.description}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 min-w-0">
            <span className={`px-1.5 py-px rounded-full font-medium shrink-0 ${TAG_COLORS[expense.tag] || DEFAULT_TAG_COLOR}`}>{expense.tag}</span>
            <span className="shrink-0">{when}</span>
            {isRecurring && <Repeat className="w-3 h-3 shrink-0" aria-label="Recurring" />}
            {expense.currency !== currency && <span className="shrink-0">{expense.currency}</span>}
            {isPending && <span className="text-orange-600 font-medium shrink-0">Pending</span>}
          </div>
        </div>
        <span className={`text-sm font-bold whitespace-nowrap ${isIncome ? 'text-green-600' : 'text-gray-900'}`}>
          {isIncome && '+'}{formatAmount(expense.amount, expense.currency)}
        </span>
      </button>
      {expense.hasReceipt && onViewReceipt && (
        <button
          type="button"
          onClick={() => onViewReceipt(expense.id)}
          className="p-2 -mr-2 text-gray-400 hover:text-gray-600"
          aria-label={`View receipt for ${expense.description}`}
        >
          <Paperclip className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
