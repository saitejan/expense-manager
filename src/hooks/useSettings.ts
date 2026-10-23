/**
 * Hook for managing user settings (currency and export URL)
 * Syncs with Firebase for authenticated users, falls back to localStorage
 */

import { useState, useCallback, useEffect } from 'react';
import type { Database } from 'firebase/database';
import { EXPORT_URL_KEY, CURRENCY_KEY, DEFAULT_CURRENCY, CURRENCY_CODE_LENGTH, THEME_KEY, BUDGETS_KEY, TRIPS_KEY } from '../constants';
import { updateUserPreferences, subscribeToUserPreferences } from '../services/firebase/database';
import type { Budgets, Trip } from '../types';

export type ThemePreference = 'system' | 'light' | 'dark';

interface UseSettingsReturn {
  exportUrl: string;
  currency: string;
  statsCurrency: string;
  budgets: Budgets | null;
  trips: Record<string, Trip>;
  smsInboxToken: string | null;
  theme: ThemePreference;
  updateExportUrl: (newUrl: string) => void;
  updateCurrency: (newCurrency: string) => void;
  updateStatsCurrency: (newCurrency: string) => void;
  updateGmailSyncSettings: (settings: any) => void;
  updateBudgets: (budgets: Budgets | null) => void;
  updateTrips: (trips: Record<string, Trip>) => void;
  updateTheme: (theme: ThemePreference) => void;
}

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

declare global {
  interface Window {
    /** Defined by the pre-paint script in index.html */
    applyTheme?: () => void;
  }
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
  const [budgets, setBudgets] = useState<Budgets | null>(() => readJson(BUDGETS_KEY, null));
  const [trips, setTrips] = useState<Record<string, Trip>>(() => readJson(TRIPS_KEY, {}));
  const [smsInboxToken, setSmsInboxToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(() => (localStorage.getItem(THEME_KEY) as ThemePreference) || 'system');

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
        // Cloud is the source of truth once signed in, so deletions on another device apply here too
        const cloudBudgets = preferences?.budgets ?? null;
        const cloudTrips = preferences?.trips ?? {};
        setBudgets(cloudBudgets);
        setTrips(cloudTrips);
        setSmsInboxToken(preferences?.smsInboxToken ?? null);
        localStorage.setItem(BUDGETS_KEY, JSON.stringify(cloudBudgets));
        localStorage.setItem(TRIPS_KEY, JSON.stringify(cloudTrips));
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

  const updateBudgets = useCallback(
    async (newBudgets: Budgets | null) => {
      setBudgets(newBudgets);
      localStorage.setItem(BUDGETS_KEY, JSON.stringify(newBudgets));
      if (isAuthenticated && user && db) {
        try {
          await updateUserPreferences(db, user.uid, { budgets: newBudgets });
        } catch (error) {
          console.error('Error updating budgets in Firebase:', error);
        }
      }
    },
    [isAuthenticated, user, db]
  );

  const updateTrips = useCallback(
    async (newTrips: Record<string, Trip>) => {
      setTrips(newTrips);
      localStorage.setItem(TRIPS_KEY, JSON.stringify(newTrips));
      if (isAuthenticated && user && db) {
        try {
          // An empty object removes the node
          await updateUserPreferences(db, user.uid, { trips: newTrips });
        } catch (error) {
          console.error('Error updating trips in Firebase:', error);
        }
      }
    },
    [isAuthenticated, user, db]
  );

  // Per device on purpose: phone and laptop may want different themes
  const updateTheme = useCallback((newTheme: ThemePreference) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    window.applyTheme?.();
  }, []);

  return {
    exportUrl,
    currency,
    statsCurrency,
    budgets,
    trips,
    smsInboxToken,
    theme,
    updateExportUrl,
    updateCurrency,
    updateStatsCurrency,
    updateGmailSyncSettings,
    updateBudgets,
    updateTrips,
    updateTheme,
  };
};
