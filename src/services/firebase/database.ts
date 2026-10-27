/**
 * Firebase Realtime Database service for expense CRUD operations
 * Handles synchronization between local and cloud storage
 */

import { getDatabase, ref, push, onValue, get, set, off, update, type Database } from 'firebase/database';
import type { FirebaseApp } from 'firebase/app';
import type { Expense, UserPreferences } from '../../types';
import { USER_EXPENSES_PATH, USER_PREFERENCES_PATH, USER_PATH, USER_RECEIPTS_PATH, USER_RECURRING_PATH } from '../../constants';
import { timestampToDate } from '../../utils';

export type ExpenseInput = Omit<Expense, 'id' | 'syncStatus'>;

/** Shape of an expense as stored in RTDB */
interface StoredExpense {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  tag: string;
  timestamp: number;
  dateStr: string;
  timeStr: string;
  amountINR: number;
  amountUSD: number;
  type?: 'credit';
  tripId?: string;
  hasReceipt?: true;
}

/**
 * Single place that decides how an expense is written to RTDB.
 * Optional fields are omitted rather than undefined, because set()/update() reject undefined.
 */
export const toFirebaseExpense = (userId: string, expense: ExpenseInput): StoredExpense => ({
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
  ...(expense.type === 'credit' ? { type: 'credit' as const } : {}),
  ...(expense.tripId ? { tripId: expense.tripId } : {}),
  ...(expense.hasReceipt ? { hasReceipt: true as const } : {}),
});

const fromFirebaseExpense = (id: string, data: StoredExpense): Expense => ({
  id,
  userId: data.userId,
  amount: data.amount,
  currency: data.currency,
  amountINR: data.amountINR || 0,
  amountUSD: data.amountUSD || 0,
  description: data.description,
  tag: data.tag,
  timestamp: timestampToDate(data.timestamp),
  dateStr: data.dateStr,
  timeStr: data.timeStr,
  syncStatus: 'synced',
  ...(data.type === 'credit' ? { type: 'credit' as const } : {}),
  ...(data.tripId ? { tripId: data.tripId } : {}),
  ...(data.hasReceipt ? { hasReceipt: true } : {}),
});

const receiptRecord = (data: string) => ({ data, createdAt: Date.now() });

/**
 * Gets Firebase Realtime Database instance
 * @param app - Firebase app instance
 * @returns Database instance
 */
export const getFirebaseDatabase = (app: FirebaseApp): Database => {
  return getDatabase(app);
};

/**
 * Adds a new expense to Firebase, optionally with a receipt photo, in one atomic write
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param expense - Expense object (without id and syncStatus)
 * @param customId - Fixed id (Gmail/SMS/recurring imports); a push key otherwise
 * @param receipt - Compressed JPEG data URL
 * @returns The expense id
 */
export const addExpenseToFirebase = async (
  db: Database,
  userId: string,
  expense: ExpenseInput,
  customId?: string,
  receipt?: string
): Promise<string> => {
  const id = customId || push(ref(db, USER_EXPENSES_PATH(userId))).key!;
  await update(ref(db, USER_PATH(userId)), {
    [`expenses/${id}`]: toFirebaseExpense(userId, { ...expense, hasReceipt: expense.hasReceipt || !!receipt }),
    ...(receipt ? { [`receipts/${id}`]: receiptRecord(receipt) } : {}),
  });
  return id;
};

/**
 * Updates an existing expense in Firebase
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param expenseId - Expense ID to update
 * @param expense - Updated expense data
 * @param receipt - undefined keeps the current receipt, null removes it, a data URL replaces it
 */
export const updateExpenseInFirebase = async (
  db: Database,
  userId: string,
  expenseId: string,
  expense: ExpenseInput,
  receipt?: string | null
): Promise<void> => {
  const hasReceipt = receipt === undefined ? expense.hasReceipt : receipt !== null;
  await update(ref(db, USER_PATH(userId)), {
    [`expenses/${expenseId}`]: toFirebaseExpense(userId, { ...expense, hasReceipt }),
    ...(receipt !== undefined ? { [`receipts/${expenseId}`]: receipt && receiptRecord(receipt) } : {}),
  });
};

/**
 * Deletes an expense and its receipt (if any) from Firebase
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param expenseId - Expense ID to delete
 */
export const deleteExpenseFromFirebase = async (
  db: Database,
  userId: string,
  expenseId: string
): Promise<void> => {
  await update(ref(db, USER_PATH(userId)), {
    [`expenses/${expenseId}`]: null,
    [`receipts/${expenseId}`]: null,
  });
};

/**
 * Loads one receipt photo on demand
 * @returns JPEG data URL, or null if missing
 */
export const getReceipt = async (db: Database, userId: string, expenseId: string): Promise<string | null> => {
  const snapshot = await get(ref(db, `${USER_RECEIPTS_PATH(userId)}/${expenseId}`));
  return snapshot.val()?.data ?? null;
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
    return set(push(userExpensesRef), toFirebaseExpense(userId, pendingExpense));
  });

  try {
    await Promise.all(syncPromises);
    onSuccess();
  } catch (error) {
    onError(error);
  }
};

/**
 * Id a restored expense is written under. Kept as-is so gmail-/sms-/rec- ids still
 * dedupe later imports; temporary local ids and keys RTDB rejects get a new push key.
 */
const restoreId = (db: Database, userId: string, id: string): string =>
  id && !/^(local-|imported-)|[.#$[\]/]/.test(id) ? id : push(ref(db, USER_EXPENSES_PATH(userId))).key!;

/**
 * Restored expense in RTDB shape. Backups carry no receipt photos, so the receipt
 * flag is kept only where this account already holds the photo.
 */
const restoredExpense = (userId: string, expense: Expense, existing: Map<string, Expense>): StoredExpense =>
  toFirebaseExpense(userId, { ...expense, hasReceipt: existing.get(expense.id)?.hasReceipt });

/**
 * Syncs CSV-imported expenses to Firebase in one atomic write.
 * Records with a matching id are overwritten; nothing is deleted.
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param restoredExpenses - Array of expenses from CSV
 * @param existingExpenses - Expenses already in the account
 * @param onSuccess - Callback on successful import
 * @param onError - Callback on import error
 */
export const syncRestoredCsvToFirebase = async (
  db: Database,
  userId: string,
  restoredExpenses: Expense[],
  existingExpenses: Expense[],
  onSuccess: (count: number) => void,
  onError: (error: any) => void
): Promise<void> => {
  const existing = new Map(existingExpenses.map(e => [e.id, e]));
  const updates: Record<string, StoredExpense> = {};
  for (const expense of restoredExpenses) {
    const id = restoreId(db, userId, expense.id);
    updates[id] = restoredExpense(userId, { ...expense, id }, existing);
  }

  try {
    await update(ref(db, USER_EXPENSES_PATH(userId)), updates);
    onSuccess(restoredExpenses.length);
  } catch (error) {
    onError(error);
  }
};

const BACKUP_APP = 'moneytrack';
const BACKUP_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Full account backup: expenses, recurring rules and preferences in RTDB shape.
 * Receipt photos are left out (size). The SMS inbox token is left out because it is a
 * write capability; a restored account registers its own.
 * @param db - Firebase Database instance
 * @param userId - User ID
 */
export const exportUserBackup = async (db: Database, userId: string) => {
  const [expenses, recurring, preferences] = await Promise.all(
    [USER_EXPENSES_PATH(userId), USER_RECURRING_PATH(userId), USER_PREFERENCES_PATH(userId)]
      .map(async path => (await get(ref(db, path))).val() ?? {})
  );
  delete preferences.smsInboxToken;
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), expenses, recurring, preferences };
};

/**
 * Restores a file from exportUserBackup in one atomic write. Expenses, recurring rules,
 * trips and merchant aliases are merged by id; other preferences are replaced.
 * Nothing is deleted. Firebase rules validate every field.
 * @param db - Firebase Database instance
 * @param userId - User ID
 * @param backup - Parsed backup file
 * @param existingExpenses - Expenses already in the account
 * @returns Number of expenses and recurring rules restored
 * @throws Error if the file is not a backup this version can read
 */
export const restoreUserBackup = async (
  db: Database,
  userId: string,
  backup: unknown,
  existingExpenses: Expense[]
): Promise<{ expenses: number; recurring: number }> => {
  if (!isRecord(backup) || backup.app !== BACKUP_APP || !isRecord(backup.expenses) || !isRecord(backup.recurring) || !isRecord(backup.preferences)) {
    throw new Error('This is not a Money Track full backup file.');
  }
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Backup version ${backup.version} is not supported by this version of the app.`);
  }

  const existing = new Map(existingExpenses.map(e => [e.id, e]));
  const updates: Record<string, unknown> = {};
  for (const [backupId, data] of Object.entries(backup.expenses)) {
    const id = restoreId(db, userId, backupId);
    updates[`expenses/${id}`] = restoredExpense(userId, fromFirebaseExpense(id, data as StoredExpense), existing);
  }
  for (const [id, rule] of Object.entries(backup.recurring)) {
    updates[`recurring/${id}`] = rule;
  }
  const preferences = { ...backup.preferences };
  delete preferences.smsInboxToken;
  for (const key of ['trips', 'merchantAliases']) {
    const entries = preferences[key];
    for (const [id, value] of Object.entries(isRecord(entries) ? entries : {})) {
      updates[`preferences/${key}/${id}`] = value;
    }
    delete preferences[key];
  }
  for (const [key, value] of Object.entries(preferences)) {
    updates[`preferences/${key}`] = value;
  }

  await update(ref(db, USER_PATH(userId)), updates);
  return { expenses: Object.keys(backup.expenses).length, recurring: Object.keys(backup.recurring).length };
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
      const data: Record<string, StoredExpense> | null = snapshot.val();
      const fetchedExpenses = Object.entries(data || {}).map(([key, expenseData]) => fromFirebaseExpense(key, expenseData));

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
  await update(ref(db, USER_PATH(userId)), { expenses: null, receipts: null });
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
  preferences: { [K in keyof UserPreferences]?: UserPreferences[K] | null }
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
