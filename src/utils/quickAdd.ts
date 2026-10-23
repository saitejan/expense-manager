/**
 * Pure helpers for fast expense entry: "450 swiggy" parsing, tag guess from history, favorites
 */

import type { Expense } from '../types';

const NUMBER = String.raw`(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)`;
const AMOUNT_FIRST = new RegExp(String.raw`^${NUMBER}(?:\s+(.+))?$`, 'i');
const AMOUNT_LAST = new RegExp(String.raw`^(.+?)\s+${NUMBER}$`, 'i');

/**
 * Splits quick-entry text into amount and description.
 * Leading number wins ("2 kg rice 120" → amount 2); the user sees the filled amount field and can fix it.
 */
export const parseQuickEntry = (text: string): { amount: string; description: string } => {
  const trimmed = text.trim();
  // Spoken entries often say "450 for swiggy"
  const clean = (description: string) => description.trim().replace(/^(?:for|on|at)\s+/i, '');
  const first = trimmed.match(AMOUNT_FIRST);
  if (first) return { amount: first[1].replace(/,/g, ''), description: clean(first[2] || '') };
  const last = trimmed.match(AMOUNT_LAST);
  if (last) return { amount: last[2].replace(/,/g, ''), description: clean(last[1]) };
  return { amount: '', description: trimmed };
};

/**
 * Tag used last time for this description: exact match, then same first word,
 * then any past description containing that word ("kpn" → "Shopping in kpn fresh")
 * @param expenses - Sorted newest first
 */
export const suggestTagFromHistory = (description: string, expenses: Expense[]): string | undefined => {
  const wanted = description.trim().toLowerCase();
  if (!wanted) return undefined;
  const words = (text: string) => text.trim().toLowerCase().split(/\s+/);
  const exact = expenses.find(e => e.description.trim().toLowerCase() === wanted);
  if (exact) return exact.tag;
  const firstWord = words(wanted)[0];
  const sameStart = expenses.find(e => words(e.description)[0] === firstWord);
  if (sameStart) return sameStart.tag;
  // Short words ("in", "to") would match almost anything
  if (firstWord.length < 3) return undefined;
  return expenses.find(e => e.type !== 'credit' && words(e.description).includes(firstWord))?.tag;
};

export interface Favorite {
  description: string;
  tag: string;
  amount: number;
  currency: string;
}

/**
 * Most frequent descriptions in the last `days` days (at least 2 uses), with the latest tag and amount
 * @param expenses - Sorted newest first
 */
export const getFavorites = (expenses: Expense[], now: Date, limit = 6, days = 90): Favorite[] => {
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;
  const groups = new Map<string, { latest: Expense; count: number }>();
  for (const expense of expenses) {
    if (expense.type === 'credit' || expense.timestamp.getTime() < since) continue;
    const key = expense.description.trim().toLowerCase();
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { latest: expense, count: 1 });
  }
  return [...groups.values()]
    .filter(g => g.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ latest }) => ({
      description: latest.description.trim(),
      tag: latest.tag,
      amount: latest.amount,
      currency: latest.currency,
    }));
};
