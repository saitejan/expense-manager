/**
 * Firebase Realtime Database service for expense CRUD operations
 * Handles synchronization between local and cloud storage
 */

import { getDatabase, ref, push, onValue, remove, set, off, type Database } from 'firebase/database';
import type { FirebaseApp } from 'firebase/app';
import type { Expense } from '../../types';
import { USER_EXPENSES_PATH } from '../../constants';
import { timestampToDate } from '../../utils';

/**
 * Gets Firebase Realtime Database instance
 * @param app - Firebase app instance
 * @returns Database instance
 */
export const getFirebaseDatabase = (app: FirebaseApp): Database => {
  return getDatabase(app);
};

/**
 * Adds a new expense to Firebase
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param expense - Expense object (without id and syncStatus)
 */
export const addExpenseToFirebase = async (
  db: Database,
  userId: string,
  expense: Omit<Expense, 'id' | 'syncStatus'>
): Promise<void> => {
  const userExpensesRef = ref(db, USER_EXPENSES_PATH(userId));
  const newExpenseRef = push(userExpensesRef);
  await set(newExpenseRef, {
    ...expense,
    timestamp: expense.timestamp.getTime(),
  });
};

/**
 * Updates an existing expense in Firebase
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param expenseId - Expense ID to update
 * @param expense - Updated expense data
 */
export const updateExpenseInFirebase = async (
  db: Database,
  userId: string,
  expenseId: string,
  expense: Omit<Expense, 'id' | 'syncStatus'>
): Promise<void> => {
  const expenseRef = ref(db, `${USER_EXPENSES_PATH(userId)}/${expenseId}`);
  await set(expenseRef, {
    ...expense,
    timestamp: expense.timestamp.getTime(),
  });
};

/**
 * Deletes an expense from Firebase
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param expenseId - Expense ID to delete
 */
export const deleteExpenseFromFirebase = async (
  db: Database,
  userId: string,
  expenseId: string
): Promise<void> => {
  const expenseRef = ref(db, `${USER_EXPENSES_PATH(userId)}/${expenseId}`);
  await remove(expenseRef);
};

/**
 * Syncs pending expenses to Firebase
 * Removes temporary IDs and converts dates to timestamps
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param pendingExpenses - Array of pending expenses to sync
 * @param onSuccess - Callback on successful sync
 * @param onError - Callback on sync error
 */
export const syncPendingExpensesToFirebase = async (
  db: Database,
  userId: string,
  pendingExpenses: Expense[],
  onSuccess: () => void,
  onError: (error: any) => void
): Promise<void> => {
  const userExpensesRef = ref(db, USER_EXPENSES_PATH(userId));
  const syncPromises = pendingExpenses.map(pendingExpense => {
    const { id, syncStatus, ...firebaseExpense } = pendingExpense;
    const newExpenseRef = push(userExpensesRef);
    return set(newExpenseRef, {
      ...firebaseExpense,
      timestamp: pendingExpense.timestamp.getTime(),
    });
  });

  try {
    await Promise.all(syncPromises);
    onSuccess();
  } catch (error) {
    onError(error);
  }
};

/**
 * Syncs CSV-imported expenses to Firebase
 * Handles duplicate detection and record merging
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param restoredExpenses - Array of expenses from CSV
 * @param existingExpenseIds - Set of existing expense IDs
 * @param onSuccess - Callback on successful import
 * @param onError - Callback on import error
 */
export const syncRestoredCsvToFirebase = async (
  db: Database,
  userId: string,
  restoredExpenses: Expense[],
  existingExpenseIds: Set<string>,
  onSuccess: (count: number) => void,
  onError: (error: any) => void
): Promise<void> => {
  const userExpensesRef = ref(db, USER_EXPENSES_PATH(userId));

  const syncPromises = restoredExpenses.map(restoredExpense => {
    const expenseToSave = {
      userId: userId,
      amount: restoredExpense.amount,
      currency: restoredExpense.currency,
      description: restoredExpense.description,
      tag: restoredExpense.tag,
      timestamp: restoredExpense.timestamp.getTime(),
      dateStr: restoredExpense.dateStr,
      timeStr: restoredExpense.timeStr,
    };

    if (restoredExpense.id && !restoredExpense.id.startsWith('local-') && existingExpenseIds.has(restoredExpense.id)) {
      // Update existing record
      const expenseRef = ref(db, `${USER_EXPENSES_PATH(userId)}/${restoredExpense.id}`);
      return set(expenseRef, expenseToSave);
    } else {
      // Add new record
      const newExpenseRef = push(userExpensesRef);
      return set(newExpenseRef, expenseToSave);
    }
  });

  try {
    await Promise.all(syncPromises);
    onSuccess(syncPromises.length);
  } catch (error) {
    onError(error);
  }
};

/**
 * Sets up real-time listener for user's expenses
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param onData - Callback with fetched expenses
 * @param onError - Callback on error
 * @returns Unsubscribe function
 */
export const subscribeToExpenses = (
  db: Database,
  userId: string,
  onData: (expenses: Expense[]) => void,
  onError: (error: any) => void
): (() => void) => {
  const userExpensesRef = ref(db, USER_EXPENSES_PATH(userId));

  onValue(
    userExpensesRef,
    (snapshot) => {
      const data = snapshot.val();
      const fetchedExpenses: Expense[] = [];

      if (data) {
        Object.keys(data).forEach((key) => {
          const expenseData = data[key];
          fetchedExpenses.push({
            id: key,
            userId: expenseData.userId,
            amount: expenseData.amount,
            currency: expenseData.currency,
            description: expenseData.description,
            tag: expenseData.tag,
            timestamp: timestampToDate(expenseData.timestamp),
            dateStr: expenseData.dateStr,
            timeStr: expenseData.timeStr,
            syncStatus: 'synced' as const,
          });
        });
      }

      fetchedExpenses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      onData(fetchedExpenses);
    },
    (error) => {
      console.error("Error fetching documents:", error);
      onError(error);
    }
  );

  return () => off(userExpensesRef);
};

/**
 * Deletes all expenses for a user from Firebase
 * @param db - Firebase Database instance
 * @param userId - User ID
 */
export const deleteAllExpensesFromFirebase = async (
  db: Database,
  userId: string
): Promise<void> => {
  const userExpensesRef = ref(db, USER_EXPENSES_PATH(userId));
  await remove(userExpensesRef);
};
