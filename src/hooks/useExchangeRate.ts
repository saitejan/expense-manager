/**
 * Hook for managing exchange rates
 */

import { useState, useEffect } from 'react';
import type { ExchangeRates } from '../types';
import { getExchangeRates } from '../services/exchangeRate';

interface UseExchangeRateReturn {
    rates: ExchangeRates | null;
    loading: boolean;
    error: string | null;
    refreshRates: () => Promise<void>;
}

/**
 * Manages exchange rates with caching
 * @param purpose - 'creation' for 1-hour cache, 'stats' for 24-hour cache
 */
export const useExchangeRate = (purpose: 'creation' | 'stats' = 'stats'): UseExchangeRateReturn => {
    const [rates, setRates] = useState<ExchangeRates | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadRates = async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedRates = await getExchangeRates(purpose);
            setRates(fetchedRates);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch exchange rates');
            console.error('Error fetching exchange rates:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [purpose]);

    const refreshRates = async () => {
        await loadRates();
    };

    return { rates, loading, error, refreshRates };
};
