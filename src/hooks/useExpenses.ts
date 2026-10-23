/**
 * Custom hook for managing expense state and filtering logic
 * Consolidates all expense-related state, computed values, and handlers
 */

import { useState, useMemo, useCallback } from 'react';
import type { Database } from 'firebase/database';
import type { Expense, FormState, FilterMode, AnnualTotal, ExchangeRates, Trip } from '../types';
import { TAGS, PAGINATION_SIZE } from '../constants';
import { timestampToDate } from '../utils';
import { parseQuickEntry } from '../utils/quickAdd';
import { findTripIdForDate } from '../utils/trips';
import { compressImage } from '../utils/image';
import { parseTransactionEmail } from '../services/gmail/emailParser';
import { guessTag } from '../services/gmail/tagMapper';
import { getReceipt } from '../services/firebase/database';

type ExpenseInput = Omit<Expense, 'id' | 'syncStatus'>;

const createEmptyForm = (currency: string, trips: Record<string, Trip>): FormState => {
  // Local date, not toISOString(): in India the UTC date is still "yesterday" until 05:30
  const date = new Date().toLocaleDateString('en-CA');
  return {
    amount: '',
    description: '',
    tag: TAGS[0],
    date,
    time: new Date().toTimeString().substring(0, 5),
    currency,
    type: 'debit',
    tripId: findTripIdForDate(trips, date),
  };
};


interface UseExpensesParams {
  expenses: Expense[];
  pendingExpenses: Expense[];
  setPendingExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  currency: string;
  isOnline: boolean;
  isAuthenticated: boolean;
  db: any;
  user: any;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setView: React.Dispatch<React.SetStateAction<any>>;
  saveAllExpensesToLocalStorage: (expenses: Expense[], pending: Expense[]) => void;
  addExpenseToFirebase: (db: Database, userId: string, expense: ExpenseInput, customId?: string, receipt?: string) => Promise<string>;
  updateExpenseInFirebase: (db: Database, userId: string, id: string, expense: ExpenseInput, receipt?: string | null) => Promise<void>;
  deleteExpenseFromFirebase: (db: Database, userId: string, id: string) => Promise<void>;
  showModal: (title: string, message: string, confirm?: boolean, onConfirm?: () => void) => void;
  exchangeRates: ExchangeRates | null;
  trips: Record<string, Trip>;
}

export const useExpenses = ({
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
  exchangeRates,
  trips,
}: UseExpensesParams) => {
  // Filter states
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterMode, setFilterMode] = useState<FilterMode>('current');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  ]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGINATION_SIZE);

  // Form state
  const [form, setForm] = useState<FormState>(() => createEmptyForm(currency, trips));
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  // undefined = keep current receipt, null = remove it, string = new compressed photo
  const [receiptDraft, setReceiptDraft] = useState<string | null | undefined>(undefined);
  const [receiptViewUrl, setReceiptViewUrl] = useState<string | null>(null);

  // Trips and the preferred currency load from Firebase after the form exists; a new expense should still get them
  const [tripsSeen, setTripsSeen] = useState(trips);
  if (tripsSeen !== trips) {
    setTripsSeen(trips);
    if (!editingExpenseId) setForm(prev => ({ ...prev, tripId: findTripIdForDate(trips, prev.date) }));
  }
  const [currencySeen, setCurrencySeen] = useState(currency);
  if (currencySeen !== currency) {
    setCurrencySeen(currency);
    if (!editingExpenseId) setForm(prev => (prev.amount ? prev : { ...prev, currency }));
  }

  // Computed: All expenses combined
  const allExpenses = useMemo(() => {
    return [...expenses, ...pendingExpenses].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [expenses, pendingExpenses]);

  // Computed: Spending only. Every total, chart and budget uses this so income never inflates spend.
  const spendExpenses = useMemo(() => allExpenses.filter(e => e.type !== 'credit'), [allExpenses]);

  // Computed: Available tags
  const allAvailableTags = useMemo(() => {
    const customTags = new Set(allExpenses.map(e => e.tag));
    const combined = new Set([...TAGS, ...Array.from(customTags)]);
    return Array.from(combined).sort();
  }, [allExpenses]);

  // Computed: Available months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    allExpenses.forEach(expense => {
      const date = expense.timestamp;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(monthKey);
    });
    return Array.from(monthsSet).sort().reverse();
  }, [allExpenses]);

  // Computed: Available years
  const availableYears = useMemo(() => {
    const yearsSet = new Set(allExpenses.map(e => e.timestamp.getFullYear()));
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allExpenses]);

  // Computed: List view filtered expenses
  const listViewExpenses = useMemo(() => {
    let filtered = allExpenses;

    // Date filtering based on mode
    if (filterMode === 'current') {
      const now = new Date();
      filtered = filtered.filter(e => {
        const expDate = e.timestamp;
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      });
    } else if (filterMode === 'selected' && selectedMonths.length > 0) {
      filtered = filtered.filter(e => {
        const monthKey = `${e.timestamp.getFullYear()}-${String(e.timestamp.getMonth() + 1).padStart(2, '0')}`;
        return selectedMonths.includes(monthKey);
      });
    } else if (filterMode === 'custom' && customStartDate && customEndDate) {
      const startDate = new Date(customStartDate);
      const endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);
    }

    // Search filtering
    if (searchText.trim()) {
      filtered = filtered.filter(e => e.description.toLowerCase().includes(searchText.toLowerCase()));
    }

    // Tag filtering
    if (selectedTags.length > 0) {
      filtered = filtered.filter(e => selectedTags.includes(e.tag));
    }

    return filtered;
  }, [allExpenses, filterMode, selectedMonths, customStartDate, customEndDate, searchText, selectedTags]);

  // Helper function to get amount in user's currency with live conversion
  const getAmountInCurrency = useCallback((expense: Expense): number => {
    if (currency === 'INR') {
      return expense.amountINR || expense.amount;
    } else if (currency === 'USD') {
      return expense.amountUSD || expense.amount;
    } else {
      // For other currencies, convert from USD using live rates
      if (expense.currency === currency) {
        return expense.amount;
      }
      // Convert USD to target currency
      if (exchangeRates && exchangeRates.rates[currency]) {
        return (expense.amountUSD || expense.amount) * exchangeRates.rates[currency];
      }
      // Fallback to USD amount if no rate available
      return expense.amountUSD || expense.amount;
    }
  }, [currency, exchangeRates]);

  // Computed: List view totals (spend and income kept apart)
  const { listViewTotal, listViewIncome } = useMemo(() => {
    let spend = 0;
    let income = 0;
    for (const expense of listViewExpenses) {
      if (expense.type === 'credit') income += getAmountInCurrency(expense);
      else spend += getAmountInCurrency(expense);
    }
    return { listViewTotal: spend, listViewIncome: income };
  }, [listViewExpenses, getAmountInCurrency]);

  // Computed: Stats view month (list shows income too; totals are split)
  const { filteredExpenses, monthlyTotal, monthlyIncome, prevMonthTotal } = useMemo(() => {
    const inMonth = (expense: Expense, year: number, month: number) =>
      expense.timestamp.getMonth() === month && expense.timestamp.getFullYear() === year;
    const sum = (list: Expense[]) => list.reduce((total, expense) => total + getAmountInCurrency(expense), 0);

    const filtered = allExpenses.filter(expense => inMonth(expense, filterYear, filterMonth));
    const prev = new Date(filterYear, filterMonth - 1, 1);

    return {
      filteredExpenses: filtered,
      monthlyTotal: sum(filtered.filter(e => e.type !== 'credit')),
      monthlyIncome: sum(filtered.filter(e => e.type === 'credit')),
      prevMonthTotal: sum(spendExpenses.filter(e => inMonth(e, prev.getFullYear(), prev.getMonth()))),
    };
  }, [allExpenses, spendExpenses, filterMonth, filterYear, getAmountInCurrency]);

  // Computed: Annual totals
  const annualTotals = useMemo<AnnualTotal[]>(() => {
    const totals: { [key: number]: AnnualTotal } = {};
    const currentYearExpenses = spendExpenses.filter(e => timestampToDate(e.timestamp).getFullYear() === filterYear);

    for (let i = 0; i < 12; i++) {
      totals[i] = {
        total: 0,
        count: 0,
        monthName: new Date(filterYear, i).toLocaleString('en-US', { month: 'short' })
      };
    }

    currentYearExpenses.forEach(expense => {
      const month = timestampToDate(expense.timestamp).getMonth();
      totals[month].total += getAmountInCurrency(expense);
      totals[month].count += 1;
    });

    return Object.values(totals);
  }, [spendExpenses, filterYear, getAmountInCurrency]);

  // Computed: Filter date string
  const filterDateString = useMemo(() => {
    const currentFilterDate = new Date(filterYear, filterMonth);
    return currentFilterDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [filterYear, filterMonth]);

  // Handlers: Navigation
  const handlePrevMonth = useCallback(() => {
    const newDate = new Date(filterYear, filterMonth - 1, 1);
    setFilterMonth(newDate.getMonth());
    setFilterYear(newDate.getFullYear());
  }, [filterYear, filterMonth]);

  const handleNextMonth = useCallback(() => {
    const newDate = new Date(filterYear, filterMonth + 1, 1);
    setFilterMonth(newDate.getMonth());
    setFilterYear(newDate.getFullYear());
  }, [filterYear, filterMonth]);

  const handlePrevYear = useCallback(() => setFilterYear(prev => prev - 1), []);
  const handleNextYear = useCallback(() => setFilterYear(prev => prev + 1), []);

  // Handlers: Filter toggles
  const toggleMonthSelection = useCallback((monthKey: string) => {
    setSelectedMonths(prev =>
      prev.includes(monthKey)
        ? prev.filter(m => m !== monthKey)
        : [...prev, monthKey]
    );
  }, []);

  const toggleTagSelection = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // Handlers: Form
  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      // New expenses follow the trip covering their date; edits keep what was saved
      ...(name === 'date' && !editingExpenseId ? { tripId: findTripIdForDate(trips, value) } : {}),
    }));
  }, [editingExpenseId, trips]);

  const prefillForm = useCallback((values: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...values }));
  }, []);

  /** "450 swiggy" → amount, description and a tag guess */
  const applyQuickEntry = useCallback((text: string) => {
    const { amount, description } = parseQuickEntry(text);
    const tag = guessTag(description, allExpenses);
    setForm(prev => ({ ...prev, amount, description, ...(tag ? { tag } : {}) }));
  }, [allExpenses]);

  /**
   * Fills the form from a bank SMS / alert text using the Gmail parser
   * @returns false when no amount could be found
   */
  const applySmsText = useCallback((text: string): boolean => {
    const parsed = parseTransactionEmail({ id: 'clipboard', subject: text, body: text, date: Date.now() });
    if (!parsed) return false;
    const tag = guessTag(parsed.description, allExpenses) || parsed.suggestedTag;
    setForm(prev => ({
      ...prev,
      amount: String(parsed.amount),
      description: parsed.description,
      currency: parsed.currency,
      type: parsed.transactionType,
      tag,
    }));
    return true;
  }, [allExpenses]);

  const handleReceiptFile = useCallback(async (file: File) => {
    try {
      setReceiptDraft(await compressImage(file));
    } catch (error) {
      showModal('Receipt Error', (error as Error).message);
    }
  }, [showModal]);

  const removeReceipt = useCallback(() => setReceiptDraft(null), []);

  const handleViewReceipt = useCallback(async (id: string) => {
    if (!db || !user) return;
    try {
      const url = await getReceipt(db, user.uid, id);
      if (url) setReceiptViewUrl(url);
      else showModal('Receipt', 'No receipt found for this expense.');
    } catch (error) {
      showModal('Receipt Error', `Could not load the receipt: ${(error as Error).message}`);
    }
  }, [db, user, showModal]);

  const closeReceiptView = useCallback(() => setReceiptViewUrl(null), []);

  const handleFormClose = useCallback(() => {
    setForm(createEmptyForm(currency, trips));
    setEditingExpenseId(null);
    setReceiptDraft(undefined);
    setView('list');
  }, [currency, trips, setView]);

  // Handlers: Add/Edit expense
  const handleAddExpense = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const { amount, description, tag, date, time, currency: formCurrency, type, tripId } = form;
    const amountFloat = parseFloat(amount);
    const currentUserId = user?.uid || 'offline-user';

    if (isNaN(amountFloat) || amountFloat <= 0 || !description || !date || !time) {
      showModal("Invalid Input", "Please ensure the amount is positive and all fields are filled.");
      return;
    }

    try {
      setLoading(true);
      const dateTime = new Date(`${date}T${time}:00`);

      // Fetch exchange rates for conversion
      const { getExchangeRates, convertToBaseAmounts } = await import('../services/exchangeRate');
      let rates;
      try {
        rates = await getExchangeRates('creation');
      } catch (rateError: any) {
        showModal(
          "Exchange Rate Error",
          `Unable to fetch exchange rates: ${rateError.message}\n\nPlease check your internet connection and try again.`
        );
        setLoading(false);
        return;
      }

      // Calculate base amounts
      const { amountINR, amountUSD } = convertToBaseAmounts(
        amountFloat,
        formCurrency || currency,
        rates
      );

      // EDITING MODE
      if (editingExpenseId) {
        const existingExpense = allExpenses.find(e => e.id === editingExpenseId);
        if (!existingExpense) {
          showModal("Error", "Expense not found.");
          setLoading(false);
          return;
        }

        const updatedExpense: Expense = {
          ...existingExpense,
          amount: amountFloat,
          currency: formCurrency || currency,
          amountINR,
          amountUSD,
          description: description.trim(),
          tag,
          timestamp: dateTime,
          dateStr: date,
          timeStr: time,
          type: type === 'credit' ? 'credit' : undefined,
          tripId: tripId || undefined,
        };

        if (existingExpense.syncStatus === 'synced' && isOnline && db && user) {
          const { id, syncStatus, ...expenseData } = updatedExpense;
          await updateExpenseInFirebase(db, user.uid, editingExpenseId, expenseData, receiptDraft);
        } else {
          setPendingExpenses(prev => {
            const newPending = prev.map(e => e.id === editingExpenseId ? updatedExpense : e);
            saveAllExpensesToLocalStorage(expenses, newPending);
            return newPending;
          });
        }

        handleFormClose();
        setLoading(false);
        return;
      }

      // ADD NEW EXPENSE
      const newExpense: Expense = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUserId,
        amount: amountFloat,
        currency: formCurrency || currency,
        amountINR,
        amountUSD,
        description: description.trim(),
        tag,
        timestamp: dateTime,
        dateStr: date,
        timeStr: time,
        syncStatus: 'pending',
        ...(type === 'credit' ? { type: 'credit' as const } : {}),
        ...(tripId ? { tripId } : {}),
      };

      if (isOnline && isAuthenticated && db && user) {
        try {
          const { id, syncStatus, ...expenseData } = newExpense;
          await addExpenseToFirebase(db, user.uid, expenseData, undefined, receiptDraft || undefined);
          handleFormClose();
        } catch (firebaseError: any) {
          console.error("Firebase error:", firebaseError);

          if (firebaseError.code === 'PERMISSION_DENIED') {
            setPendingExpenses(prev => {
              const newPending = [newExpense, ...prev];
              saveAllExpensesToLocalStorage(expenses, newPending);
              return newPending;
            });
            handleFormClose();

            showModal(
              "Saved Locally",
              "⚠️ Firebase permission denied. Your expense was saved locally and will sync when you fix Firebase security rules.\n\nUpdate your Firebase Realtime Database rules to:\n{\n  \"rules\": {\n    \"users\": {\n      \"$uid\": {\n        \".read\": \"$uid === auth.uid\",\n        \".write\": \"$uid === auth.uid\"\n      }\n    }\n  }\n}"
            );
          } else {
            throw firebaseError;
          }
        }
      } else {
        setPendingExpenses(prev => {
          const newPending = [newExpense, ...prev];
          saveAllExpensesToLocalStorage(expenses, newPending);
          return newPending;
        });
        handleFormClose();
        if (receiptDraft) {
          showModal('Receipt Not Saved', 'Receipts need you to be online and signed in. The expense was saved without it.');
        }
      }
    } catch (error: any) {
      console.error("Error adding/updating expense:", error);
      showModal("Error", `Failed to save expense: ${error.message || error.code || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [
    form,
    editingExpenseId,
    receiptDraft,
    allExpenses,
    currency,
    isOnline,
    isAuthenticated,
    db,
    user,
    expenses,
    setPendingExpenses,
    setLoading,
    showModal,
    handleFormClose,
    saveAllExpensesToLocalStorage,
    addExpenseToFirebase,
    updateExpenseInFirebase,
  ]);

  // Handlers: Edit expense
  const handleEditExpense = useCallback((id: string) => {
    const expense = allExpenses.find(e => e.id === id);
    if (!expense) return;

    const isDeleteDisabled = expense.syncStatus === 'synced' && !isOnline;
    if (isDeleteDisabled) {
      showModal("Offline Warning", "Cannot edit a synced item while offline. Please try again when online.");
      return;
    }

    setForm({
      amount: expense.amount.toString(),
      description: expense.description,
      tag: expense.tag,
      date: expense.dateStr,
      time: expense.timeStr,
      currency: expense.currency,
      type: expense.type === 'credit' ? 'credit' : 'debit',
      tripId: expense.tripId || '',
    });
    setEditingExpenseId(id);
    setReceiptDraft(undefined);
    setView('add');
  }, [allExpenses, isOnline, setView, showModal]);

  // Handlers: Delete expense
  const handleDeleteExpense = useCallback(async (id: string) => {
    if (!id) return;

    const expense = allExpenses.find(e => e.id === id);
    if (!expense) return;

    if (expense.syncStatus === 'pending') {
      showModal(
        "Confirm Local Deletion",
        "Are you sure you want to delete this pending expense? It has not been synced to the cloud.",
        true,
        () => {
          setPendingExpenses(prev => {
            const newPending = prev.filter(e => e.id !== id);
            saveAllExpensesToLocalStorage(expenses, newPending);
            return newPending;
          });
          showModal("Expense Deleted", "Pending expense removed.");
        }
      );
      return;
    }

    // Cloud Delete
    showModal(
      "Confirm Cloud Deletion",
      "Are you sure you want to delete this expense from the cloud?",
      true,
      async () => {
        try {
          setLoading(true);
          if (!isOnline) {
            showModal("Offline Warning", "Cannot delete a synced item while offline. Please try again when online.");
            setLoading(false);
            return;
          }
          await deleteExpenseFromFirebase(db, user.uid, id);
        } catch (error: any) {
          console.error("Error deleting expense:", error);
          showModal("Delete Error", `Failed to delete expense: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }
    );
  }, [
    allExpenses,
    isOnline,
    db,
    user,
    expenses,
    setPendingExpenses,
    setLoading,
    showModal,
    saveAllExpensesToLocalStorage,
    deleteExpenseFromFirebase,
  ]);

  return {
    // State
    form,
    editingExpenseId,
    receiptDraft,
    receiptViewUrl,
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

    // Computed values
    allExpenses,
    spendExpenses,
    allAvailableTags,
    availableMonths,
    availableYears,
    listViewExpenses,
    listViewTotal,
    listViewIncome,
    filteredExpenses,
    monthlyTotal,
    monthlyIncome,
    prevMonthTotal,
    annualTotals,
    filterDateString,

    // Handlers
    handleFormChange,
    handleFormClose,
    prefillForm,
    applyQuickEntry,
    applySmsText,
    handleReceiptFile,
    removeReceipt,
    handleViewReceipt,
    closeReceiptView,
    handleAddExpense,
    handleEditExpense,
    handleDeleteExpense,
    toggleMonthSelection,
    toggleTagSelection,
    handlePrevMonth,
    handleNextMonth,
    handlePrevYear,
    handleNextYear,
  };
};
