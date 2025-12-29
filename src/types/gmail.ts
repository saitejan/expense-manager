/**
 * TypeScript type definitions for Gmail auto-tracking feature
 */

export interface GmailSyncSettings {
    enabled: boolean;
    autoSyncFrequency: 'manual' | 'daily' | 'weekly';
    lastSyncTimestamp: number | null;
    syncDateRange: number; // days to look back
    transactionTypeFilter: 'debit' | 'credit' | 'both';
    ignoredEmailIds: string[]; // emails to skip
}

export interface ParsedTransaction {
    emailId: string;
    amount: number;
    currency: string;
    description: string;
    suggestedTag: string;
    transactionType: 'debit' | 'credit';
    timestamp: number;
    merchantName?: string;
    rawEmailSubject: string;
    selected?: boolean; // for UI selection
}

export interface GmailAuthState {
    isAuthenticated: boolean;
    accessToken: string | null;
    email: string | null;
}

export interface TransactionPattern {
    name: string;
    subjectPatterns: RegExp[];
    bodyPatterns: {
        amount: RegExp;
        transactionType: RegExp;
        merchant?: RegExp;
        date?: RegExp;
    };
    currencySymbol?: string;
    defaultTag?: string;
}
