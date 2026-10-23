/**
 * Add/Edit expense form. Mobile first: amount, description and tag up top,
 * date/time/currency folded into one row, actions pinned to the bottom of the screen.
 */

import React, { useState, useMemo, useRef } from 'react';
import { AlertTriangle, Zap, ClipboardPaste, Camera, Plane, ChevronDown, Plus } from 'lucide-react';
import type { FormState, Expense, Trip } from '../../types';
import { MAX_SUGGESTIONS, POPULAR_CURRENCIES, getCurrencySymbol } from '../../constants';
import { showModal } from '../../utils';
import { getFavorites } from '../../utils/quickAdd';

/** Long text with bank words is a pasted SMS, not "450 swiggy" */
const looksLikeSms = (text: string) => text.length > 30 && /debited|credited|spent|txn|a\/c|upi/i.test(text);

interface AddExpenseViewProps {
  form: FormState;
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleFormClose: () => void;
  handleAddExpense: (e: React.FormEvent) => Promise<void> | void;
  loading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  expenses: Expense[];
  availableTags: string[];
  editingExpenseId: string | null;
  trips: Record<string, Trip>;
  /** undefined = unchanged, null = will be removed, string = new photo */
  receiptDraft: string | null | undefined;
  hasSavedReceipt: boolean;
  canAttachReceipt: boolean;
  onQuickEntry: (text: string) => void;
  onSmsText: (text: string) => boolean;
  onPrefill: (values: Partial<FormState>) => void;
  onReceiptFile: (file: File) => void;
  onRemoveReceipt: () => void;
  onViewReceipt: () => void;
  /** Only when editing */
  onDelete: () => void;
}

const inputClass = 'w-full p-2.5 text-base border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500';

export const AddExpenseView: React.FC<AddExpenseViewProps> = ({
  form,
  handleFormClose,
  handleFormChange,
  handleAddExpense,
  loading,
  isAuthenticated,
  isOnline,
  expenses,
  availableTags,
  editingExpenseId,
  trips,
  receiptDraft,
  hasSavedReceipt,
  canAttachReceipt,
  onQuickEntry,
  onSmsText,
  onPrefill,
  onReceiptFile,
  onRemoveReceipt,
  onViewReceipt,
  onDelete,
}) => {
  const [quickText, setQuickText] = useState('');
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [customTag, setCustomTag] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isIncome = form.type === 'credit';

  const favorites = useMemo(
    () => (editingExpenseId ? [] : getFavorites(expenses, new Date())),
    [expenses, editingExpenseId]
  );

  // Trips covering the chosen date, plus the saved one so an edit never hides it
  const tripOptions = useMemo(
    () => Object.entries(trips).filter(([id, trip]) => (trip.startDate <= form.date && form.date <= trip.endDate) || id === form.tripId),
    [trips, form.date, form.tripId]
  );

  // Past descriptions matching what is typed, latest first (expenses are sorted newest first)
  const suggestions = useMemo(() => {
    const typed = form.description.trim().toLowerCase();
    if (!typed) return [];
    const unique = [...new Set(expenses.map(e => e.description))];
    return unique.filter(d => d.toLowerCase().includes(typed) && d.toLowerCase() !== typed).slice(0, MAX_SUGGESTIONS);
  }, [form.description, expenses]);

  const setField = (name: keyof FormState, value: string) =>
    handleFormChange({ target: { name, value } } as React.ChangeEvent<HTMLInputElement>);

  const handleQuickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuickText(text);
    if (!(looksLikeSms(text) && onSmsText(text))) onQuickEntry(text);
  };

  const handlePasteSms = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!onSmsText(text)) {
        showModal('No Amount Found', 'Copy a bank SMS or payment alert that contains an amount (e.g. "Rs.450 debited..."), then tap Paste SMS again.');
      }
    } catch {
      showModal('Paste Blocked', 'Tap "Paste" when iOS asks, or long-press the quick add box and paste the SMS there.');
    }
  };

  const pickSuggestion = (suggestion: string) => {
    // Also reuse the tag picked last time for this description
    const tag = expenses.find(e => e.description === suggestion)?.tag;
    onPrefill({ description: suggestion, ...(tag ? { tag } : {}) });
    setDescriptionFocused(false);
  };

  const commitCustomTag = () => {
    if (customTag?.trim()) setField('tag', customTag.trim());
    setCustomTag(null);
  };

  const today = new Date().toLocaleDateString('en-CA');
  const [year, month, day] = form.date.split('-').map(Number);
  const dateLabel = form.date === today
    ? 'Today'
    : new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const [hours, minutes] = form.time.split(':').map(Number);
  const timeLabel = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const tags = availableTags.includes(form.tag) || !form.tag ? availableTags : [...availableTags, form.tag];

  return (
    <div className="px-4 py-4 bg-white sm:rounded-xl sm:shadow-lg">
      <form onSubmit={handleAddExpense} className="space-y-4 pb-24">
        <h2 className="text-xl font-bold text-gray-800">
          {editingExpenseId ? 'Edit' : 'Add'} {isIncome ? 'Income' : 'Expense'}
        </h2>

        {/* Expense / Income */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg" role="radiogroup" aria-label="Transaction type">
          {(['debit', 'credit'] as const).map(type => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={form.type === type}
              onClick={() => setField('type', type)}
              className={`py-2 text-sm font-semibold rounded-md transition ${form.type === type
                ? type === 'credit' ? 'bg-green-600 text-white shadow' : 'bg-indigo-600 text-white shadow'
                : 'text-gray-600'}`}
            >
              {type === 'credit' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>

        {/* Quick add */}
        {!editingExpenseId && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                <input
                  type="text"
                  value={quickText}
                  onChange={handleQuickChange}
                  placeholder='Quick add: "450 swiggy"'
                  aria-label="Quick add"
                  autoComplete="off"
                  enterKeyHint="done"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <button
                type="button"
                onClick={handlePasteSms}
                aria-label="Paste SMS"
                className="flex items-center gap-1 px-3 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg whitespace-nowrap"
              >
                <ClipboardPaste className="w-4 h-4" /> SMS
              </button>
            </div>
            {favorites.length > 0 && (
              <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none]">
                {favorites.map(favorite => (
                  <button
                    key={favorite.description}
                    type="button"
                    onClick={() => {
                      onPrefill({ description: favorite.description, tag: favorite.tag, amount: String(favorite.amount), currency: favorite.currency });
                      setQuickText('');
                    }}
                    className="px-3 py-1.5 text-sm font-medium rounded-full bg-gray-100 text-gray-700 whitespace-nowrap"
                  >
                    {favorite.description} · {favorite.amount}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="amount">Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-semibold text-gray-400">{getCurrencySymbol(form.currency)}</span>
            <input
              type="number"
              inputMode="decimal"
              id="amount"
              name="amount"
              value={form.amount}
              onChange={handleFormChange}
              step="0.01"
              min="0.01"
              required
              placeholder="0"
              className={`${inputClass} pl-12 text-3xl font-bold py-3`}
            />
          </div>
        </div>

        {/* Description */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Description</label>
          <input
            type="text"
            id="description"
            name="description"
            value={form.description}
            onChange={handleFormChange}
            onFocus={() => setDescriptionFocused(true)}
            onBlur={() => setTimeout(() => setDescriptionFocused(false), 200)}
            required
            placeholder="e.g. Groceries at KPN"
            autoComplete="off"
            enterKeyHint="done"
            className={inputClass}
          />
          {descriptionFocused && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => pickSuggestion(suggestion)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag: one tap */}
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Tag</span>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Tag">
            {tags.map(tag => (
              <button
                key={tag}
                type="button"
                role="radio"
                aria-checked={form.tag === tag}
                onClick={() => setField('tag', tag)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition ${form.tag === tag ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {tag}
              </button>
            ))}
            {customTag === null ? (
              <button type="button" onClick={() => setCustomTag('')} className="px-3 py-1.5 text-sm font-medium rounded-full border border-dashed border-gray-300 text-gray-600 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            ) : (
              <input
                type="text"
                value={customTag}
                autoFocus
                onChange={(e) => setCustomTag(e.target.value)}
                onBlur={commitCustomTag}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitCustomTag(); } }}
                placeholder="New tag"
                aria-label="New tag name"
                enterKeyHint="done"
                className="w-32 px-3 py-1 text-base border border-indigo-400 rounded-full"
              />
            )}
          </div>
        </div>

        {/* Date, time, currency: folded into one row */}
        <div className="border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            aria-expanded={showDetails}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700"
          >
            <span>{dateLabel}, {timeLabel} · {form.currency}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition ${showDetails ? 'rotate-180' : ''}`} />
          </button>
          {showDetails && (
            <div className="grid grid-cols-2 gap-3 px-3 pb-3">
              <label className="text-xs text-gray-600">
                Date
                <input type="date" name="date" value={form.date} onChange={handleFormChange} required className={`${inputClass} mt-1`} />
              </label>
              <label className="text-xs text-gray-600">
                Time
                <input type="time" name="time" value={form.time} onChange={handleFormChange} required className={`${inputClass} mt-1`} />
              </label>
              <label className="col-span-2 text-xs text-gray-600">
                Currency
                <select name="currency" value={form.currency} onChange={handleFormChange} className={`${inputClass} mt-1`}>
                  {POPULAR_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.symbol} {c.name}</option>)}
                </select>
              </label>
            </div>
          )}
        </div>

        {/* Trip */}
        {tripOptions.length > 0 && (
          <div className="relative">
            <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select name="tripId" value={form.tripId} onChange={handleFormChange} aria-label="Trip" className={`${inputClass} pl-9`}>
              <option value="">No trip</option>
              {tripOptions.map(([id, trip]) => <option key={id} value={id}>{trip.name}</option>)}
            </select>
          </div>
        )}

        {/* Receipt */}
        {(canAttachReceipt || hasSavedReceipt) && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onReceiptFile(file);
                e.target.value = '';
              }}
            />
            {typeof receiptDraft === 'string' ? (
              <div className="flex items-center gap-3">
                <img src={receiptDraft} alt="Receipt preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                <button type="button" onClick={onRemoveReceipt} className="text-sm font-medium text-red-600">Remove receipt</button>
              </div>
            ) : hasSavedReceipt && receiptDraft === undefined ? (
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="text-gray-700">Receipt:</span>
                <button type="button" onClick={onViewReceipt} className="text-indigo-600">View</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canAttachReceipt} className="text-indigo-600 disabled:opacity-50">Replace</button>
                <button type="button" onClick={onRemoveReceipt} disabled={!canAttachReceipt} className="text-red-600 disabled:opacity-50">Remove</button>
              </div>
            ) : (
              <>
                {receiptDraft === null && <p className="text-xs text-red-600 mb-1">The saved receipt will be removed when you save.</p>}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canAttachReceipt}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" /> Attach receipt
                </button>
              </>
            )}
            {!canAttachReceipt && <p className="text-xs text-gray-500 mt-1">Receipts need you to be online and signed in.</p>}
          </div>
        )}

        {!isOnline && (
          <p className="p-2 text-xs text-orange-600 bg-orange-100 rounded-lg flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1 shrink-0" />
            You are offline. This will be saved locally and sync automatically when you reconnect.
          </p>
        )}

        {/* Actions pinned above the home indicator; the tab bar is hidden on this screen */}
        <div className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-2">
            {editingExpenseId && (
              <button type="button" onClick={onDelete} className="px-4 py-3 text-sm font-semibold text-red-600 bg-red-50 rounded-lg">
                Delete
              </button>
            )}
            <button type="button" onClick={handleFormClose} className="flex-1 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!isAuthenticated && !isOnline)}
              className="flex-[2] py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md disabled:opacity-50"
            >
              {loading ? 'Saving…' : (isOnline && isAuthenticated) ? 'Save' : 'Save locally'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
