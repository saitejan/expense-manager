/**
 * Exchange Rate Service
 * Fetches and caches exchange rates for currency conversion
 */

import { EXCHANGE_RATES_KEY, CREATION_CACHE_DURATION, STATS_CACHE_DURATION } from '../../constants';

export interface ExchangeRates {
    base: string;
    timestamp: number;
    rates: Record<string, number>;
}

const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const FALLBACK_API_URL = 'https://open.er-api.com/v6/latest/USD';

/**
 * Check if cached rates are still valid
 */
const isCacheValid = (purpose: 'creation' | 'stats'): boolean => {
    const cached = localStorage.getItem(EXCHANGE_RATES_KEY);
    if (!cached) return false;

    try {
        const data: ExchangeRates = JSON.parse(cached);
        const now = Date.now();
        const cacheDuration = purpose === 'creation' ? CREATION_CACHE_DURATION : STATS_CACHE_DURATION;

        return (now - data.timestamp) < cacheDuration;
    } catch {
        return false;
    }
};

/**
 * Fetch exchange rates from API
 */
export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Primary API failed');

        const data = await response.json();

        const rates: ExchangeRates = {
            base: data.base || 'USD',
            timestamp: Date.now(),
            rates: data.rates || {},
        };

        // Cache the rates
        localStorage.setItem(EXCHANGE_RATES_KEY, JSON.stringify(rates));

        return rates;
    } catch (error) {
        console.error('Primary exchange rate API failed, trying fallback...', error);

        // Try fallback API
        try {
            const response = await fetch(FALLBACK_API_URL);
            if (!response.ok) throw new Error('Fallback API failed');

            const data = await response.json();

            const rates: ExchangeRates = {
                base: data.base || 'USD',
                timestamp: Date.now(),
                rates: data.rates || {},
            };

            localStorage.setItem(EXCHANGE_RATES_KEY, JSON.stringify(rates));

            return rates;
        } catch (fallbackError) {
            console.error('Fallback exchange rate API also failed', fallbackError);
            throw new Error('Unable to fetch exchange rates. Please check your internet connection.');
        }
    }
};

/**
 * Get exchange rates (from cache or fetch)
 */
export const getExchangeRates = async (purpose: 'creation' | 'stats'): Promise<ExchangeRates> => {
    // Check cache first
    if (isCacheValid(purpose)) {
        const cached = localStorage.getItem(EXCHANGE_RATES_KEY);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache corrupted, fetch new
            }
        }
    }

    // Cache invalid or missing, fetch new rates
    return await fetchExchangeRates();
};

/**
 * Convert amount to INR and USD
 */
export const convertToBaseAmounts = (
    amount: number,
    currency: string,
    rates: ExchangeRates
): { amountINR: number; amountUSD: number } => {
    const currencyUpper = currency.toUpperCase();

    // If already in INR
    if (currencyUpper === 'INR') {
        return {
            amountINR: amount,
            amountUSD: amount / (rates.rates['INR'] || 83),
        };
    }

    // If already in USD
    if (currencyUpper === 'USD') {
        return {
            amountINR: amount * (rates.rates['INR'] || 83),
            amountUSD: amount,
        };
    }

    // Convert from other currency to USD first, then to INR
    const rateToUSD = rates.rates[currencyUpper];
    if (!rateToUSD) {
        console.warn(`Exchange rate not found for ${currencyUpper}, using 1:1 with USD`);
        return {
            amountINR: amount * (rates.rates['INR'] || 83),
            amountUSD: amount,
        };
    }

    const amountUSD = amount / rateToUSD;
    const amountINR = amountUSD * (rates.rates['INR'] || 83);

    return { amountINR, amountUSD };
};

/**
 * Convert amount from one currency to another
 */
export const convertAmount = (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: ExchangeRates
): number => {
    const fromUpper = fromCurrency.toUpperCase();
    const toUpper = toCurrency.toUpperCase();

    // Same currency, no conversion
    if (fromUpper === toUpper) return amount;

    // Convert to USD first
    let amountInUSD: number;
    if (fromUpper === 'USD') {
        amountInUSD = amount;
    } else {
        const fromRate = rates.rates[fromUpper];
        if (!fromRate) {
            console.warn(`Exchange rate not found for ${fromUpper}`);
            return amount;
        }
        amountInUSD = amount / fromRate;
    }

    // Convert from USD to target currency
    if (toUpper === 'USD') {
        return amountInUSD;
    }

    const toRate = rates.rates[toUpper];
    if (!toRate) {
        console.warn(`Exchange rate not found for ${toUpper}`);
        return amount;
    }

    return amountInUSD * toRate;
};
