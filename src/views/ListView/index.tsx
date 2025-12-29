/**
 * List view for displaying and filtering expenses
 * Features: multiple filter modes, search, tag filtering, infinite scroll
 */

import React from 'react';
import { DollarSign, Search, HardDrive, Mail, ArrowRight, X } from 'lucide-react';
import type { Expense, FilterMode } from '../../types';
import { ExpenseItem } from '../../components/common/ExpenseItem';
import { NetworkStatusBadge } from '../../components/common/NetworkStatusBadge';
import { formatAmount } from '../../utils';
import { TAG_COLORS, DEFAULT_TAG_COLOR, PAGINATION_SIZE, SCROLL_THRESHOLD } from '../../constants';

interface ListViewProps {
  listViewExpenses: Expense[];
  listViewTotal: number;
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
  handleDeleteExpense: (id: string) => void;
  handleEditExpense: (id: string) => void;
  currency: string;
  isOnline: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  pendingExpenses: Expense[];
  isGmailConnected: boolean;
  onSyncWithGmail: () => void;
}

/**
 * Main list view with comprehensive filtering options
 * Supports date range, month selection, search, and tag filters
 */
export const ListView: React.FC<ListViewProps> = ({
  listViewExpenses,
  listViewTotal,
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
  handleDeleteExpense,
  handleEditExpense,
  currency,
  isOnline,
  loading,
  isAuthenticated,
  pendingExpenses,
  isGmailConnected,
  onSyncWithGmail,
}) => {
  const [showPromo, setShowPromo] = React.useState(true);
  const visibleExpenses = listViewExpenses.slice(0, visibleCount);
  const hasMore = visibleCount < listViewExpenses.length;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + SCROLL_THRESHOLD;
    if (bottom && hasMore) {
      setVisibleCount(prev => prev + PAGINATION_SIZE);
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-indigo-500" />
          Transactions
        </h2>
        <NetworkStatusBadge isOnline={isOnline} pendingCount={pendingExpenses.length} />
      </div>

      {/* Total Amount Display */}
      <div className="mb-4 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-md">
        <div className="text-white">
          <p className="text-sm font-medium opacity-90">Total Amount</p>
          <p className="text-3xl font-extrabold">{formatAmount(listViewTotal, currency)}</p>
          <p className="text-xs opacity-80 mt-1">{listViewExpenses.length} transaction{listViewExpenses.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Gmail Connect Promo (only for local users or connected users who haven't enabled Gmail sync) */}
      {!isGmailConnected && showPromo && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg relative overflow-hidden group">
          <button
            onClick={() => setShowPromo(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-white transition-colors z-10"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 shrink-0">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900">Auto-track transactions?</h3>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                Connect your Gmail to automatically import expenses from bank and payment alerts.
              </p>
              <button
                onClick={onSyncWithGmail}
                className="mt-2 flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors group-hover:gap-2"
              >
                Connect Now <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Decorative background element */}
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-100 rounded-full opacity-50 pointer-events-none" />
        </div>
      )}

      {/* Filter Controls */}
      <div className="mb-4 space-y-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilterMode('all'); setVisibleCount(PAGINATION_SIZE); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
          >
            All Time
          </button>
          <button
            onClick={() => { setFilterMode('current'); setVisibleCount(PAGINATION_SIZE); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'current' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
          >
            Current Month
          </button>
          <button
            onClick={() => { setFilterMode('selected'); setVisibleCount(PAGINATION_SIZE); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'selected' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
          >
            Select Months
          </button>
          <button
            onClick={() => { setFilterMode('custom'); setVisibleCount(PAGINATION_SIZE); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'custom' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
          >
            Custom Range
          </button>
        </div>

        {/* Month Selection */}
        {filterMode === 'selected' && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Select months to view:</p>
            <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
              {availableMonths.map(monthKey => {
                const [year, month] = monthKey.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <button
                    key={monthKey}
                    onClick={() => toggleMonthSelection(monthKey)}
                    className={`px-2 py-1 text-xs font-medium rounded transition ${selectedMonths.includes(monthKey) ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Date Range */}
        {filterMode === 'custom' && (
          <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Search by Description */}
        <div className="pt-2 border-t border-gray-200">
          <label className="block text-xs text-gray-600 mb-1">Search by Description</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Type to search..."
              className="w-full pl-10 pr-4 p-2 text-sm border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Tag Filter */}
        <div className="pt-2 border-t border-gray-200">
          <label className="block text-xs text-gray-600 mb-2">Filter by Tags</label>
          <div className="flex gap-2 flex-wrap">
            {allAvailableTags.map(tag => {
              const tagColor = TAG_COLORS[tag] || DEFAULT_TAG_COLOR;
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTagSelection(tag)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border-2 transition ${isSelected
                      ? tagColor + ' ring-2 ring-offset-1 ring-indigo-400'
                      : 'bg-white text-gray-600 border-gray-200 hover:' + tagColor
                    }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear tag filters
            </button>
          )}
        </div>
      </div>

      {/* Transaction Count */}
      <div className="mb-3 text-sm text-gray-600">
        Showing {visibleExpenses.length} of {listViewExpenses.length} transactions
      </div>

      {loading && isAuthenticated ? (
        <div className="text-center py-8 text-gray-500">Loading cloud expenses...</div>
      ) : listViewExpenses.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
          <HardDrive className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          No expenses found for the selected filter.
        </div>
      ) : (
        <div
          className="space-y-3"
          style={{ maxHeight: "50vh", overflowY: "auto" }}
          onScroll={handleScroll}
        >
          {visibleExpenses.map(expense => (
            <ExpenseItem
              key={expense.id}
              showDate={true}
              expense={expense}
              onDelete={handleDeleteExpense}
              onEdit={handleEditExpense}
              currency={currency}
              isOnline={isOnline}
            />
          ))}
          {hasMore && (
            <div className="text-center py-4 text-sm text-gray-500">
              Scroll for more...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
