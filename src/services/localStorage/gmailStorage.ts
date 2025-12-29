/**
 * LocalStorage service for Gmail sync settings
 */

const GMAIL_SETTINGS_KEY = 'expense_gmail_sync_settings';
const GMAIL_IGNORED_EMAILS_KEY = 'expense_gmail_ignored_emails';

export interface GmailSyncSettings {
    enabled: boolean;
    autoSyncFrequency: 'manual' | 'daily' | 'weekly';
    lastSyncTimestamp: number | null;
    syncDateRange: number;
    transactionTypeFilter: 'debit' | 'credit' | 'both';
    ignoredEmailIds: string[];
}

const DEFAULT_SETTINGS: GmailSyncSettings = {
    enabled: false,
    autoSyncFrequency: 'manual',
    lastSyncTimestamp: null,
    syncDateRange: 30, // Last 30 days
    transactionTypeFilter: 'both',
    ignoredEmailIds: [],
};

/**
 * Load Gmail sync settings from localStorage
 */
export const loadGmailSettings = (): GmailSyncSettings => {
    try {
        const stored = localStorage.getItem(GMAIL_SETTINGS_KEY);
        if (!stored) return DEFAULT_SETTINGS;

        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
        console.error('Error loading Gmail settings:', error);
        return DEFAULT_SETTINGS;
    }
};

/**
 * Save Gmail sync settings to localStorage
 */
export const saveGmailSettings = (settings: GmailSyncSettings): void => {
    try {
        localStorage.setItem(GMAIL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving Gmail settings:', error);
    }
};

/**
 * Update last sync timestamp
 */
export const updateLastSyncTimestamp = (): void => {
    const settings = loadGmailSettings();
    settings.lastSyncTimestamp = Date.now();
    saveGmailSettings(settings);
};

/**
 * Add email ID to ignored list
 */
export const addIgnoredEmailId = (emailId: string): void => {
    const settings = loadGmailSettings();
    if (!settings.ignoredEmailIds.includes(emailId)) {
        settings.ignoredEmailIds.push(emailId);
        saveGmailSettings(settings);
    }
};

/**
 * Remove email ID from ignored list
 */
export const removeIgnoredEmailId = (emailId: string): void => {
    const settings = loadGmailSettings();
    settings.ignoredEmailIds = settings.ignoredEmailIds.filter(id => id !== emailId);
    saveGmailSettings(settings);
};

/**
 * Clear all Gmail settings
 */
export const clearGmailSettings = (): void => {
    try {
        localStorage.removeItem(GMAIL_SETTINGS_KEY);
        localStorage.removeItem(GMAIL_IGNORED_EMAILS_KEY);
    } catch (error) {
        console.error('Error clearing Gmail settings:', error);
    }
};
