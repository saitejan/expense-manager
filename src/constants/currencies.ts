/**
 * Currency constants and utilities
 */

export interface Currency {
    code: string;
    symbol: string;
    name: string;
}

/**
 * Popular currencies with INR and USD at the top
 */
export const POPULAR_CURRENCIES: Currency[] = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso' },
];

/**
 * Currency symbol mapping for quick lookup
 */
export const CURRENCY_SYMBOLS: Record<string, string> = POPULAR_CURRENCIES.reduce(
    (acc, currency) => {
        acc[currency.code] = currency.symbol;
        return acc;
    },
    {} as Record<string, string>
);

/**
 * Get currency symbol for a given currency code
 * @param currencyCode - 3-letter currency code
 * @returns Currency symbol or the code itself if not found
 */
export const getCurrencySymbol = (currencyCode: string): string => {
    return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
};
