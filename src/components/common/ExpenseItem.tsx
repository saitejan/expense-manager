/**
 * Individual expense item component
 * Displays expense details with edit/delete actions
 */

import React, { useMemo } from 'react';
import { Trash2, Edit2, Save, Repeat, Paperclip } from 'lucide-react';
import type { Expense } from '../../types';
import { formatAmount } from '../../utils';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '../../constants';

interface ExpenseItemProps {
  expense: Expense;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  showDate?: boolean;
  currency: string;
  isOnline: boolean;
  onViewReceipt?: (id: string) => void;
}

/**
 * Displays a single expense with tag, amount, and action buttons
 * @param expense - Expense object to display
 * @param onDelete - Callback when delete button is clicked
 * @param onEdit - Callback when edit button is clicked
 * @param showDate - Whether to show full date or just time
 * @param currency - User's default currency for comparison
 * @param isOnline - Whether the app is online (affects button states)
 */
export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  onDelete,
  onEdit,
  showDate = false,
  currency,
  isOnline,
  onViewReceipt,
}) => {
  const time = expense.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const fullDateDisplay = expense.timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isPending = expense.syncStatus === 'pending';
  const isDeleteDisabled = expense.syncStatus === 'synced' && !isOnline;
  const isIncome = expense.type === 'credit';
  const isRecurring = expense.id.startsWith('rec-');

  const tagColor = useMemo(() => {
    return TAG_COLORS[expense.tag] || DEFAULT_TAG_COLOR;
  }, [expense.tag]);

  return (
    <div
      className={`flex items-center justify-between p-3 border rounded-lg shadow-sm hover:shadow-md transition duration-200 ${isPending ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'
        }`}
    >
      <div className="flex-grow min-w-0">
        <div className="text-xs font-semibold text-gray-500 mb-1">
          {showDate ? fullDateDisplay : time}
        </div>
        <p className="text-sm font-medium truncate text-gray-800">{expense.description}</p>
        <div className="flex items-center space-x-2 mt-1">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tagColor}`}>
            {expense.tag}
          </span>
          {isIncome && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Income</span>
          )}
          {isRecurring && <Repeat className="w-3.5 h-3.5 text-gray-400" aria-label="Recurring" />}
          {isPending && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-500 text-white flex items-center">
              <Save className="w-3 h-3 mr-1" /> Pending
            </span>
          )}
          <span className={`text-xs text-gray-500 font-medium ${expense.currency !== currency && 'text-red-500'}`}>({expense.currency})</span>
        </div>
      </div>
      <div className="flex items-center space-x-3 ml-4">
        <span className={`text-lg font-extrabold flex-shrink-0 ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
          {isIncome && '+'}{formatAmount(expense.amount, expense.currency)}
        </span>
        {expense.hasReceipt && onViewReceipt && (
          <button
            onClick={() => onViewReceipt(expense.id)}
            className="p-1 text-gray-400 hover:text-gray-600 transition duration-150 hover:bg-gray-100 rounded-full disabled:opacity-50"
            aria-label="View Receipt"
            disabled={!isOnline}
          >
            <Paperclip className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => onEdit(expense.id)}
          className="p-1 text-blue-400 hover:text-blue-600 transition duration-150 hover:bg-blue-50 rounded-full disabled:opacity-50"
          aria-label="Edit Expense"
          disabled={isDeleteDisabled}
        >
          <Edit2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => onDelete(expense.id)}
          className="p-1 text-red-400 hover:text-red-600 transition duration-150 hover:bg-red-50 rounded-full disabled:opacity-50"
          aria-label="Delete Expense"
          disabled={isDeleteDisabled}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
