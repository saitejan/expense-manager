/**
 * Monthly budget editor: overall total plus optional per-tag caps.
 * Render with key={JSON.stringify(budgets)} so the draft resets when the saved value changes.
 */

import React, { useState } from 'react';
import type { Budgets } from '../../types';
import { showModal } from '../../utils';

interface BudgetSettingsProps {
  budgets: Budgets | null;
  currency: string;
  tags: string[];
  onSave: (budgets: Budgets | null) => void;
}

export const BudgetSettings: React.FC<BudgetSettingsProps> = ({ budgets, currency, tags, onSave }) => {
  const budgetCurrency = budgets?.currency || currency;
  const [total, setTotal] = useState(budgets?.total ? String(budgets.total) : '');
  const [tagAmounts, setTagAmounts] = useState<Record<string, string>>(
    () => Object.fromEntries((budgets?.tags || []).map(t => [t.tag, String(t.amount)]))
  );

  const handleSave = () => {
    const totalValue = parseFloat(total);
    const tagList = Object.entries(tagAmounts)
      .map(([tag, value]) => ({ tag, amount: parseFloat(value) }))
      .filter(t => t.amount > 0);
    const hasAny = totalValue > 0 || tagList.length > 0;
    onSave(hasAny
      ? {
        currency: budgetCurrency,
        ...(totalValue > 0 ? { total: totalValue } : {}),
        ...(tagList.length > 0 ? { tags: tagList } : {}),
      }
      : null);
    showModal('Budgets Saved', hasAny ? 'Your monthly budget is shown on the Transactions screen.' : 'Budgets cleared.');
  };

  const inputClass = 'w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500';

  return (
    <div className="border-b pb-6 border-gray-100">
      <h3 className="text-xl font-semibold mb-1 text-indigo-700">Monthly Budget</h3>
      <p className="text-xs text-gray-500 mb-3">Amounts in {budgetCurrency}. Income is never counted as spending.</p>

      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="budget-total">Total per month</label>
      <input id="budget-total" type="number" inputMode="decimal" min="0" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 40000" className={inputClass} />

      <details className="mt-3">
        <summary className="text-sm font-medium text-gray-700 cursor-pointer">Per-category budgets</summary>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {tags.map(tag => (
            <label key={tag} className="text-xs text-gray-600">
              {tag}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={tagAmounts[tag] || ''}
                onChange={(e) => setTagAmounts(prev => ({ ...prev, [tag]: e.target.value }))}
                className={`${inputClass} mt-1 text-sm`}
              />
            </label>
          ))}
        </div>
      </details>

      <button onClick={handleSave} className="mt-4 w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700">
        Save Budget
      </button>
    </div>
  );
};
