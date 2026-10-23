/**
 * List view for displaying and filtering expenses
 * Mobile first: period chips + search up top, tags behind a Filters button, day-grouped rows, page scroll
 */

import React, { useEffect, useRef, useState } from 'react';
import { Search, HardDrive, Mail, ArrowRight, X, Inbox, SlidersHorizontal } from 'lucide-react';
import type { Budgets, Expense, ExchangeRates, FilterMode } from '../../types';
import { TransactionList } from '../../components/common/TransactionList';
import { BudgetCard } from '../../components/common/BudgetCard';
import { ExpenseItemSkeleton } from '../../components/common/ExpenseItemSkeleton';
import { NetworkStatusBadge } from '../../components/common/NetworkStatusBadge';
import { formatAmount } from '../../utils';
import { TAG_COLORS, DEFAULT_TAG_COLOR, PAGINATION_SIZE, GMAIL_PROMO_DISMISSED_KEY } from '../../constants';

interface ListViewProps {
  listViewExpenses: Expense[];
  listViewTotal: number;
  listViewIncome: number;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  filterMode: FilterMode;
  setFilterMode: React.Dispatch<React.SetStateAction<FilterMode>>;
  selectedMonths: string[];
  toggleMonthSelection: (monthKey: string) => void;
  availableMonths: string[];
  customStartDate: string;
  setCustomStartDate: React.Dispatch<React.SetStateAction<string>>;
  customEndDate: string;
  setCustomEndDate: React.Dispatch<React.SetStateAction<string>>;
  searchText: string;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
  selectedTags: string[];
  toggleTagSelection: (tag: string) => void;
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  allAvailableTags: string[];
  handleEditExpense: (id: string) => void;
  currency: string;
  isOnline: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  pendingExpenses: Expense[];
  isGmailConnected: boolean;
  onSyncWithGmail: () => void;
  budgets: Budgets | null;
  spendExpenses: Expense[];
  exchangeRates: ExchangeRates | null;
  onOpenSettings: () => void;
  smsCount: number;
  onReviewSms: () => void;
  onViewReceipt: (id: string) => void;
}

const PERIODS: { mode: FilterMode; label: string; totalLabel: string }[] = [
  { mode: 'current', label: 'This month', totalLabel: 'Spent this month' },
  { mode: 'selected', label: 'Pick months', totalLabel: 'Spent in selected months' },
  { mode: 'custom', label: 'Date range', totalLabel: 'Spent in range' },
  { mode: 'all', label: 'All time', totalLabel: 'Spent all time' },
];

const chipClass = (active: boolean) =>
  `px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition ${active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-indigo-50'}`;

export const ListView: React.FC<ListViewProps> = ({
  listViewExpenses,
  listViewTotal,
  listViewIncome,
  visibleCount,
  setVisibleCount,
  filterMode,
  setFilterMode,
  selectedMonths,
  toggleMonthSelection,
  availableMonths,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  searchText,
  setSearchText,
  selectedTags,
  toggleTagSelection,
  setSelectedTags,
  allAvailableTags,
  handleEditExpense,
  currency,
  isOnline,
  loading,
  isAuthenticated,
  pendingExpenses,
  isGmailConnected,
  onSyncWithGmail,
  budgets,
  spendExpenses,
  exchangeRates,
  onOpenSettings,
  smsCount,
  onReviewSms,
  onViewReceipt,
}) => {
  // Dismissal sticks; it used to come back on every app open
  const [showPromo, setShowPromo] = useState(() => localStorage.getItem(GMAIL_PROMO_DISMISSED_KEY) !== '1');
  const [showTags, setShowTags] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visibleExpenses = listViewExpenses.slice(0, visibleCount);
  const hasMore = visibleCount < listViewExpenses.length;
  const period = PERIODS.find(p => p.mode === filterMode) || PERIODS[0];

  // Load the next page when the end of the list scrolls near the screen (the page scrolls, not a nested box)
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisibleCount(prev => prev + PAGINATION_SIZE); },
      { rootMargin: '400px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visibleCount, setVisibleCount]);

  const choosePeriod = (mode: FilterMode) => {
    setFilterMode(mode);
    setVisibleCount(PAGINATION_SIZE);
  };

  const dismissPromo = () => {
    localStorage.setItem(GMAIL_PROMO_DISMISSED_KEY, '1');
    setShowPromo(false);
  };

  return (
    <div className="px-4 py-4 bg-white sm:rounded-xl sm:shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-800">Transactions</h2>
        <NetworkStatusBadge isOnline={isOnline} pendingCount={pendingExpenses.length} />
      </div>

      {/* Total */}
      <div className="mb-3 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="opacity-90">{period.totalLabel}</span>
          <span className="text-xs opacity-80">{listViewExpenses.length} item{listViewExpenses.length !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-3xl font-extrabold mt-1">{formatAmount(listViewTotal, currency)}</p>
        {listViewIncome > 0 && <p className="text-sm font-semibold mt-1">Income +{formatAmount(listViewIncome, currency)}</p>}
      </div>

      {smsCount > 0 && (
        <button
          onClick={onReviewSms}
          className="mb-3 w-full p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-left hover:bg-amber-100 transition"
        >
          <Inbox className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="flex-1 text-sm font-semibold text-amber-800">
            Inbox: {smsCount} {smsCount !== 1 ? 'entries' : 'entry'} to review
          </span>
          <ArrowRight className="w-4 h-4 text-amber-600" />
        </button>
      )}

      <BudgetCard budgets={budgets} expenses={spendExpenses} exchangeRates={exchangeRates} onSetBudget={onOpenSettings} />

      {!isGmailConnected && showPromo && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-blue-900">Auto-track from Gmail?</p>
            <p className="text-xs text-blue-700 mt-0.5">Import expenses from bank and payment alert emails.</p>
            <button onClick={onSyncWithGmail} className="mt-1.5 flex items-center gap-1 text-xs font-bold text-blue-600">
              Connect <ArrowRight size={14} />
            </button>
          </div>
          <button onClick={dismissPromo} className="p-1 -m-1 text-blue-400 hover:text-blue-600" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search + tag filter toggle */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search"
            aria-label="Search by description"
            className="w-full pl-9 pr-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowTags(v => !v)}
          aria-expanded={showTags}
          aria-label="Filter by tags"
          className={`relative px-3 rounded-lg border ${showTags || selectedTags.length ? 'border-indigo-500 text-indigo-600' : 'border-gray-300 text-gray-600'}`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {selectedTags.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 text-xs font-bold text-white bg-indigo-600 rounded-full flex items-center justify-center">
              {selectedTags.length}
            </span>
          )}
        </button>
      </div>

      {/* Period chips: one swipeable row */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-3 [scrollbar-width:none]">
        {PERIODS.map(p => (
          <button key={p.mode} onClick={() => choosePeriod(p.mode)} className={chipClass(filterMode === p.mode)}>
            {p.label}
          </button>
        ))}
      </div>

      {filterMode === 'selected' && (
        <div className="flex gap-2 flex-wrap mb-3 max-h-32 overflow-y-auto">
          {availableMonths.map(monthKey => {
            const [year, month] = monthKey.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
            return (
              <button key={monthKey} onClick={() => toggleMonthSelection(monthKey)} className={chipClass(selectedMonths.includes(monthKey))}>
                {monthName}
              </button>
            );
          })}
        </div>
      )}

      {filterMode === 'custom' && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="text-xs text-gray-600">
            From
            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="mt-1 w-full p-2 text-base border border-gray-300 rounded-lg" />
          </label>
          <label className="text-xs text-gray-600">
            To
            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="mt-1 w-full p-2 text-base border border-gray-300 rounded-lg" />
          </label>
        </div>
      )}

      {showTags && (
        <div className="mb-3 p-3 bg-gray-50 rounded-xl">
          <div className="flex gap-2 flex-wrap">
            {allAvailableTags.map(tag => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTagSelection(tag)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1 text-sm font-medium rounded-full border-2 transition ${isSelected ? `${TAG_COLORS[tag] || DEFAULT_TAG_COLOR} ring-2 ring-offset-1 ring-indigo-400` : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {selectedTags.length > 0 && (
            <button onClick={() => setSelectedTags([])} className="mt-2 text-sm text-indigo-600 font-medium">
              Clear tags
            </button>
          )}
        </div>
      )}

      {loading && isAuthenticated && listViewExpenses.length === 0 ? (
        <ExpenseItemSkeleton count={5} />
      ) : listViewExpenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed rounded-xl">
          <HardDrive className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          No expenses found for this filter.
        </div>
      ) : (
        <div className="animate-fade-in">
          <TransactionList
            expenses={visibleExpenses}
            currency={currency}
            exchangeRates={exchangeRates}
            onEdit={handleEditExpense}
            onViewReceipt={onViewReceipt}
          />
          {hasMore && <div ref={sentinelRef} className="py-4 text-center text-sm text-gray-400">Loading more…</div>}
        </div>
      )}
    </div>
  );
};
