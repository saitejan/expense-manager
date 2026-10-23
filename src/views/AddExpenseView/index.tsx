/**
 * Add/Edit expense form view with autocomplete and tag selection
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlusCircle, Edit2, DollarSign, Tag, AlertTriangle, Zap, ClipboardPaste, Camera, Plane } from 'lucide-react';
import type { FormState, Expense, Trip } from '../../types';
import { MAX_SUGGESTIONS } from '../../constants';
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
  currency: string;
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
}

/**
 * Form for adding or editing expenses
 * Features autocomplete suggestions and searchable tag dropdown
 */
export const AddExpenseView: React.FC<AddExpenseViewProps> = ({
  form,
  handleFormClose,
  handleFormChange,
  handleAddExpense,
  loading,
  isAuthenticated,
  isOnline,
  currency,
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
}) => {
  const [quickText, setQuickText] = useState('');
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

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagSearchText, setTagSearchText] = useState('');
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const tagInputRef = useRef<HTMLDivElement>(null);

  // Get unique descriptions from previous expenses (latest first)
  const uniqueDescriptions = useMemo(() => {
    const sortedExpenses = [...expenses].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const seen = new Set<string>();
    const uniqueDescs: string[] = [];

    sortedExpenses.forEach(expense => {
      if (!seen.has(expense.description)) {
        seen.add(expense.description);
        uniqueDescs.push(expense.description);
      }
    });

    return uniqueDescs;
  }, [expenses]);

  // Filter description suggestions based on current input
  useEffect(() => {
    if (form.description.trim().length > 0) {
      const filtered = uniqueDescriptions.filter(desc =>
        desc.toLowerCase().includes(form.description.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      // Only while typing in the field, not after quick add / favorites fill it
      setShowSuggestions(filtered.length > 0 && document.activeElement === descriptionInputRef.current);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [form.description, uniqueDescriptions]);

  // Filter tags based on search text
  useEffect(() => {
    if (tagSearchText.trim().length > 0) {
      const filtered = availableTags.filter(tag =>
        tag.toLowerCase().includes(tagSearchText.toLowerCase())
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(availableTags);
    }
  }, [tagSearchText, availableTags]);

  // Close tag dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    };

    if (showTagDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTagDropdown]);

  const handleSuggestionClick = (suggestion: string) => {
    // Also reuse the tag picked last time for this description
    const tag = expenses.find(e => e.description === suggestion)?.tag;
    onPrefill({ description: suggestion, ...(tag ? { tag } : {}) });
    setShowSuggestions(false);
  };

  const handleTagSelect = (tag: string) => {
    const syntheticEvent = {
      target: {
        name: 'tag',
        value: tag
      }
    } as React.ChangeEvent<HTMLInputElement>;
    handleFormChange(syntheticEvent);
    setShowTagDropdown(false);
    setTagSearchText('');
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagSearchText(e.target.value);
    handleFormChange(e);
  };

  const handleAddCustomTag = () => {
    if (tagSearchText.trim().length > 0) {
      handleTagSelect(tagSearchText.trim());
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
        {editingExpenseId ? <Edit2 className="w-5 h-5 mr-2 text-indigo-500" /> : <PlusCircle className="w-5 h-5 mr-2 text-indigo-500" />}
        {editingExpenseId ? 'Edit' : 'Add New'} {isIncome ? 'Income' : 'Expense'}
      </h2>
      <form onSubmit={handleAddExpense} className="space-y-4">
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
                : 'text-gray-600 hover:bg-white'}`}
            >
              {type === 'credit' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>

        {/* Quick add */}
        {!editingExpenseId && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="quick-add">Quick add</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                <input
                  id="quick-add"
                  type="text"
                  value={quickText}
                  onChange={handleQuickChange}
                  placeholder='e.g. "450 swiggy" or paste an SMS'
                  autoComplete="off"
                  enterKeyHint="done"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={handlePasteSms}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 whitespace-nowrap"
              >
                <ClipboardPaste className="w-4 h-4" /> Paste SMS
              </button>
            </div>
            {favorites.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {favorites.map(favorite => (
                  <button
                    key={favorite.description}
                    type="button"
                    onClick={() => {
                      onPrefill({ description: favorite.description, tag: favorite.tag, amount: String(favorite.amount), currency: favorite.currency });
                      setQuickText('');
                    }}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700"
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
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="amount">Amount ({currency})</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              id="amount"
              name="amount"
              value={form.amount}
              onChange={handleFormChange}
              step="0.01"
              min="0.01"
              required
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
              placeholder="e.g., 49.99"
            />
          </div>
        </div>

        {/* Currency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currency-select">
            Currency
          </label>
          <select
            id="currency-select"
            name="currency"
            value={form.currency || currency}
            onChange={handleFormChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            required
          >
            <option value="INR">INR - ₹ Indian Rupee</option>
            <option value="USD">USD - $ US Dollar</option>
            <option value="EUR">EUR - € Euro</option>
            <option value="GBP">GBP - £ British Pound</option>
            <option value="JPY">JPY - ¥ Japanese Yen</option>
            <option value="CNY">CNY - ¥ Chinese Yuan</option>
            <option value="AUD">AUD - A$ Australian Dollar</option>
            <option value="CAD">CAD - C$ Canadian Dollar</option>
            <option value="CHF">CHF - Fr Swiss Franc</option>
            <option value="SGD">SGD - S$ Singapore Dollar</option>
            <option value="AED">AED - د.إ UAE Dirham</option>
            <option value="SAR">SAR - ﷼ Saudi Riyal</option>
            <option value="KRW">KRW - ₩ South Korean Won</option>
            <option value="BRL">BRL - R$ Brazilian Real</option>
            <option value="MXN">MXN - Mex$ Mexican Peso</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select the currency for this expense
          </p>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={form.date}
              onChange={handleFormChange}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="time">Time</label>
            <input
              type="time"
              id="time"
              name="time"
              value={form.time}
              onChange={handleFormChange}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            />
          </div>
        </div>

        {/* Description */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Description (Why)</label>
          <input
            type="text"
            id="description"
            name="description"
            value={form.description}
            onChange={handleFormChange}
            onFocus={() => form.description.trim().length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            ref={descriptionInputRef}
            required
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            placeholder="e.g., Groceries at Whole Foods"
            autoComplete="off"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredSuggestions.slice(0, MAX_SUGGESTIONS).map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition duration-150 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tag">
            Category Tag
            <span className="text-xs text-gray-500 ml-2">(Click to change or type custom)</span>
          </label>
          <div className="relative" ref={tagInputRef}>
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
            <div
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus-within:ring-indigo-500 focus-within:border-indigo-500 transition duration-150 bg-white cursor-pointer flex items-center justify-between"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
            >
              <span className={form.tag ? "text-gray-800" : "text-gray-400"}>
                {form.tag || "Select a tag"}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
            <input
              type="hidden"
              id="tag"
              name="tag"
              value={form.tag}
              required
            />
            {showTagDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-gray-200">
                  <input
                    type="text"
                    value={tagSearchText}
                    onChange={handleTagInputChange}
                    placeholder="Search or type custom tag..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    autoFocus
                  />
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagSelect(tag)}
                      className={`w-full text-left px-4 py-2 hover:bg-indigo-50 transition duration-150 text-sm border-b border-gray-100 last:border-b-0 ${form.tag === tag ? 'bg-indigo-100 font-semibold text-indigo-700' : 'text-gray-700'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                  {tagSearchText && !filteredTags.includes(tagSearchText) && (
                    <button
                      type="button"
                      onClick={handleAddCustomTag}
                      className="w-full text-left px-4 py-2 bg-green-50 hover:bg-green-100 transition duration-150 text-sm text-green-700 font-medium border-t-2 border-green-200"
                    >
                      + Add "{tagSearchText}" as new tag
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trip */}
        {tripOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tripId">Trip</label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                id="tripId"
                name="tripId"
                value={form.tripId}
                onChange={handleFormChange}
                className="w-full pl-9 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">No trip</option>
                {tripOptions.map(([id, trip]) => <option key={id} value={id}>{trip.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Receipt */}
        {(canAttachReceipt || hasSavedReceipt) && (
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Receipt</span>
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
                <button type="button" onClick={onRemoveReceipt} className="text-sm font-medium text-red-600 hover:text-red-800">Remove</button>
              </div>
            ) : hasSavedReceipt && receiptDraft === undefined ? (
              <div className="flex items-center gap-4 text-sm font-medium">
                <button type="button" onClick={onViewReceipt} className="text-indigo-600 hover:text-indigo-800">View</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canAttachReceipt} className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50">Replace</button>
                <button type="button" onClick={onRemoveReceipt} disabled={!canAttachReceipt} className="text-red-600 hover:text-red-800 disabled:opacity-50">Remove</button>
              </div>
            ) : (
              <>
                {receiptDraft === null && <p className="text-xs text-red-600 mb-1">The saved receipt will be removed when you save.</p>}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canAttachReceipt}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" /> Attach photo
                </button>
              </>
            )}
            {!canAttachReceipt && <p className="text-xs text-gray-500 mt-1">Receipts need you to be online and signed in.</p>}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleFormClose}
            className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || (!isAuthenticated && !isOnline)}
            className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isOnline && isAuthenticated) ? 'Save to Cloud' : 'Save Locally'}
          </button>
        </div>
      </form>
      {!isOnline && (
        <p className="mt-4 p-2 text-xs text-orange-600 bg-orange-100 rounded-lg flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          You are offline. This expense will be saved locally and sync automatically when you reconnect.
        </p>
      )}
    </div>
  );
};
