/**
 * Central export for all Firebase services
 */

export * from './initialization';
export * from './auth';
export {
    getFirebaseDatabase,
    addExpenseToFirebase,
    updateExpenseInFirebase,
    deleteExpenseFromFirebase,
    syncPendingExpensesToFirebase,
    syncRestoredCsvToFirebase,
    subscribeToExpenses,
    deleteAllExpensesFromFirebase,
    migrateExpensesToDefaultCurrency,
    getUserPreferences,
    updateUserPreferences,
    subscribeToUserPreferences,
    migrateExpensesToBaseAmounts,
} from './database';
