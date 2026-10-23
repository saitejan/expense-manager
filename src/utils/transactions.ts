/**
 * Helpers for reviewing imported transactions (Gmail and SMS)
 */

import type { Expense, MerchantAlias } from '../types';
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

/** Stable, Firebase-safe key for a payee/merchant name */
export const merchantKey = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

/** Fills in what the user called this payee last time (bank SMS only carry the payee's name) */
export const applyMerchantAliases = (
  transactions: ParsedTransaction[],
  aliases: Record<string, MerchantAlias>
): ParsedTransaction[] =>
  transactions.map(t => {
    const alias = t.merchantName ? aliases[merchantKey(t.merchantName)] : undefined;
    return alias ? { ...t, description: alias.description, suggestedTag: alias.tag } : t;
  });

/**
 * Aliases worth saving after an import: payees the user renamed, or ones already remembered whose
 * description/tag changed. Unrenamed payees need no alias; tag history already covers them.
 */
export const learnMerchantAliases = (
  imported: ParsedTransaction[],
  aliases: Record<string, MerchantAlias>
): Record<string, MerchantAlias> => {
  const learned: Record<string, MerchantAlias> = {};
  for (const t of imported) {
    const key = t.merchantName ? merchantKey(t.merchantName) : '';
    const description = t.description.trim();
    if (!key || !description) continue;
    const existing = aliases[key];
    const renamed = description !== t.merchantName;
    const changed = !existing || existing.description !== description || existing.tag !== t.suggestedTag;
    if ((renamed || existing) && changed) learned[key] = { description, tag: t.suggestedTag };
  }
  return learned;
};

/** Flags likely duplicates and deselects them so they need a deliberate tap to import */
export const markPossibleDuplicates = (transactions: ParsedTransaction[], expenses: Expense[]): ParsedTransaction[] =>
  transactions.map(t => {
    const duplicate = t.amount > 0 ? findPossibleDuplicate(t.amount, t.timestamp, expenses) : undefined;
    return duplicate ? { ...t, selected: false, duplicateOf: `${duplicate.description} (${duplicate.dateStr})` } : t;
  });
