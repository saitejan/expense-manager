/**
 * Custom hook for Gmail sync functionality
 * Manages Gmail authentication, email fetching, and transaction parsing
 */

import { useState, useCallback } from 'react';
import type { ParsedTransaction } from '../types/gmail';
import type { Expense } from '../types';
import { signInWithGoogle } from '../services/firebase/auth';
import { fetchGmailMessages } from '../services/gmail/gmailService';
import { parseTransactionEmails, deduplicateTransactions } from '../services/gmail/emailParser';
import {
    loadGmailSettings,
    saveGmailSettings,
    updateLastSyncTimestamp,
    type GmailSyncSettings,
} from '../services/localStorage/gmailStorage';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface UseGmailSyncParams {
    auth: any;
    user: any;
    expenses: Expense[];
    onTransactionsParsed?: (transactions: ParsedTransaction[]) => void;
}

export const useGmailSync = ({ auth, user, expenses, onTransactionsParsed }: UseGmailSyncParams) => {
    // Firebase auth is now passed from parent to avoid initialization race conditions

    const [gmailSettings, setGmailSettings] = useState<GmailSyncSettings>(loadGmailSettings());
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [syncError, setSyncError] = useState<string | null>(null);
    const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    /**
     * Trigger Gmail permission request via Firebase Sign-In
     */
    const handleSyncWithGmail = useCallback(async () => {
        try {
            setSyncStatus('syncing');
            setSyncError(null);

            // Clear old token first to ensure a fresh one is requested
            localStorage.removeItem('google_access_token');

            // Trigger re-auth with Gmail scope
            await signInWithGoogle(auth, setLoading, true);

            // If sign-in successful, proceed to sync
            await syncGmailTransactions();
        } catch (error: any) {
            console.error('Gmail sync initialization failed:', error);
            setSyncError(error.message || 'Failed to initialize Gmail sync');
            setSyncStatus('error');
        }
    }, [auth]);

    /**
     * Disconnect Gmail account
     */
    const disconnectGmail = useCallback(() => {
        localStorage.removeItem('google_access_token');
        setSyncStatus('idle');
        setSyncError(null);
        setParsedTransactions([]);
    }, []);

    /**
     * Sync emails from Gmail
     */
    const syncGmailTransactions = useCallback(async () => {
        const token = localStorage.getItem('google_access_token');
        if (!token) {
            setSyncError('Gmail permission not granted. Please click Sync with Gmail.');
            return;
        }

        try {
            setSyncStatus('syncing');
            setSyncError(null);

            // Fetch emails
            const emails = await fetchGmailMessages(
                gmailSettings.syncDateRange
            );

            // Filter out ignored emails
            const filteredEmails = emails.filter(
                email => !gmailSettings.ignoredEmailIds.includes(email.id)
            );

            // Parse transactions
            let transactions = parseTransactionEmails(filteredEmails);

            // Filter by transaction type
            if (gmailSettings.transactionTypeFilter !== 'both') {
                transactions = transactions.filter(
                    t => t.transactionType === gmailSettings.transactionTypeFilter
                );
            }

            // Deduplicate
            transactions = deduplicateTransactions(transactions);

            // Filter out transactions that already exist in expenses by ID
            const existingIds = new Set(expenses.map(exp => exp.id));

            transactions = transactions.filter(t => {
                const gmailId = `gmail-${t.emailId}`;
                return !existingIds.has(gmailId);
            });

            setParsedTransactions(transactions);
            updateLastSyncTimestamp();

            // Update settings state
            setGmailSettings(loadGmailSettings());

            setSyncStatus('success');

            // Notify parent component
            if (onTransactionsParsed) {
                onTransactionsParsed(transactions);
            }
        } catch (error: any) {
            console.error('Gmail sync failed:', error);
            setSyncError(error.message || 'Failed to sync Gmail transactions');
            setSyncStatus('error');
        }
    }, [user, gmailSettings, expenses, onTransactionsParsed]);

    /**
     * Update Gmail settings
     */
    const updateGmailSettings = useCallback((updates: Partial<GmailSyncSettings>) => {
        const newSettings = { ...gmailSettings, ...updates };
        saveGmailSettings(newSettings);
        setGmailSettings(newSettings);
    }, [gmailSettings]);

    /**
     * Clear parsed transactions
     */
    const clearParsedTransactions = useCallback(() => {
        setParsedTransactions([]);
    }, []);

    const isGmailConnected = !!localStorage.getItem('google_access_token');

    return {
        isAuthenticated: !!user,
        isGmailConnected,
        userEmail: user?.email,
        gmailSettings,
        syncStatus,
        syncError,
        parsedTransactions,
        loading,
        handleSyncWithGmail,
        syncGmailTransactions,
        disconnectGmail,
        updateGmailSettings,
        clearParsedTransactions,
        setParsedTransactions,
    };
};
