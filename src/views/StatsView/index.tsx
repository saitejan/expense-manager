/**
 * Statistics view showing yearly and monthly expense summaries with trend charts
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, ArrowLeft, ArrowRight, BarChart3, Grid3x3 } from 'lucide-react';
import type { Expense, AnnualTotal, ExchangeRates } from '../../types';
import { ExpenseItem } from '../../components/common/ExpenseItem';
import { formatAmount } from '../../utils';
import { ExpenseTrendChart } from '../../components/charts/ExpenseTrendChart';
import { CategoryBreakdown } from '../../components/charts/CategoryBreakdown';
import { DescriptionAnalysis } from '../../components/charts/DescriptionAnalysis';
import type { ChartType, TimeView } from '../../components/charts/ExpenseTrendChart';

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
  allExpenses: Expense[];
  statsCurrency: string;
  updateStatsCurrency: (currency: string) => void;
  exchangeRates: ExchangeRates | null;
}

/**
 * Financial overview with yearly grid, monthly transaction details, and trend charts
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
  allExpenses,
  statsCurrency,
  updateStatsCurrency,
  exchangeRates,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'chart'>('grid');
  const [timeView, setTimeView] = useState<TimeView>('monthly');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Clear category selection when time view changes
  useEffect(() => {
    setSelectedCategory(null);
  }, [timeView]);

  const handleMonthClick = (monthIndex: number) => {
    setFilterMonth(monthIndex);
  };

  // Helper function to get amount in user's currency
  const getAmountInCurrency = (expense: Expense): number => {
    if (currency === 'INR') {
      return expense.amountINR || expense.amount;
    } else if (currency === 'USD') {
      return expense.amountUSD || expense.amount;
    } else if (currency === 'TODO') {
      // TODO
        if(statsCurrency === 'EUR') {
          updateStatsCurrency('USD');
        }
        return expense.amount;
    } 
    else {
      // For other currencies, convert from USD using live rates
      if (expense.currency === currency) {
        return expense.amount;
      }
      // Convert USD to target currency using live rates
      if (exchangeRates && exchangeRates.rates[currency]) {
        return (expense.amountUSD || expense.amount) * exchangeRates.rates[currency];
      }
      // Fallback to USD amount if no rate available
      return expense.amountUSD || expense.amount;
    }
  };

  // Compute chart data based on time view
  const chartData = useMemo(() => {
    const yearExpenses = allExpenses.filter(
      e => e.timestamp.getFullYear() === filterYear
    );

    switch (timeView) {
      case 'daily': {
        // Group by day for the selected month
        const monthExpenses = yearExpenses.filter(
          e => e.timestamp.getMonth() === filterMonth
        );
        const dailyData: { [key: string]: { amount: number; count: number } } = {};

        monthExpenses.forEach(expense => {
          const day = expense.timestamp.getDate();
          const key = `${day}`;
          if (!dailyData[key]) {
            dailyData[key] = { amount: 0, count: 0 };
          }
          dailyData[key].amount += getAmountInCurrency(expense);
          dailyData[key].count += 1;
        });

        // Get all days in the month
        const daysInMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => ({
          name: `${i + 1}`,
          amount: dailyData[`${i + 1}`]?.amount || 0,
          count: dailyData[`${i + 1}`]?.count || 0,
        }));
      }

      case 'monthly': {
        // Use annual totals
        return annualTotals.map(data => ({
          name: data.monthName,
          amount: data.total,
          count: data.count,
        }));
      }

      case 'yearly': {
        // Group by year for all available years
        const yearlyData: { [key: number]: { amount: number; count: number } } = {};

        allExpenses.forEach(expense => {
          const year = expense.timestamp.getFullYear();
          if (!yearlyData[year]) {
            yearlyData[year] = { amount: 0, count: 0 };
          }
          yearlyData[year].amount += getAmountInCurrency(expense);
          yearlyData[year].count += 1;
        });

        return Object.entries(yearlyData)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([year, data]) => ({
            name: year,
            amount: data.amount,
            count: data.count,
          }));
      }

      default:
        return [];
    }
  }, [allExpenses, filterYear, filterMonth, timeView, annualTotals, currency]);

  // Time-scoped expenses for category and description analysis
  const scopedExpenses = useMemo(() => {
    return timeView === 'yearly'
      ? allExpenses
      : timeView === 'monthly'
        ? allExpenses.filter(e => e.timestamp.getFullYear() === filterYear)
        : filteredExpenses;
  }, [allExpenses, filterYear, timeView, filteredExpenses]);

  // Compute category breakdown data with enriched metrics
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, { amount: number; count: number }> = {};

    scopedExpenses.forEach(expense => {
      const tag = expense.tag;
      if (!categoryTotals[tag]) {
        categoryTotals[tag] = { amount: 0, count: 0 };
      }
      categoryTotals[tag].amount += getAmountInCurrency(expense);
      categoryTotals[tag].count += 1;
    });

    const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v.amount, 0);

    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .map(([tag, data]) => ({
        name: tag,
        amount: data.amount,
        count: data.count,
        percentage: grandTotal > 0 ? (data.amount / grandTotal) * 100 : 0,
        avgPerTransaction: data.count > 0 ? data.amount / data.count : 0,
      }));
  }, [scopedExpenses, currency]);

  // Filtered expenses for selected category drill-down
  const categoryFilteredExpenses = useMemo(() => {
    if (!selectedCategory) return [];
    return scopedExpenses.filter(e => e.tag === selectedCategory);
  }, [selectedCategory, scopedExpenses]);

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      {/* Header with View Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-green-500" />
          Financial Overview
        </h2>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p - 2 rounded - lg transition ${viewMode === 'grid'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              } `}
            title="Grid View"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`p - 2 rounded - lg transition ${viewMode === 'chart'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              } `}
            title="Chart View"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chart View Controls */}
      {viewMode === 'chart' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
          {/* Time Period Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeView('daily')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${timeView === 'daily'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-indigo-50'
                  }`}
              >
                Daily
              </button>
              <button
                onClick={() => setTimeView('monthly')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${timeView === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-indigo-50'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTimeView('yearly')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${timeView === 'yearly'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-indigo-50'
                  }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Chart Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('bar')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${chartType === 'bar'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-indigo-50'
                  }`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${chartType === 'line'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-indigo-50'
                  }`}
              >
                Line
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition ${chartType === 'pie'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-indigo-50'
                  }`}
              >
                Pie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart View */}
      {viewMode === 'chart' ? (
        <div className="space-y-6">
          {/* Year/Month Selector for Daily/Monthly views */}
          {timeView !== 'yearly' && (
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg shadow-inner">
              <button onClick={handlePrevYear} className="p-2 text-indigo-700 hover:bg-indigo-200 rounded-full transition duration-150">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-grow text-center">
                <h3 className="text-xl font-bold text-indigo-800">
                  {timeView === 'daily' ? filterDateString : filterYear}
                </h3>
              </div>
              <button onClick={handleNextYear} className="p-2 text-indigo-700 hover:bg-indigo-200 rounded-full transition duration-150">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Trend Chart */}
          <ExpenseTrendChart
            data={chartData}
            chartType={chartType}
            currency={currency}
            title={`${timeView === 'daily' ? 'Daily' : timeView === 'monthly' ? 'Monthly' : 'Yearly'} Expense Trend`}
            height={350}
          />

          {/* Enhanced Category Breakdown */}
          <CategoryBreakdown
            categoryData={categoryData}
            currency={currency}
            onCategoryClick={setSelectedCategory}
            selectedCategory={selectedCategory}
          />

          {/* Category drill-down transactions */}
          {selectedCategory && categoryFilteredExpenses.length > 0 && (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-fade-in">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-lg font-semibold text-gray-800">
                  {selectedCategory} Transactions ({categoryFilteredExpenses.length})
                </h4>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Clear filter
                </button>
              </div>
              <div className="space-y-3" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                {categoryFilteredExpenses.map(expense => (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    onDelete={handleDeleteExpense}
                    onEdit={handleEditExpense}
                    showDate
                    currency={currency}
                    isOnline={isOnline}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Description Analysis */}
          <DescriptionAnalysis
            expenses={scopedExpenses}
            currency={currency}
            getAmountInCurrency={getAmountInCurrency}
            topN={10}
          />

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-lg shadow-md text-white">
              <p className="text-sm opacity-90">Total Expenses</p>
              <p className="text-2xl font-bold">
                {formatAmount(
                  chartData.reduce((sum, item) => sum + item.amount, 0),
                  currency
                )}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-teal-600 p-4 rounded-lg shadow-md text-white">
              <p className="text-sm opacity-90">Total Transactions</p>
              <p className="text-2xl font-bold">
                {chartData.reduce((sum, item) => sum + (item.count || 0), 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-lg shadow-md text-white">
              <p className="text-sm opacity-90">Average</p>
              <p className="text-2xl font-bold">
                {formatAmount(
                  chartData.reduce((sum, item) => sum + item.amount, 0) /
                  (chartData.filter(item => item.amount > 0).length || 1),
                  currency
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Grid View - Original content */}
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
                    className={`p - 2 text - center bg - white rounded - lg shadow - sm border - 2 transition cursor - pointer ${isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-300 shadow-md'
                      : 'border-indigo-100 hover:shadow-md hover:border-indigo-300'
                      } `}
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
        </>
      )}
    </div>
  );
};
