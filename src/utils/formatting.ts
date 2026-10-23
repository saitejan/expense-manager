/**
 * Utility functions for formatting dates and currency amounts
 */

/**
 * Converts various timestamp formats to a Date object
 * @param timestamp - Number (milliseconds), Date object, or ISO string
 * @returns Date object
 */
export const timestampToDate = (timestamp: number | Date | string): Date => {
  if (typeof timestamp === 'number') {
    // Firebase Realtime Database timestamp (milliseconds)
    return new Date(timestamp);
  }
  // Handle Date object or ISO string which was saved to local storage
  return new Date(timestamp);
};

/**
 * Formats a number as currency using Intl.NumberFormat
 * Falls back to simple formatting if currency code is invalid
 * @param amount - The numeric amount to format
 * @param dynamicCurrency - Currency code (e.g., 'USD', 'EUR', 'INR')
 * @returns Formatted currency string
 */
export const formatAmount = (amount: number, dynamicCurrency: string, options: { whole?: boolean } = {}): string => {
  // Paise only when there are some: ₹450, ₹946.20. `whole` rounds for tight spaces like month tiles.
  const fractionDigits = options.whole || Math.abs(amount % 1) < 0.005 ? 0 : 2;
  try {
    // Indian grouping for rupees: ₹2,21,234
    return new Intl.NumberFormat(dynamicCurrency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: dynamicCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${dynamicCurrency} ${parseFloat(amount.toFixed(fractionDigits))}`;
  }
};
