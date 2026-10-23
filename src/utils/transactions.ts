/**
 * Helpers for reviewing imported transactions (Gmail and SMS)
 */

import type { Expense } from '../types';
import type { ParsedTransaction } from '../types/gmail';

const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

/** Firebase push ids start with the creation time in ms, base-64 encoded in 8 chars */
export const pushIdTime = (id: string): number =>
  [...id.slice(0, 8)].reduce((time, char) => time * 64 + PUSH_CHARS.indexOf(char), 0);

const DUPLICATE_WINDOW_MS = 36 * 60 * 60 * 1000;

/**
 * Same amount within 36h of an existing entry, e.g. the bank sent both an email and an SMS
 */
export const findPossibleDuplicate = (amount: number, timestamp: number, expenses: Expense[]): Expense | undefined =>
  expenses.find(e => Math.abs(e.amount - amount) <= 0.5 && Math.abs(e.timestamp.getTime() - timestamp) <= DUPLICATE_WINDOW_MS);

/** Flags likely duplicates and deselects them so they need a deliberate tap to import */
export const markPossibleDuplicates = (transactions: ParsedTransaction[], expenses: Expense[]): ParsedTransaction[] =>
  transactions.map(t => {
    const duplicate = t.amount > 0 ? findPossibleDuplicate(t.amount, t.timestamp, expenses) : undefined;
    return duplicate ? { ...t, selected: false, duplicateOf: `${duplicate.description} (${duplicate.dateStr})` } : t;
  });
