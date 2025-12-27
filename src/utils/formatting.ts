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
export const formatAmount = (amount: number, dynamicCurrency: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: dynamicCurrency,
    }).format(amount);
  } catch (e) {
    return `${dynamicCurrency} ${parseFloat(amount.toFixed(2))}`;
  }
};
