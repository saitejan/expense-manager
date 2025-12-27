/**
 * Hook for managing user settings (currency and export URL)
 * Persists settings to localStorage
 */

import { useState, useCallback } from 'react';
import { EXPORT_URL_KEY, CURRENCY_KEY, DEFAULT_CURRENCY, CURRENCY_CODE_LENGTH } from '../constants';

interface UseSettingsReturn {
  exportUrl: string;
  currency: string;
  updateExportUrl: (newUrl: string) => void;
  updateCurrency: (newCurrency: string) => void;
}

/**
 * Manages currency and Google Sheets export URL settings
 * @returns Settings state and update functions
 */
export const useSettings = (): UseSettingsReturn => {
  const [exportUrl, setExportUrl] = useState(() => localStorage.getItem(EXPORT_URL_KEY) || '');
  const [currency, setCurrency] = useState(() => localStorage.getItem(CURRENCY_KEY) || DEFAULT_CURRENCY);

  const updateExportUrl = useCallback((newUrl: string) => {
    localStorage.setItem(EXPORT_URL_KEY, newUrl);
    setExportUrl(newUrl);
  }, []);

  const updateCurrency = useCallback((newCurrency: string) => {
    const validatedCurrency = newCurrency.toUpperCase().substring(0, CURRENCY_CODE_LENGTH);
    localStorage.setItem(CURRENCY_KEY, validatedCurrency);
    setCurrency(validatedCurrency);
  }, []);

  return { exportUrl, currency, updateExportUrl, updateCurrency };
};
