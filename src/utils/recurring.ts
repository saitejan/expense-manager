/**
 * Recurring expense date math. Months are 'YYYY-MM' strings, which also compare correctly as strings.
 */

import type { RecurringRule } from '../types';

/** Older missed months are skipped so a long-unused app doesn't flood the list */
export const MAX_CATCH_UP_MONTHS = 12;

export const toMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const addMonths = (monthKey: string, count: number): string => {
  const [year, month] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(year, month - 1 + count, 1));
};

/** Day the rule fires in a month: 31 becomes 30 in April and 28/29 in February */
export const dueDay = (monthKey: string, dayOfMonth: number): number => {
  const [year, month] = monthKey.split('-').map(Number);
  return Math.min(dayOfMonth, new Date(year, month, 0).getDate());
};

/** First month not generated yet */
export const nextDueMonth = (rule: Pick<RecurringRule, 'startMonth' | 'lastGenerated'>): string => {
  const next = rule.lastGenerated ? addMonths(rule.lastGenerated, 1) : rule.startMonth;
  return next < rule.startMonth ? rule.startMonth : next;
};

/**
 * Months that still need an expense for this rule, oldest first.
 * The current month only counts once its due day has arrived.
 */
export const getDueMonths = (
  rule: Pick<RecurringRule, 'startMonth' | 'lastGenerated' | 'dayOfMonth' | 'active'>,
  today: Date
): string[] => {
  if (!rule.active) return [];
  const current = toMonthKey(today);
  let next = nextDueMonth(rule);

  const months: string[] = [];
  while (next <= current) {
    if (next === current && today.getDate() < dueDay(next, rule.dayOfMonth)) break;
    months.push(next);
    next = addMonths(next, 1);
  }
  return months.slice(-MAX_CATCH_UP_MONTHS);
};
