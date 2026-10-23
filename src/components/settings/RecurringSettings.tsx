/**
 * Monthly recurring expenses (rent, EMI, subscriptions). Created automatically when the app opens on or after the due day.
 */

import React, { useState } from 'react';
import { Repeat, Trash2 } from 'lucide-react';
import type { RecurringRule } from '../../types';
import { POPULAR_CURRENCIES } from '../../constants';
import { formatAmount, showModal } from '../../utils';
import { toMonthKey, addMonths, nextDueMonth } from '../../utils/recurring';

interface RecurringSettingsProps {
  rules: RecurringRule[];
  isAuthenticated: boolean;
  currency: string;
  tags: string[];
  onAdd: (rule: Omit<RecurringRule, 'id'>) => Promise<void>;
  onToggle: (ruleId: string, active: boolean) => Promise<void>;
  onDelete: (ruleId: string) => Promise<void>;
}

const monthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

export const RecurringSettings: React.FC<RecurringSettingsProps> = ({ rules, isAuthenticated, currency, tags, onAdd, onToggle, onDelete }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [ruleCurrency, setRuleCurrency] = useState(currency);
  const [tag, setTag] = useState(tags.includes('Bills') ? 'Bills' : tags[0]);
  const [day, setDay] = useState(String(new Date().getDate()));
  const [includeThisMonth, setIncludeThisMonth] = useState(false);

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      showModal('Recurring Expenses', `Could not save: ${(error as Error).message}`);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amountValue = parseFloat(amount);
    const dayValue = parseInt(day, 10);
    if (!description.trim() || !(amountValue > 0) || !(dayValue >= 1 && dayValue <= 31)) {
      showModal('Invalid Input', 'Enter a description, a positive amount and a day between 1 and 31.');
      return;
    }
    const thisMonth = toMonthKey(new Date());
    run(async () => {
      await onAdd({
        description: description.trim(),
        amount: amountValue,
        currency: ruleCurrency,
        tag,
        dayOfMonth: dayValue,
        // Off by default so an entry already logged this month isn't duplicated
        startMonth: includeThisMonth ? thisMonth : addMonths(thisMonth, 1),
        active: true,
        createdAt: Date.now(),
      });
      setDescription('');
      setAmount('');
      setIncludeThisMonth(false);
    });
  };

  const inputClass = 'w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm';

  return (
    <div className="border-b pb-6 border-gray-100">
      <h3 className="text-xl font-semibold mb-1 text-indigo-700 flex items-center gap-2"><Repeat className="w-5 h-5" /> Recurring Expenses</h3>
      <p className="text-xs text-gray-500 mb-3">Added automatically when you open the app on or after the due day. Missed months are caught up (up to 12).</p>

      {!isAuthenticated ? (
        <p className="text-sm text-gray-600">Sign in to use recurring expenses.</p>
      ) : (
        <>
          {rules.length > 0 && (
            <ul className="space-y-2 mb-4">
              {rules.map(rule => (
                <li key={rule.id} className={`flex items-center gap-3 p-3 border rounded-lg ${rule.active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{rule.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatAmount(rule.amount, rule.currency)} · {rule.tag} · day {rule.dayOfMonth} · next {monthLabel(nextDueMonth(rule))}
                    </p>
                  </div>
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input type="checkbox" checked={rule.active} onChange={(e) => run(() => onToggle(rule.id, e.target.checked))} />
                    Active
                  </label>
                  <button
                    onClick={() => showModal('Delete Recurring Expense', `Stop adding "${rule.description}"? Expenses already added stay.`, true, () => run(() => onDelete(rule.id)))}
                    className="p-1 text-red-400 hover:text-red-600"
                    aria-label={`Delete ${rule.description}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAdd} className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description, e.g. Rent" className={inputClass} aria-label="Description" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className={inputClass} aria-label="Amount" />
              <select value={ruleCurrency} onChange={(e) => setRuleCurrency(e.target.value)} className={inputClass} aria-label="Currency">
                {POPULAR_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <select value={tag} onChange={(e) => setTag(e.target.value)} className={inputClass} aria-label="Tag">
                {tags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Day
                <input type="number" inputMode="numeric" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} className={inputClass} aria-label="Day of month" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={includeThisMonth} onChange={(e) => setIncludeThisMonth(e.target.checked)} />
              Also add for this month
            </label>
            <button type="submit" className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
              Add Recurring Expense
            </button>
          </form>
        </>
      )}
    </div>
  );
};
