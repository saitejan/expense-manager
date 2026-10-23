/**
 * Recurring expenses: subscribes to the rules and creates due expenses when the app opens.
 * iOS gives web apps no background time, so "due" is checked whenever the app runs.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Database } from 'firebase/database';
import type { RecurringRule } from '../types';
import {
  subscribeToRecurringRules,
  addRecurringRule,
  setRecurringRuleActive,
  deleteRecurringRule,
  materializeRecurringExpenses,
  type RecurringBatch,
} from '../services/firebase/recurring';
import { getExchangeRates, convertToBaseAmounts } from '../services/exchangeRate';
import { getDueMonths, dueDay } from '../utils/recurring';

interface UseRecurringParams {
  db: Database | null;
  user: { uid: string } | null;
  isOnline: boolean;
  showModal: (title: string, message: string) => void;
}

export const useRecurring = ({ db, user, isOnline, showModal }: UseRecurringParams) => {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const runningRef = useRef(false);
  // Never retry the same rule/month in one session, so a failing write (e.g. old rules) can't loop
  const attemptedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!db || !user) return;
    const unsubscribe = subscribeToRecurringRules(db, user.uid, setRules, (error) => console.error('Error loading recurring rules:', error));
    // Clear on sign-out so another account never sees these rules
    return () => { unsubscribe(); setRules([]); };
  }, [db, user]);

  useEffect(() => {
    if (!db || !user || !isOnline || runningRef.current) return;

    const today = new Date();
    const due = rules
      .map(rule => ({ rule, months: getDueMonths(rule, today).filter(m => !attemptedRef.current.has(`${rule.id}:${m}`)) }))
      .filter(({ months }) => months.length > 0);
    if (due.length === 0) return;

    due.forEach(({ rule, months }) => months.forEach(m => attemptedRef.current.add(`${rule.id}:${m}`)));
    runningRef.current = true;

    (async () => {
      try {
        const rates = await getExchangeRates('creation');
        const batches: RecurringBatch[] = due.map(({ rule, months }) => ({
          ruleId: rule.id,
          lastGenerated: months[months.length - 1],
          expenses: months.map(month => {
            const day = dueDay(month, rule.dayOfMonth);
            const dateStr = `${month}-${String(day).padStart(2, '0')}`;
            return {
              id: `rec-${rule.id}-${month}`,
              expense: {
                userId: user.uid,
                amount: rule.amount,
                currency: rule.currency,
                ...convertToBaseAmounts(rule.amount, rule.currency, rates),
                description: rule.description,
                tag: rule.tag,
                timestamp: new Date(`${dateStr}T09:00:00`),
                dateStr,
                timeStr: '09:00',
              },
            };
          }),
        }));
        await materializeRecurringExpenses(db, user.uid, batches);
        const lines = batches.map(b => `• ${rules.find(r => r.id === b.ruleId)?.description} (${b.expenses.length} month${b.expenses.length !== 1 ? 's' : ''})`);
        showModal('Recurring Expenses Added', `${batches.reduce((n, b) => n + b.expenses.length, 0)} added:\n${lines.join('\n')}`);
      } catch (error) {
        console.error('Error creating recurring expenses:', error);
        showModal('Recurring Expenses', `Could not add due recurring expenses: ${(error as Error).message}`);
      } finally {
        runningRef.current = false;
      }
    })();
  }, [db, user, isOnline, rules, showModal]);

  const addRule = useCallback(async (rule: Omit<RecurringRule, 'id'>) => {
    if (!db || !user) return;
    await addRecurringRule(db, user.uid, rule);
  }, [db, user]);

  const toggleRule = useCallback(async (ruleId: string, active: boolean) => {
    if (!db || !user) return;
    await setRecurringRuleActive(db, user.uid, ruleId, active);
  }, [db, user]);

  const deleteRule = useCallback(async (ruleId: string) => {
    if (!db || !user) return;
    await deleteRecurringRule(db, user.uid, ruleId);
  }, [db, user]);

  return { rules, addRule, toggleRule, deleteRule };
};
