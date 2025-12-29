/**
 * Firebase Realtime Database service for expense CRUD operations
 * Handles synchronization between local and cloud storage
 */

import { getDatabase, ref, push, onValue, remove, set, off, update, type Database } from 'firebase/database';
import type { FirebaseApp } from 'firebase/app';
import type { Expense, UserPreferences } from '../../types';
import { USER_EXPENSES_PATH, USER_PREFERENCES_PATH } from '../../constants';
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
  expense: Omit<Expense, 'id' | 'syncStatus'>,
  customId?: string
): Promise<void> => {
  const userExpensesRef = ref(db, USER_EXPENSES_PATH(userId));
  const newExpenseRef = customId ? ref(db, `${USER_EXPENSES_PATH(userId)}/${customId}`) : push(userExpensesRef);
  await set(newExpenseRef, {
    userId,
    amount: expense.amount,
    currency: expense.currency || 'INR',
    description: expense.description,
    tag: expense.tag,
    timestamp: expense.timestamp.getTime(),
    dateStr: expense.dateStr,
    timeStr: expense.timeStr,
    amountINR: expense.amountINR || 0,
    amountUSD: expense.amountUSD || 0,
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
      userId,
      amount: firebaseExpense.amount,
      currency: firebaseExpense.currency || 'INR',
      description: firebaseExpense.description,
      tag: firebaseExpense.tag,
      timestamp: pendingExpense.timestamp.getTime(),
      dateStr: firebaseExpense.dateStr,
      timeStr: firebaseExpense.timeStr,
      amountINR: firebaseExpense.amountINR || 0,
      amountUSD: firebaseExpense.amountUSD || 0,
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
            amountINR: expenseData.amountINR || 0,
            amountUSD: expenseData.amountUSD || 0,
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

/**
 * Gets user preferences from Firebase
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @returns User preferences or null if not found
 */
export const getUserPreferences = async (
  db: Database,
  userId: string
): Promise<UserPreferences | null> => {
  const preferencesRef = ref(db, USER_PREFERENCES_PATH(userId));
  return new Promise((resolve, reject) => {
    onValue(
      preferencesRef,
      (snapshot) => {
        const data = snapshot.val();
        resolve(data || null);
        off(preferencesRef);
      },
      (error) => {
        reject(error);
        off(preferencesRef);
      },
      { onlyOnce: true }
    );
  });
};

/**
 * Updates user preferences in Firebase
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param preferences - Partial preferences to update
 */
export const updateUserPreferences = async (
  db: Database,
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> => {
  const preferencesRef = ref(db, USER_PREFERENCES_PATH(userId));
  await update(preferencesRef, preferences);
};

/**
 * Sets up real-time listener for user preferences
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param onData - Callback with fetched preferences
 * @param onError - Callback on error
 * @returns Unsubscribe function
 */
export const subscribeToUserPreferences = (
  db: Database,
  userId: string,
  onData: (preferences: UserPreferences | null) => void,
  onError: (error: any) => void
): (() => void) => {
  const preferencesRef = ref(db, USER_PREFERENCES_PATH(userId));

  onValue(
    preferencesRef,
    (snapshot) => {
      const data = snapshot.val();
      onData(data || null);
    },
    (error) => {
      console.error("Error fetching user preferences:", error);
      onError(error);
    }
  );

  return () => off(preferencesRef);
};

/**
 * Migrates existing expenses to set default currency
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param defaultCurrency - Default currency code to set (e.g., 'INR')
 */
export const migrateExpensesToDefaultCurrency = async (
  db: Database,
  userId: string,
  defaultCurrency: string
): Promise<number> => {
  const userExpensesRef = ref(db, USER_EXPENSES_PATH(userId));

  return new Promise((resolve, reject) => {
    onValue(
      userExpensesRef,
      async (snapshot) => {
        const data = snapshot.val();
        let migratedCount = 0;

        if (data) {
          const updatePromises: Promise<void>[] = [];

          Object.keys(data).forEach((key) => {
            const expenseData = data[key];
            // Only update if currency is missing or empty
            if (!expenseData.currency || expenseData.currency.trim() === '') {
              const expenseRef = ref(db, `${USER_EXPENSES_PATH(userId)}/${key}`);
              updatePromises.push(
                update(expenseRef, { currency: defaultCurrency })
              );
              migratedCount++;
            }
          });

          try {
            await Promise.all(updatePromises);
            resolve(migratedCount);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(0);
        }

        off(userExpensesRef);
      },
      (error) => {
        console.error("Error during migration:", error);
        reject(error);
        off(userExpensesRef);
      },
      { onlyOnce: true }
    );
  });
};

/**
 * Migrates existing expenses to add amountINR and amountUSD
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param rates - Exchange rates to use for conversion
 */
export const migrateExpensesToBaseAmounts = async (
  db: Database,
  userId: string,
  rates: any
): Promise<number> => {
  const userExpensesRef = ref(db, USER_EXPENSES_PATH(userId));

  return new Promise((resolve, reject) => {
    onValue(
      userExpensesRef,
      async (snapshot) => {
        const data = snapshot.val();
        let migratedCount = 0;

        if (data) {
          const { convertToBaseAmounts } = await import('../exchangeRate');
          const updatePromises: Promise<void>[] = [];

          Object.keys(data).forEach((key) => {
            const expenseData = data[key];
            // Only update if amountINR or amountUSD is missing
            if (!expenseData.amountINR || !expenseData.amountUSD) {
              const { amountINR, amountUSD } = convertToBaseAmounts(
                expenseData.amount,
                expenseData.currency || 'INR',
                rates
              );

              const expenseRef = ref(db, `${USER_EXPENSES_PATH(userId)}/${key}`);
              updatePromises.push(
                update(expenseRef, { amountINR, amountUSD })
              );
              migratedCount++;
            }
          });
          debugger;


          try {
            await Promise.all(updatePromises);
            resolve(migratedCount);
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(0);
        }

        off(userExpensesRef);
      },
      (error) => {
        console.error("Error during migration:", error);
        reject(error);
        off(userExpensesRef);
      },
      { onlyOnce: true }
    );
  });
};
