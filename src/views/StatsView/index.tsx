/**
 * Statistics view showing yearly and monthly expense summaries
 */

import React from 'react';
import { Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Expense, AnnualTotal } from '../../types';
import { ExpenseItem } from '../../components/common/ExpenseItem';
import { formatAmount } from '../../utils';

interface StatsViewProps {
  filterYear: number;
  setFilterYear: React.Dispatch<React.SetStateAction<number>>;
  filterMonth: number;
  setFilterMonth: React.Dispatch<React.SetStateAction<number>>;
  annualTotals: AnnualTotal[];
  filteredExpenses: Expense[];
  monthlyTotal: number;
  filterDateString: string;
  availableYears: number[];
  handlePrevYear: () => void;
  handleNextYear: () => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleDeleteExpense: (id: string) => void;
  handleEditExpense: (id: string) => void;
  currency: string;
  isOnline: boolean;
}

/**
 * Financial overview with yearly grid and monthly transaction details
 */
export const StatsView: React.FC<StatsViewProps> = ({
  filterYear,
  filterMonth,
  setFilterMonth,
  annualTotals,
  filteredExpenses,
  monthlyTotal,
  filterDateString,
  availableYears,
  handlePrevYear,
  handleNextYear,
  handlePrevMonth,
  handleNextMonth,
  handleDeleteExpense,
  handleEditExpense,
  currency,
  isOnline,
}) => {
  const handleMonthClick = (monthIndex: number) => {
    setFilterMonth(monthIndex);
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
        <Calendar className="w-5 h-5 mr-2 text-green-500" />
        Financial Overview
      </h2>

      {/* Year Selector */}
      <div className="flex justify-between items-center mb-6 p-3 bg-indigo-50 rounded-lg shadow-inner">
        <button onClick={handlePrevYear} className="p-2 text-indigo-700 hover:bg-indigo-200 rounded-full transition duration-150">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-grow text-center">
          <h3 className="text-xl font-bold text-indigo-800">{filterYear}</h3>
          {availableYears.length > 0 && (
            <p className="text-xs text-indigo-600 mt-1">
              Available: {availableYears.join(', ')}
            </p>
          )}
        </div>
        <button onClick={handleNextYear} className="p-2 text-indigo-700 hover:bg-indigo-200 rounded-full transition duration-150">
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Annual Summary */}
      <div className="mb-8 border border-gray-200 rounded-xl p-4 bg-gray-50">
        <h3 className="text-xl font-semibold mb-3 text-gray-700">Yearly Snapshot</h3>
        <p className="text-xs text-gray-500 mb-3">Click on any month to view transactions below</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {annualTotals.map((data, index) => {
            const isSelected = filterMonth === index;
            return (
              <button
                key={index}
                onClick={() => handleMonthClick(index)}
                className={`p-2 text-center bg-white rounded-lg shadow-sm border-2 transition cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-300 shadow-md'
                    : 'border-indigo-100 hover:shadow-md hover:border-indigo-300'
                }`}
              >
                <div className="text-xs font-medium text-indigo-600">{data.monthName}</div>
                <div className="text-sm font-bold text-gray-900">{formatAmount(data.total, currency)}</div>
                <div className="text-xs text-gray-500">{data.count} items</div>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Year Total Expense:
          <span className="font-bold text-indigo-600 ml-1">
            {formatAmount(annualTotals.reduce((sum, m) => sum + m.total, 0), currency)}
          </span>
        </p>
      </div>

      {/* Monthly Filter and Total */}
      <div className="flex justify-between items-center mb-6 p-3 bg-green-50 rounded-lg shadow-inner">
        <button onClick={handlePrevMonth} className="p-2 text-green-700 hover:bg-green-200 rounded-full transition duration-150">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="lg:text-lg font-semibold text-green-800 flex-grow text-center">
          {filterDateString} Total:
          <span className="font-extrabold ml-2">{formatAmount(monthlyTotal, currency)}</span>
        </h3>
        <button onClick={handleNextMonth} className="p-2 text-green-700 hover:bg-green-200 rounded-full transition duration-150">
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Monthly Transaction List */}
      <h3 className="text-xl font-semibold mb-3 text-gray-700">
        Transactions in {filterDateString} ({filteredExpenses.length})
      </h3>
      {filteredExpenses.length === 0 ? (
        <p className="text-center text-gray-500 py-6 border border-dashed rounded-lg">No expenses recorded for this month.</p>
      ) : (
        <div className="space-y-3" style={{ maxHeight: "50vh", overflowY: "auto" }}>
          {filteredExpenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              onDelete={handleDeleteExpense}
              onEdit={handleEditExpense}
              showDate={true}
              currency={currency}
              isOnline={isOnline}
            />
          ))}
        </div>
      )}
    </div>
  );
};
