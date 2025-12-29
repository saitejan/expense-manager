/**
 * Hook for managing user settings (currency and export URL)
 * Syncs with Firebase for authenticated users, falls back to localStorage
 */

import { useState, useCallback, useEffect } from 'react';
import type { Database } from 'firebase/database';
import { EXPORT_URL_KEY, CURRENCY_KEY, DEFAULT_CURRENCY, CURRENCY_CODE_LENGTH } from '../constants';
import { updateUserPreferences, subscribeToUserPreferences } from '../services/firebase/database';

interface UseSettingsReturn {
  exportUrl: string;
  currency: string;
  statsCurrency: string;
  updateExportUrl: (newUrl: string) => void;
  updateCurrency: (newCurrency: string) => void;
  updateStatsCurrency: (newCurrency: string) => void;
  updateGmailSyncSettings: (settings: any) => void;
}

interface UseSettingsProps {
  user: any | null;
  db: Database | null;
  isAuthenticated: boolean;
}

/**
 * Manages currency and Google Sheets export URL settings
 * Syncs with Firebase when user is authenticated, otherwise uses localStorage
 * @param user - Current user object
 * @param db - Firebase database instance
 * @param isAuthenticated - Whether user is authenticated
 * @returns Settings state and update functions
 */
export const useSettings = ({ user, db, isAuthenticated }: UseSettingsProps): UseSettingsReturn => {
  const [exportUrl, setExportUrl] = useState(() => localStorage.getItem(EXPORT_URL_KEY) || '');
  const [currency, setCurrency] = useState(() => localStorage.getItem(CURRENCY_KEY) || DEFAULT_CURRENCY);
  const [statsCurrency, setStatsCurrency] = useState(() =>
    localStorage.getItem('moneytrack_stats_currency') || localStorage.getItem(CURRENCY_KEY) || DEFAULT_CURRENCY
  );

  // Subscribe to Firebase preferences when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !db) {
      return;
    }

    const unsubscribe = subscribeToUserPreferences(
      db,
      user.uid,
      (preferences) => {
        if (preferences) {
          if (preferences.currency) {
            setCurrency(preferences.currency);
            localStorage.setItem(CURRENCY_KEY, preferences.currency);
          }
          if (preferences.exportUrl !== undefined) {
            setExportUrl(preferences.exportUrl);
            localStorage.setItem(EXPORT_URL_KEY, preferences.exportUrl);
          }
          if (preferences.statsCurrency) {
            setStatsCurrency(preferences.statsCurrency);
            localStorage.setItem('moneytrack_stats_currency', preferences.statsCurrency);
          }
          if (preferences.gmailSync) {
            localStorage.setItem('expense_gmail_sync_settings', JSON.stringify(preferences.gmailSync));
          }
        }
      },
      (error) => {
        console.error('Error subscribing to user preferences:', error);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user, db]);

  const updateExportUrl = useCallback(
    async (newUrl: string) => {
      setExportUrl(newUrl);
      localStorage.setItem(EXPORT_URL_KEY, newUrl);

      // Sync to Firebase if authenticated
      if (isAuthenticated && user && db) {
        try {
          await updateUserPreferences(db, user.uid, { exportUrl: newUrl });
        } catch (error) {
          console.error('Error updating export URL in Firebase:', error);
        }
      }
    },
    [isAuthenticated, user, db]
  );

  const updateCurrency = useCallback(
    async (newCurrency: string) => {
      const validatedCurrency = newCurrency.toUpperCase().substring(0, CURRENCY_CODE_LENGTH);
      setCurrency(validatedCurrency);
      localStorage.setItem(CURRENCY_KEY, validatedCurrency);

      // Sync to Firebase if authenticated
      if (isAuthenticated && user && db) {
        try {
          await updateUserPreferences(db, user.uid, { currency: validatedCurrency });
        } catch (error) {
          console.error('Error updating currency in Firebase:', error);
        }
      }
    },
    [isAuthenticated, user, db]
  );

  const updateStatsCurrency = useCallback(
    async (newCurrency: string) => {
      setStatsCurrency(newCurrency);
      localStorage.setItem('moneytrack_stats_currency', newCurrency);

      // Sync to Firebase if authenticated
      if (isAuthenticated && user && db) {
        try {
          await updateUserPreferences(db, user.uid, { statsCurrency: newCurrency });
        } catch (error) {
          console.error('Error updating stats currency in Firebase:', error);
        }
      }
    },
    [isAuthenticated, user, db]
  );

  const updateGmailSyncSettings = useCallback(
    async (settings: any) => {
      // Sync to Firebase if authenticated
      if (isAuthenticated && user && db) {
        try {
          await updateUserPreferences(db, user.uid, { gmailSync: settings });
        } catch (error) {
          console.error('Error updating Gmail sync settings in Firebase:', error);
        }
      }
    },
    [isAuthenticated, user, db]
  );

  return { exportUrl, currency, statsCurrency, updateExportUrl, updateCurrency, updateStatsCurrency, updateGmailSyncSettings };
};
