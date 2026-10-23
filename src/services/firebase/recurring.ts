/**
 * Recurring expense rules at users/{uid}/recurring
 */

import { ref, onValue, off, push, set, update, type Database } from 'firebase/database';
import type { RecurringRule } from '../../types';
import { USER_PATH, USER_RECURRING_PATH } from '../../constants';
import { toFirebaseExpense, type ExpenseInput } from './database';

export const subscribeToRecurringRules = (
  db: Database,
  userId: string,
  onData: (rules: RecurringRule[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const rulesRef = ref(db, USER_RECURRING_PATH(userId));
  onValue(
    rulesRef,
    (snapshot) => {
      const data: Record<string, Omit<RecurringRule, 'id'>> | null = snapshot.val();
      onData(Object.entries(data || {}).map(([id, rule]) => ({ ...rule, id })));
    },
    onError
  );
  return () => off(rulesRef);
};

export const addRecurringRule = async (db: Database, userId: string, rule: Omit<RecurringRule, 'id'>): Promise<void> => {
  await set(push(ref(db, USER_RECURRING_PATH(userId))), rule);
};

export const setRecurringRuleActive = async (db: Database, userId: string, ruleId: string, active: boolean): Promise<void> => {
  await update(ref(db, `${USER_RECURRING_PATH(userId)}/${ruleId}`), { active });
};

/** Past expenses created by the rule stay; only future ones stop */
export const deleteRecurringRule = async (db: Database, userId: string, ruleId: string): Promise<void> => {
  await set(ref(db, `${USER_RECURRING_PATH(userId)}/${ruleId}`), null);
};

export interface RecurringBatch {
  ruleId: string;
  lastGenerated: string;
  expenses: { id: string; expense: ExpenseInput }[];
}

/**
 * Writes generated expenses and each rule's lastGenerated in ONE atomic update.
 * Expense ids are deterministic, so two devices doing this at once write the same data.
 */
export const materializeRecurringExpenses = async (db: Database, userId: string, batches: RecurringBatch[]): Promise<void> => {
  const updates: Record<string, unknown> = {};
  for (const batch of batches) {
    for (const { id, expense } of batch.expenses) updates[`expenses/${id}`] = toFirebaseExpense(userId, expense);
    updates[`recurring/${batch.ruleId}/lastGenerated`] = batch.lastGenerated;
  }
  await update(ref(db, USER_PATH(userId)), updates);
};
