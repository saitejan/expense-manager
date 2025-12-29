/**
 * Transaction patterns for common Indian banks and payment providers
 * Used to parse transaction emails and extract relevant information
 */

import type { TransactionPattern } from '../../types/gmail';

// Common regex patterns
const AMOUNT_PATTERNS = {
    INR: /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    USD: /(?:USD|\$)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    GENERIC: /(?:amount|amt|value)[\s:]*(?:Rs\.?|INR|₹|\$|USD)?\s*([0-9,]+(?:\.[0-9]{2})?)/i,
};

const TRANSACTION_TYPE_PATTERNS = {
    DEBIT: /(?:debited|deducted|paid|spent|withdrawn|purchase|payment)/i,
    CREDIT: /(?:credited|received|refund|cashback|reward)/i,
};

// Bank-specific patterns
export const BANK_PATTERNS: TransactionPattern[] = [
    // HDFC Bank
    {
        name: 'HDFC Bank',
        subjectPatterns: [
            /HDFC.*(?:debited|credited)/i,
            /Alert.*HDFC/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to)\s+([A-Za-z0-9\s@\-\.]+?)(?:\s*(?:on|for|dated|at|date|[\.!,:]|$))/i,
        },
        currencySymbol: 'INR',
    },

    // ICICI Bank
    {
        name: 'ICICI Bank',
        subjectPatterns: [
            /ICICI.*(?:transaction|alert)/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to)\s+([A-Za-z0-9\s@\-\.]+?)(?:\s*(?:on|for|dated|at|date|[\.!,:]|$))/i,
        },
        currencySymbol: 'INR',
    },

    // SBI (State Bank of India)
    {
        name: 'SBI',
        subjectPatterns: [
            /SBI.*(?:debited|credited)/i,
            /State Bank.*alert/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to)\s+([A-Z0-9\s]+?)(?:\s+on|\s+dated|\.|$)/i,
        },
        currencySymbol: 'INR',
    },

    // Axis Bank
    {
        name: 'Axis Bank',
        subjectPatterns: [
            /Axis.*(?:transaction|alert)/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to)\s+([A-Z0-9\s]+?)(?:\s+on|\s+dated|\.|$)/i,
        },
        currencySymbol: 'INR',
    },

    // Kotak Mahindra Bank
    {
        name: 'Kotak Bank',
        subjectPatterns: [
            /Kotak.*(?:transaction|alert)/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to)\s+([A-Z0-9\s]+?)(?:\s+on|\s+dated|\.|$)/i,
        },
        currencySymbol: 'INR',
    },
];

// Payment app patterns
export const PAYMENT_APP_PATTERNS: TransactionPattern[] = [
    // Google Pay
    {
        name: 'Google Pay',
        subjectPatterns: [
            /Google Pay.*(?:sent|received)/i,
            /You (?:sent|received).*Google Pay/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:to|from)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+for|\.|$)/i,
        },
        currencySymbol: 'INR',
    },

    // PhonePe
    {
        name: 'PhonePe',
        subjectPatterns: [
            /PhonePe.*(?:payment|transaction)/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:to|at)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+for|\.|$)/i,
        },
        currencySymbol: 'INR',
    },

    // Paytm
    {
        name: 'Paytm',
        subjectPatterns: [
            /Paytm.*(?:payment|transaction)/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:to|at)\s+([A-Za-z0-9\s]+?)(?:\s+on|\s+for|\.|$)/i,
        },
        currencySymbol: 'INR',
    },
    // Pluxee Card
    {
        name: 'Pluxee Transaction',
        subjectPatterns: [
            /Pluxee.*transaction/i,
            /Transaction.*Pluxee/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to|payment of .* at)\s+([A-Za-z0-9\s&\.\-\_]+?)(?:\s*(?:on|for|dated|at|date|[\.!,:]|$))/i,
        },
        currencySymbol: 'INR',
        defaultTag: 'Food',
    },
    {
        name: 'Sodexo Transaction',
        subjectPatterns: [/Sodexo/i],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to)\s+([A-Za-z0-9\s&]+?)(?:\s*(?:on|for|dated|at|date|[\.!,]|$))/i,
        },
        currencySymbol: 'INR',
        defaultTag: 'Food',
    },
];

// Credit card patterns
export const CREDIT_CARD_PATTERNS: TransactionPattern[] = [
    {
        name: 'Generic Credit Card',
        subjectPatterns: [
            /credit card.*(?:transaction|alert)/i,
            /card.*(?:xx|ending)/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.GENERIC,
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to)\s+([A-Z0-9\s]+?)(?:\s+on|\s+dated|\.|$)/i,
        },
    },
];

// Combine all patterns
export const ALL_TRANSACTION_PATTERNS: TransactionPattern[] = [
    ...BANK_PATTERNS,
    ...PAYMENT_APP_PATTERNS,
    ...CREDIT_CARD_PATTERNS,
    // Add a very broad generic pattern as fallback
    {
        name: 'Generic Transaction',
        subjectPatterns: [
            /transaction/i,
            /alert/i,
            /payment/i,
            /purchase/i,
            /debited/i,
            /credited/i,
            /spent/i,
            /received/i,
            /money/i,
            /bank/i,
        ],
        bodyPatterns: {
            amount: AMOUNT_PATTERNS.INR, // Default to INR for generic
            transactionType: TRANSACTION_TYPE_PATTERNS.DEBIT,
            merchant: /(?:at|to|from|towards)\s+([A-Za-z0-9\s&]+?)(?:\s*(?:on|for|dated|at|date|[\.!,]|$))/i,
        },
    },
];

/**
 * Check if email subject matches any transaction pattern
 */
export const isTransactionEmail = (subject: string): boolean => {
    return ALL_TRANSACTION_PATTERNS.some(pattern =>
        pattern.subjectPatterns.some(regex => regex.test(subject))
    );
};

/**
 * Find matching pattern for email subject or body
 */
export const findMatchingPattern = (subject: string, body?: string): TransactionPattern | null => {
    // First try matching subject
    const subjectMatch = ALL_TRANSACTION_PATTERNS.find(pattern =>
        pattern.subjectPatterns.some(regex => regex.test(subject))
    );
    if (subjectMatch) return subjectMatch;

    // Fallback to matching body for the Generic pattern
    if (body) {
        const genericPattern = ALL_TRANSACTION_PATTERNS.find(p => p.name === 'Generic Transaction');
        if (genericPattern) {
            const hasTransactionKeywords = [
                /debited/i, /credited/i, /transaction/i, /payment/i, /Google Pay/i, /PhonePe/i, /Paytm/i
            ].some(regex => regex.test(body));

            if (hasTransactionKeywords) return genericPattern;
        }
    }

    return null;
};
