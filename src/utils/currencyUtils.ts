/**
 * Currency conversion utilities for stats view
 */

import type { Expense, ExchangeRates } from '../types';

/**
 * Calculate total in specified currency using hybrid approach
 * - For INR/USD: Use stored amountINR/amountUSD (fast, historically accurate)
 * - For other currencies: Convert on-the-fly from USD (shows disclaimer)
 */
export const calculateTotalInCurrency = (
    expenses: Expense[],
    targetCurrency: string,
    rates: ExchangeRates | null
): { total: number; needsDisclaimer: boolean } => {
    // Fast path for INR
    if (targetCurrency === 'INR') {
        return {
            total: expenses.reduce((sum, e) => sum + (e.amountINR || 0), 0),
            needsDisclaimer: false,
        };
    }

    // Fast path for USD
    if (targetCurrency === 'USD') {
        return {
            total: expenses.reduce((sum, e) => sum + (e.amountUSD || 0), 0),
            needsDisclaimer: false,
        };
    }

    // Other currencies: convert on-the-fly
    if (!rates) {
        return { total: 0, needsDisclaimer: true };
    }

    const hasMixedCurrencies = new Set(expenses.map(e => e.currency)).size > 1;

    const total = expenses.reduce((sum, expense) => {
        // If expense is already in target currency, use original amount
        if (expense.currency === targetCurrency) {
            return sum + expense.amount;
        }

        // Convert from USD to target currency
        const toRate = rates.rates[targetCurrency];
        if (!toRate) {
            console.warn(`Exchange rate not found for ${targetCurrency}`);
            return sum + (expense.amountUSD || 0); // Fallback to USD
        }

        const converted = (expense.amountUSD || 0) * toRate;
        return sum + converted;
    }, 0);

    return {
        total,
        needsDisclaimer: hasMixedCurrencies,
    };
};

/**
 * Get amount for a single expense in target currency
 */
export const getExpenseAmountInCurrency = (
    expense: Expense,
    targetCurrency: string,
    rates: ExchangeRates | null
): number => {
    // Fast paths
    if (targetCurrency === 'INR') return expense.amountINR || 0;
    if (targetCurrency === 'USD') return expense.amountUSD || 0;
    if (expense.currency === targetCurrency) return expense.amount;

    // Convert from USD
    if (!rates) return expense.amountUSD || 0;

    const toRate = rates.rates[targetCurrency];
    if (!toRate) return expense.amountUSD || 0;

    return (expense.amountUSD || 0) * toRate;
};
