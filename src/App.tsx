/**
 * Main App Component - Refactored
 * Orchestrates state management and renders appropriate views
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { PlusCircle, DollarSign, Calendar, Settings } from 'lucide-react';

// Types
import type { Expense, ViewType } from './types';

// Constants
import { LOCAL_STORAGE_KEY } from './constants';

// Hooks
import { useSettings, useOnlineStatus, useExpenses } from './hooks';

// Services
import {
  isFirebaseConfigured,
  initializeFirebaseApp,
  getFirebaseAuth,
  getFirebaseDatabase,
  setupAuthStateListener,
  signInWithGoogle as firebaseSignIn,
  handleSignOut as firebaseSignOut,
  subscribeToExpenses,
  addExpenseToFirebase,
  updateExpenseInFirebase,
  deleteExpenseFromFirebase,
  syncPendingExpensesToFirebase as serviceSyncPending,
  syncRestoredCsvToFirebase as serviceSyncCsvToFirebase,
  deleteAllExpensesFromFirebase,
} from './services/firebase';
import { loadExpensesFromLocalStorage, saveAllExpensesToLocalStorage } from './services/localStorage';
import { convertToCsv, parseCsv } from './services/csv';

// Utils
import { showModal } from './utils';

// Views
import { AuthView } from './views/AuthView';
import { AddExpenseView } from './views/AddExpenseView';
import { ListView } from './views/ListView';
import { StatsView } from './views/StatsView';
import { SettingsView } from './views/SettingsView';

const App = () => {
  const { exportUrl, currency, updateExportUrl, updateCurrency } = useSettings();
  const isOnline = useOnlineStatus();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);

  const [restoredData, setRestoredData] = useState<Expense[] | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const isAuthenticated = !!user;

  const [view, setView] = useState<ViewType>('list');

  // Use the custom expense management hook
  const {
    form,
    editingExpenseId,
    filterYear,
    setFilterYear,
    filterMonth,
    setFilterMonth,
    filterMode,
    setFilterMode,
    selectedMonths,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    searchText,
    setSearchText,
    selectedTags,
    setSelectedTags,
    visibleCount,
    setVisibleCount,
    allExpenses,
    allAvailableTags,
    availableMonths,
    availableYears,
    listViewExpenses,
    listViewTotal,
    filteredExpenses,
    monthlyTotal,
    annualTotals,
    filterDateString,
    handleFormChange,
    handleFormClose,
    handleAddExpense,
    handleEditExpense,
    handleDeleteExpense,
    toggleMonthSelection,
    toggleTagSelection,
    handlePrevMonth,
    handleNextMonth,
    handlePrevYear,
    handleNextYear,
  } = useExpenses({
    expenses,
    pendingExpenses,
    setPendingExpenses,
    currency,
    isOnline,
    isAuthenticated,
    db,
    user,
    setLoading,
    setView,
    saveAllExpensesToLocalStorage,
    addExpenseToFirebase,
    updateExpenseInFirebase,
    deleteExpenseFromFirebase,
    showModal,
  });

  // Refs for sync management
  const expensesRef = useRef(expenses);
  const pendingExpensesRef = useRef(pendingExpenses);
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  useEffect(() => {
    pendingExpensesRef.current = pendingExpenses;
  }, [pendingExpenses]);

  // Load from localStorage on mount
  useEffect(() => {
    loadExpensesFromLocalStorage(setExpenses, setPendingExpenses);
  }, []);

  // Auth Functions
  const signInWithGoogle = useCallback(async () => {
    if (!auth) return;
    await firebaseSignIn(auth, setLoading);
  }, [auth]);

  const handleSignOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth, () => {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setUser(null);
      setExpenses([]);
      setPendingExpenses([]);
      setRestoredData(null);
      setView('auth');
    });
  }, [auth]);

  // Firebase Initialization
  useEffect(() => {
    const initFirebase = async () => {
      if (!isFirebaseConfigured()) {
        console.warn("Firebase config not fully configured. Running in local-only mode.");
        setLoading(false);
        loadExpensesFromLocalStorage(setExpenses, setPendingExpenses);
        setView('auth');
        return;
      }

      try {
        const app = initializeFirebaseApp();
        const database = getFirebaseDatabase(app);
        const firebaseAuth = getFirebaseAuth(app);

        setDb(database);
        setAuth(firebaseAuth);

        const unsubscribe = setupAuthStateListener(firebaseAuth, (currentUser: any) => {
          if (currentUser) {
            setUser(currentUser);
            setView('list');
          } else {
            setUser(null);
            setLoading(false);
            loadExpensesFromLocalStorage(setExpenses, setPendingExpenses);
            const hasLocalData = localStorage.getItem(LOCAL_STORAGE_KEY);
            setView(hasLocalData ? 'list' : 'auth');
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Firebase initialization failed. Running in local-only mode.", error);
        setLoading(false);
        loadExpensesFromLocalStorage(setExpenses, setPendingExpenses);
        setView('auth');
      }
    };
    initFirebase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync pending expenses to Firebase
  const syncPendingExpensesToFirebase = async (dataToSync: Expense[], userId: string) => {
    if (!db || syncInProgressRef.current) return;
    syncInProgressRef.current = true;
    setLoading(true);

    await serviceSyncPending(
      db,
      userId,
      dataToSync,
      () => {
        setPendingExpenses([]);
        saveAllExpensesToLocalStorage(expensesRef.current, []);
        showModal('Sync Complete', `${dataToSync.length} offline items uploaded.`);
        setLoading(false);
        syncInProgressRef.current = false;
      },
      (error: any) => {
        console.error("Error during sync of pending data:", error);
        showModal('Sync Failed', `Failed to upload offline data: ${error.message}.`);
        setLoading(false);
        syncInProgressRef.current = false;
      }
    );
  };

  // Auto-Sync Trigger
  useEffect(() => {
    if (isOnline && isAuthenticated && db && user && pendingExpensesRef.current.length > 0 && !syncInProgressRef.current) {
      console.log(`Auto-sync triggered: ${pendingExpensesRef.current.length} pending items.`);
      syncPendingExpensesToFirebase(pendingExpensesRef.current, user.uid);
    }
  }, [isOnline, isAuthenticated, db, user]);

  // Real-time Database Listener
  useEffect(() => {
    if (!db || !user || !isOnline) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToExpenses(
      db,
      user.uid,
      (fetchedExpenses: any) => {
        setExpenses(fetchedExpenses);
        setLoading(false);
        saveAllExpensesToLocalStorage(fetchedExpenses, pendingExpensesRef.current);
      },
      (_error: any) => {
        setLoading(false);
        if (isAuthenticated && isOnline) {
          showModal("Access Denied", "Could not load data. Check auth/rules.", false, () => handleSignOut());
        }
      }
    );

    return unsubscribe;
  }, [db, user, isOnline, isAuthenticated, handleSignOut]);

  // CSV Functions
  const syncRestoredCsvToFirebase = async (dataToSync: Expense[], userId: string) => {
    if (!db || !user) return;
    showModal(
      'Confirm CSV Import',
      `This will attempt to upload ${dataToSync.length} records from the CSV file. IDs will be used to prevent duplicates if they match existing records.`,
      true,
      async () => {
        setLoading(true);
        await serviceSyncCsvToFirebase(
          db,
          userId,
          dataToSync,
          new Set(expenses.map(e => e.id)),
          (count: number) => {
            setRestoredData(null);
            showModal('Import Complete', `${count} records processed and synchronized with the cloud.`);
            setLoading(false);
          },
          (error: any) => {
            console.error("Error during CSV import sync:", error);
            showModal('Import Failed', `Failed to complete synchronization: ${error.message}.`);
            setLoading(false);
          }
        );
      }
    );
  };

  const downloadCsv = () => {
    if (allExpenses.length === 0) {
      showModal("No Data", "There are no expenses to backup.");
      return;
    }
    const csvContent = convertToCsv(allExpenses);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `moneytrack_backup_${new Date().toISOString().substring(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showModal('Backup Successful', `${allExpenses.length} expenses downloaded as CSV.`);
  };

  const exportToGoogleSheets = async () => {
    if (!exportUrl || exportUrl.trim() === '') {
      showModal('Configuration Required', 'Please set your Google Sheets Web App URL in the settings first.');
      return;
    }

    if (allExpenses.length === 0) {
      showModal('No Data', 'There are no expenses to export.');
      return;
    }

    try {
      setLoading(true);

      // Prepare data for Google Sheets
      const data = allExpenses.map(expense => ({
        id: expense.id,
        userId: expense.userId,
        amount: expense.amount,
        currency: expense.currency,
        description: expense.description,
        tag: expense.tag,
        timestamp: expense.timestamp.toISOString(),
        dateStr: expense.dateStr,
        timeStr: expense.timeStr,
        syncStatus: expense.syncStatus
      }));

      // Send to Google Sheets Web App
      await fetch(exportUrl, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script requires no-cors
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'export',
          expenses: data
        })
      });

      // Note: With no-cors mode, we can't read the response
      // We'll assume success if no error was thrown
      showModal(
        'Export Initiated',
        `Successfully sent ${allExpenses.length} expenses to Google Sheets.\n\nPlease check your spreadsheet to verify the data was imported.`
      );
    } catch (error: any) {
      console.error('Error exporting to Google Sheets:', error);
      showModal(
        'Export Failed',
        `Failed to export to Google Sheets: ${error.message}\n\nPlease verify your Web App URL is correct and the script is deployed.`
      );
    } finally {
      setLoading(false);
    }
  };

  const parseCsvAndRestore = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.style.display = 'none';

    fileInput.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvContent = event.target?.result as string;
          const parsedData = parseCsv(csvContent);

          if (parsedData.length === 0) {
            showModal('Restore Failed', 'The selected file contained no valid expense records.');
            setRestoredData(null);
            return;
          }

          setRestoredData(parsedData);
          showModal('Backup Loaded', `${parsedData.length} records loaded from CSV. Go to Settings > Cloud & Data Sync to import them.`);
          setView('settings');

        } catch (error: any) {
          console.error("CSV Parsing Error:", error);
          showModal('Restore Failed', `Error parsing CSV: ${error.message}`);
          setRestoredData(null);
        }
      };
      reader.onerror = () => {
        showModal('Restore Failed', 'Could not read the file.');
        setRestoredData(null);
      };
      reader.readAsText(file);
    };

    fileInput.click();
  };

  const handleDeleteAllData = async () => {
    showModal(
      'Delete All Data',
      'WARNING: This will permanently delete ALL your expenses from both cloud and local storage. This action cannot be undone!\n\nAre you sure you want to continue?',
      true,
      async () => {
        try {
          setLoading(true);

          if (db && user && isOnline) {
            await deleteAllExpensesFromFirebase(db, user.uid);
          }

          localStorage.removeItem(LOCAL_STORAGE_KEY);

          setExpenses([]);
          setPendingExpenses([]);
          setRestoredData(null);

          showModal('Data Deleted', 'All expense data has been permanently deleted.');
        } catch (error: any) {
          console.error("Error deleting all data:", error);
          showModal('Delete Failed', `Failed to delete all data: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  // Render appropriate view
  const renderView = () => {
    if (loading && !user && !localStorage.getItem(LOCAL_STORAGE_KEY)) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated && !localStorage.getItem(LOCAL_STORAGE_KEY) && view === 'auth') {
      return (
        <AuthView
          loading={loading}
          onSignInWithGoogle={signInWithGoogle}
          onContinueLocal={() => { setLoading(false); setView('list'); }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Money Track</h1>
            {isAuthenticated && user?.email && (
              <div className="text-sm text-gray-600 hidden sm:block">
                {user.email}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow p-4 max-w-4xl mx-auto w-full">
          {view === 'list' && (
            <ListView
              listViewExpenses={listViewExpenses}
              listViewTotal={listViewTotal}
              visibleCount={visibleCount}
              setVisibleCount={setVisibleCount}
              filterMode={filterMode}
              setFilterMode={setFilterMode}
              selectedMonths={selectedMonths}
              toggleMonthSelection={toggleMonthSelection}
              availableMonths={availableMonths}
              customStartDate={customStartDate}
              setCustomStartDate={setCustomStartDate}
              customEndDate={customEndDate}
              setCustomEndDate={setCustomEndDate}
              searchText={searchText}
              setSearchText={setSearchText}
              selectedTags={selectedTags}
              toggleTagSelection={toggleTagSelection}
              setSelectedTags={setSelectedTags}
              allAvailableTags={allAvailableTags}
              handleDeleteExpense={handleDeleteExpense}
              handleEditExpense={handleEditExpense}
              currency={currency}
              isOnline={isOnline}
              loading={loading}
              isAuthenticated={isAuthenticated}
              pendingExpenses={pendingExpenses}
            />
          )}

          {view === 'add' && (
            <AddExpenseView
              form={form}
              handleFormChange={handleFormChange}
              handleFormClose={handleFormClose}
              handleAddExpense={handleAddExpense}
              loading={loading}
              isAuthenticated={isAuthenticated}
              isOnline={isOnline}
              currency={currency}
              expenses={allExpenses}
              availableTags={allAvailableTags}
              editingExpenseId={editingExpenseId}
            />
          )}

          {view === 'stats' && (
            <StatsView
              filterYear={filterYear}
              setFilterYear={setFilterYear}
              filterMonth={filterMonth}
              setFilterMonth={setFilterMonth}
              annualTotals={annualTotals}
              filteredExpenses={filteredExpenses}
              monthlyTotal={monthlyTotal}
              filterDateString={filterDateString}
              availableYears={availableYears}
              handlePrevYear={handlePrevYear}
              handleNextYear={handleNextYear}
              handlePrevMonth={handlePrevMonth}
              handleNextMonth={handleNextMonth}
              handleDeleteExpense={handleDeleteExpense}
              handleEditExpense={handleEditExpense}
              currency={currency}
              isOnline={isOnline}
              allExpenses={allExpenses}
            />
          )}

          {view === 'settings' && (
            <SettingsView
              user={user}
              isAuthenticated={isAuthenticated}
              handleSignOut={handleSignOut}
              currency={currency}
              updateCurrency={updateCurrency}
              pendingExpenses={pendingExpenses}
              expenses={expenses}
              syncPendingExpensesToFirebase={syncPendingExpensesToFirebase}
              isOnline={isOnline}
              loading={loading}
              exportUrl={exportUrl}
              updateExportUrl={updateExportUrl}
              allExpenses={allExpenses}
              downloadCsv={downloadCsv}
              parseCsvAndRestore={parseCsvAndRestore}
              restoredData={restoredData}
              syncRestoredCsvToFirebase={syncRestoredCsvToFirebase}
              setRestoredData={setRestoredData}
              setLoading={setLoading}
              setPendingExpenses={setPendingExpenses}
              setView={setView}
              handleDeleteAllData={handleDeleteAllData}
              exportToGoogleSheets={exportToGoogleSheets}
            />
          )}
        </main>

        {/* Navigation */}
        <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-10">
          <div className="max-w-4xl mx-auto flex justify-around items-center p-3">
            <button
              onClick={() => setView('list')}
              className={`flex flex-col items-center px-4 py-2 rounded-lg transition ${
                view === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="w-6 h-6" />
              <span className="text-xs mt-1">Transactions</span>
            </button>

            <button
              onClick={() => setView('add')}
              className="flex flex-col items-center px-6 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition transform hover:scale-105"
            >
              <PlusCircle className="w-7 h-7" />
              <span className="text-xs mt-1">Add</span>
            </button>

            <button
              onClick={() => setView('stats')}
              className={`flex flex-col items-center px-4 py-2 rounded-lg transition ${
                view === 'stats' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-6 h-6" />
              <span className="text-xs mt-1">Stats</span>
            </button>

            <button
              onClick={() => setView('settings')}
              className={`flex flex-col items-center px-4 py-2 rounded-lg transition ${
                view === 'settings' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-6 h-6" />
              <span className="text-xs mt-1">Settings</span>
            </button>
          </div>
        </nav>
      </div>
    );
  };

  return renderView();
};

export default App;
