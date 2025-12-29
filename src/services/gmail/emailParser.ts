/**
 * Email parser service
 * Parses transaction emails and extracts expense information
 */

import type { ParsedTransaction } from '../../types/gmail';
import { findMatchingPattern } from './transactionPatterns';
import { suggestTag } from './tagMapper';

/**
 * Parse amount from text, removing commas and converting to number
 */
const parseAmount = (amountStr: string): number => {
    const cleaned = amountStr.replace(/,/g, '');
    return parseFloat(cleaned);
};

/**
 * Determine transaction type (debit or credit)
 */
const determineTransactionType = (subject: string, body: string): 'debit' | 'credit' => {
    const combinedText = `${subject} ${body}`.toLowerCase();

    const debitKeywords = ['debited', 'deducted', 'paid', 'spent', 'withdrawn', 'purchase', 'payment'];
    const creditKeywords = ['credited', 'received', 'refund', 'cashback', 'reward'];

    const hasDebit = debitKeywords.some(keyword => combinedText.includes(keyword));
    const hasCredit = creditKeywords.some(keyword => combinedText.includes(keyword));

    // If both or neither, default to debit (most common)
    if (hasCredit && !hasDebit) return 'credit';
    return 'debit';
};

/**
 * Extract merchant name from email body
 */
const extractMerchant = (body: string, pattern: RegExp | undefined): string | undefined => {
    if (!pattern) return undefined;

    const match = body.match(pattern);
    if (match && match[1]) {
        return match[1].trim();
    }

    return undefined;
};

/**
 * Parse a single email and extract transaction information
 * @param email - Gmail message object
 * @returns ParsedTransaction or null if not a valid transaction email
 */
export const parseTransactionEmail = (email: {
    id: string;
    subject: string;
    body: string;
    date: number;
}): ParsedTransaction | null => {
    try {
        const { id, subject, body, date } = email;

        // Find matching pattern
        const pattern = findMatchingPattern(subject, body);
        if (!pattern) return null;

        // Extract amount
        const amountMatch = body.match(pattern.bodyPatterns.amount);
        if (!amountMatch || !amountMatch[1]) return null;

        const amount = parseAmount(amountMatch[1]);
        if (isNaN(amount) || amount <= 0) return null;

        // Determine transaction type
        const transactionType = determineTransactionType(subject, body);

        // Extract merchant
        const merchantName = extractMerchant(body, pattern.bodyPatterns.merchant);

        // Create description
        const description = merchantName || subject.substring(0, 50);

        // Suggest tag
        const suggestedTag = pattern.defaultTag || suggestTag(merchantName || description);

        // Determine currency
        const currency = pattern.currencySymbol || 'INR';

        return {
            emailId: id,
            amount,
            currency,
            description,
            suggestedTag,
            transactionType,
            timestamp: date,
            merchantName,
            rawEmailSubject: subject,
            selected: true, // Default to selected for import
        };
    } catch (error) {
        console.error('Error parsing transaction email:', error);
        return null;
    }
};

/**
 * Parse multiple emails and return valid transactions
 * @param emails - Array of Gmail messages
 * @returns Array of parsed transactions
 */
export const parseTransactionEmails = (emails: Array<{
    id: string;
    subject: string;
    body: string;
    date: number;
}>): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];

    for (const email of emails) {
        const transaction = parseTransactionEmail(email);
        if (transaction) {
            transactions.push(transaction);
        }
    }

    return transactions;
};

/**
 * Filter out duplicate transactions based on amount, date, and description
 * @param transactions - Array of parsed transactions
 * @returns Deduplicated array
 */
export const deduplicateTransactions = (transactions: ParsedTransaction[]): ParsedTransaction[] => {
    const seen = new Set<string>();
    const unique: ParsedTransaction[] = [];

    for (const transaction of transactions) {
        // Create a unique key based on amount, date (day), and description
        const date = new Date(transaction.timestamp);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const key = `${transaction.amount}-${dateKey}-${transaction.description.substring(0, 20)}`;

        if (!seen.has(key)) {
            seen.add(key);
            unique.push(transaction);
        }
    }

    return unique;
};
