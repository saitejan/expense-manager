
const firebaseConfig = {
  apiKey: "AIzaSyCchJ0xoRHhNC7NcuWdzmLxlbEyH3fOZA0",
  authDomain: "expense-manaeger.firebaseapp.com",
  projectId: "expense-manaeger",
  storageBucket: "expense-manaeger.firebasestorage.app",
  messagingSenderId: "773230073358",
  appId: "1:773230073358:web:2cf7feee179a90c85c4e5f"
};

// __app_id may be injected at runtime; declare it for TypeScript
declare const __app_id: string | undefined;
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.appId;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, onSnapshot, collection, query, deleteDoc, Timestamp, setDoc } from 'firebase/firestore';
import { 
    PlusCircle, Trash2, Calendar, DollarSign, Tag, User, Download, Settings, LogOut, ArrowLeft, ArrowRight, Save, Upload, AlertTriangle, Lock, CloudOff, Cloud, HardDrive 
} from 'lucide-react';

// --- CONSTANTS ---
const LOCAL_STORAGE_KEY = 'moneytrack_local_expenses';
const TAGS = ['Shopping', 'Food', 'Travel', 'Hospital', 'Wife', 'Baby', 'Me', 'Bills', 'Other'];
const CSV_HEADERS = ['id', 'userId', 'amount', 'currency', 'description', 'tag', 'timestamp', 'dateStr', 'timeStr', 'syncStatus'];
const USER_EXPENSES_COLLECTION_PATH = (uid: string) => `/artifacts/${appId}/users/${uid}/expenses`;

// --- TYPESCRIPT INTERFACES ---

interface Expense {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    description: string;
    tag: string;
    timestamp: Date;
    dateStr: string;
    timeStr: string;
    syncStatus: 'synced' | 'pending'; // New status field
}

interface FormState {
    amount: string;
    description: string;
    tag: string;
    date: string;
    time: string;
}

interface AnnualTotal {
    total: number;
    count: number;
    monthName: string;
}

// --- CORE HELPER FUNCTIONS ---

const timestampToDate = (timestamp: Timestamp | Date): Date => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    // Handle Date object or ISO string which was saved to local storage
    return new Date(timestamp);
}

const formatAmount = (amount: number, dynamicCurrency: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: dynamicCurrency,
    }).format(amount);
  } catch (e) {
    return `${dynamicCurrency} ${parseFloat(amount.toFixed(2))}`;
  }
};

const showModal = (title: string, message: string, isConfirm = false, onConfirm = () => {}, onCancel = () => {}) => {
    const removeModal = () => {
        const modal = document.getElementById('custom-alert-modal');
        if (modal) document.body.removeChild(modal);
    };

    removeModal();
    
    const modalDiv = document.createElement('div');
    modalDiv.id = 'custom-alert-modal';
    modalDiv.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-50 p-4";
    modalDiv.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm transform transition-all">
            <h3 class="text-xl font-bold mb-3 text-indigo-700">${title}</h3>
            <p class="text-gray-700 mb-6 text-sm whitespace-pre-wrap">${message}</p>
            <div class="flex justify-end space-x-2">
              ${isConfirm ? `
                <button id="cancel-modal-btn" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150">
                    Cancel
                </button>
                <button id="confirm-modal-btn" class="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition duration-150">
                    Confirm
                </button>
              ` : `
                <button id="close-modal-btn" class="w-full py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-150">
                    OK
                </button>
              `}
            </div>
        </div>
    `;
    document.body.appendChild(modalDiv);

    // Event handling
    if (isConfirm) {
        document.getElementById('cancel-modal-btn')?.addEventListener('click', () => { onCancel(); removeModal(); });
        document.getElementById('confirm-modal-btn')?.addEventListener('click', () => { onConfirm(); removeModal(); });
    } else {
        document.getElementById('close-modal-btn')?.addEventListener('click', removeModal);
    }
};

// --- LOCAL STORAGE & SYNC HELPERS ---

// Move input-heavy components out of the App render to keep stable identity
// and avoid remounts that cause focus loss while typing.

const ExpenseItem: React.FC<{ expense: Expense; onDelete: (id: string) => void; showDate?: boolean; currency: string; isOnline: boolean }> = ({ expense, onDelete, showDate = false, currency, isOnline }) => {
    const time = expense.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const fullDateDisplay = expense.timestamp.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const isPending = expense.syncStatus === 'pending';
    const isDeleteDisabled = expense.syncStatus === 'synced' && !isOnline;

    const tagColor = React.useMemo(() => {
        const colors: { [key: string]: string } = {
            'Shopping': 'bg-pink-100 text-pink-700',
            'Food': 'bg-green-100 text-green-700',
            'Travel': 'bg-blue-100 text-blue-700',
            'Hospital': 'bg-red-100 text-red-700',
            'Wife': 'bg-purple-100 text-purple-700',
            'Baby': 'bg-yellow-100 text-yellow-700',
            'Me': 'bg-indigo-100 text-indigo-700',
            'Bills': 'bg-cyan-100 text-cyan-700',
            'Other': 'bg-gray-100 text-gray-700',
        };
        return colors[expense.tag] || 'bg-gray-100 text-gray-700';
    }, [expense.tag]);

    return (
        <div className={`flex items-center justify-between p-3 border rounded-lg shadow-sm hover:shadow-md transition duration-200 ${isPending ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className="flex-grow min-w-0">
                <div className="text-xs font-semibold text-gray-500 mb-1">
                    {showDate ? fullDateDisplay : time}
                </div>
                <p className="text-sm font-medium truncate text-gray-800">{expense.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tagColor}`}>
                        {expense.tag}
                    </span>
                    {isPending && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-500 text-white flex items-center">
                            <Save className="w-3 h-3 mr-1" /> Pending
                        </span>
                    )}
                    {expense.currency !== currency && (
                        <span className="text-xs text-gray-500 font-medium">({expense.currency})</span>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-3 ml-4">
                <span className="text-lg font-extrabold text-red-600 flex-shrink-0">
                    {formatAmount(expense.amount, expense.currency)}
                </span>
                <button
                    onClick={() => onDelete(expense.id)}
                    className="p-1 text-red-400 hover:text-red-600 transition duration-150 hover:bg-red-50 rounded-full disabled:opacity-50"
                    aria-label="Delete Expense"
                    disabled={isDeleteDisabled}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const AddExpenseView: React.FC<{
    form: FormState;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleFormClose: () => void;
    handleAddExpense: (e: React.FormEvent) => Promise<void> | void;
    loading: boolean;
    isAuthenticated: boolean;
    isOnline: boolean;
    setView: React.Dispatch<React.SetStateAction<'list' | 'add' | 'stats' | 'settings' | 'auth'>>;
    currency: string;
}> = ({ form, handleFormClose, handleFormChange, handleAddExpense, loading, isAuthenticated, isOnline, currency }) => {
    return (
        <div className="p-4 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <PlusCircle className="w-5 h-5 mr-2 text-indigo-500" />
                Add New Expense
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="amount">Amount ({currency})</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={form.amount}
                            onChange={handleFormChange}
                            step="0.01"
                            min="0.01"
                            required
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                            placeholder="e.g., 49.99"
                        />
                    </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="date">Date</label>
                        <input
                            type="date"
                            id="date"
                            name="date"
                            value={form.date}
                            onChange={handleFormChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="time">Time</label>
                        <input
                            type="time"
                            id="time"
                            name="time"
                            value={form.time}
                            onChange={handleFormChange}
                            required
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">Description (Why)</label>
                    <input
                        type="text"
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={handleFormChange}
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        placeholder="e.g., Groceries at Whole Foods"
                    />
                </div>

                {/* Tag */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tag">Category Tag</label>
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            id="tag"
                            name="tag"
                            value={form.tag}
                            onChange={handleFormChange}
                            required
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none transition duration-150"
                        >
                            {TAGS.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={handleFormClose}
                        className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || (!isAuthenticated && !isOnline)}
                        className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isOnline && isAuthenticated) ? 'Save to Cloud' : 'Save Locally'}
                    </button>
                </div>
            </form>
            {!isOnline && (
                <p className="mt-4 p-2 text-xs text-orange-600 bg-orange-100 rounded-lg flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    You are offline. This expense will be saved locally and sync automatically when you reconnect.
                </p>
            )}
        </div>
    );
};

// --- LOCAL STORAGE & SYNC HELPERS (restored) ---

// Load all expenses (synced + pending) from LocalStorage
const loadExpensesFromLocalStorage = (setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>, setPendingExpenses: React.Dispatch<React.SetStateAction<Expense[]>>) => {
    try {
        const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedData) {
            const allExpenses: Expense[] = JSON.parse(storedData).map((e: any) => ({
                ...e,
                timestamp: new Date(e.timestamp),
                syncStatus: e.syncStatus || 'synced',
            }));

            const synced = allExpenses.filter(e => e.syncStatus === 'synced');
            const pending = allExpenses.filter(e => e.syncStatus === 'pending');

            synced.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            pending.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setExpenses(synced);
            setPendingExpenses(pending);
        }
    } catch (error) {
        console.error("Error loading from localStorage:", error);
    }
};

// Save all expenses (synced + pending) to LocalStorage
const saveAllExpensesToLocalStorage = (synced: Expense[], pending: Expense[]) => {
    try {
        const dataToStore = [...synced, ...pending];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }
};

// --- CSV/Data Helpers ---

const convertToCsv = (data: Expense[]): string => {
    const headers = CSV_HEADERS.join(',') + '\n';
    const rows = data.map(e => [
        e.id || '',
        e.userId,
        e.amount.toString(),
        e.currency,
        `"${e.description.replace(/"/g, '""')}"`,
        e.tag,
        e.timestamp.toISOString(),
        e.dateStr,
        e.timeStr,
        e.syncStatus,
    ].join(',')).join('\n');

    return headers + rows;
};

const parseCsv = (csv: string): Expense[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    if (headers.slice(0, 9).join(',') !== CSV_HEADERS.slice(0, 9).join(',')) {
        throw new Error("Invalid CSV format. Headers do not match expected schema.");
    }
    
    const data: Expense[] = [];
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (row.length >= CSV_HEADERS.length -1) {
            const amount = parseFloat(row[2]);
            
            if (isNaN(amount)) continue;

            data.push({
                id: row[0],
                userId: row[1],
                amount: amount,
                currency: row[3],
                description: row[4].replace(/^"|"$/g, '').replace(/""/g, '"'),
                tag: row[5],
                timestamp: new Date(row[6]),
                dateStr: row[7],
                timeStr: row[8],
                syncStatus: row[9] === 'synced' ? 'synced' : 'pending', 
            });
        }
    }
    return data;
};


// --- MAIN APP COMPONENT ---

// Settings hook (restored after component refactor)
const useSettings = () => {
    const [exportUrl, setExportUrl] = React.useState(() => localStorage.getItem('moneytrack_export_url') || '');
    const [currency, setCurrency] = React.useState(() => localStorage.getItem('moneytrack_currency') || 'USD');

    const updateExportUrl = React.useCallback((newUrl: string) => {
        localStorage.setItem('moneytrack_export_url', newUrl);
        setExportUrl(newUrl);
    }, []);

    const updateCurrency = React.useCallback((newCurrency: string) => {
        const validatedCurrency = newCurrency.toUpperCase().substring(0, 3);
        localStorage.setItem('moneytrack_currency', validatedCurrency);
        setCurrency(validatedCurrency);
    }, []);

    return { exportUrl, currency, updateExportUrl, updateCurrency };
};

const App = () => {
    const { exportUrl, currency, updateExportUrl, updateCurrency } = useSettings();
    
    const [expenses, setExpenses] = useState<Expense[]>([]); 
    const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]); 

    const [loading, setLoading] = useState(true);
    const [db, setDb] = useState<any>(null);
    const [auth, setAuth] = useState<any>(null);
    
    const [isOnline, setIsOnline] = useState(navigator.onLine); 
    
    const [restoredData, setRestoredData] = useState<Expense[] | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const isAuthenticated = !!user;

    const [view, setView] = useState<'list' | 'add' | 'stats' | 'settings' | 'auth'>('list');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    // List view filtering and infinite scroll states
    const [visibleCount, setVisibleCount] = useState(30);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`]);
    const [filterMode, setFilterMode] = useState<'current' | 'selected' | 'custom' | 'all'>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const [form, setForm] = useState<FormState>({
        amount: '',
        description: '',
        tag: TAGS[0],
        date: new Date().toISOString().substring(0, 10),
        time: new Date().toTimeString().substring(0, 5),
    });

    const allExpenses = useMemo(() => {
        return [...expenses, ...pendingExpenses].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [expenses, pendingExpenses]);

    // Filtered expenses for list view
    const listViewExpenses = useMemo(() => {
        let filtered = [...allExpenses];

        if (filterMode === 'current') {
            // Current month only
            const now = new Date();
            filtered = filtered.filter(expense => {
                const expenseDate = expense.timestamp;
                return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
            });
        } else if (filterMode === 'selected' && selectedMonths.length > 0) {
            // Selected months
            filtered = filtered.filter(expense => {
                const expenseDate = expense.timestamp;
                const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
                return selectedMonths.includes(monthKey);
            });
        } else if (filterMode === 'custom' && customStartDate && customEndDate) {
            // Custom date range
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999); // End of day
            filtered = filtered.filter(expense => {
                const expenseDate = expense.timestamp;
                return expenseDate >= startDate && expenseDate <= endDate;
            });
        }
        // If filterMode is 'all', return all expenses

        return filtered;
    }, [allExpenses, filterMode, selectedMonths, customStartDate, customEndDate]);

    // Use refs to track the latest expenses and pendingExpenses for sync operations
    const expensesRef = React.useRef<Expense[]>(expenses);
    const pendingExpensesRef = React.useRef<Expense[]>(pendingExpenses);
    React.useEffect(() => {
        expensesRef.current = expenses;
        pendingExpensesRef.current = pendingExpenses;
    }, [expenses, pendingExpenses]);

    const syncInProgressRef = React.useRef(false);


    // --- 0. Network Listener & Local Load ---
    useEffect(() => {
        const online = () => { setIsOnline(true); console.log("App is Online"); };
        const offline = () => { setIsOnline(false); console.log("App is Offline"); };

        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        
        loadExpensesFromLocalStorage(setExpenses, setPendingExpenses); 

        return () => {
            window.removeEventListener('online', online);
            window.removeEventListener('offline', offline);
        };
    }, []);


    // --- Authentication Functions (Wrapped in useCallback for stability) ---

    const signInWithGoogle = useCallback(async () => {
        if (!auth) return;
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error("Google Sign-In Failed:", error);
            showModal("Sign-In Failed", `Could not sign in with Google. Details: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }, [auth]); // Dependency on auth is stable after initialization

    const handleSignOut = useCallback(async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setUser(null);
            setExpenses([]);
            setPendingExpenses([]);
            setRestoredData(null);
            setView('auth');
        } catch (error: any) { 
            console.error("Sign-Out Failed:", error);
        }
    }, [auth]); // Dependency on auth is stable after initialization

    // --- 1. Firebase Initialization and Authentication Listener ---
    useEffect(() => {
        const initFirebase = async () => {
            if (Object.keys(firebaseConfig).length === 0) {
                console.error("Firebase config is empty. Cannot initialize.");
                setLoading(false);
                setView('auth');
                return;
            }
            
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    setView('list');
                } else {
                    setUser(null);
                    setLoading(false);
                    // Check if we have local data, otherwise show auth screen
                    if (allExpenses.length === 0) {
                        setView('auth');
                    }
                }
            });

            return () => unsubscribe();
        };
        initFirebase();
    // This effect runs only once on mount for initialization. No dependencies needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); 

    // --- 3. Synchronization Logic (Defined with useCallback to access latest state) ---

    const syncPendingExpensesToFirebase = async (dataToSync: Expense[], userId: string) => {
        if (!db || syncInProgressRef.current) return;
        syncInProgressRef.current = true;
        setLoading(true);

        const expenseCollectionRef = collection(db, USER_EXPENSES_COLLECTION_PATH(userId));
        const syncPromises = dataToSync.map(pendingExpense => {
            // Prepare data for Firebase: remove temp ID and status, convert Date to Timestamp
            const { id, syncStatus, ...firebaseExpense } = pendingExpense;
            return addDoc(expenseCollectionRef, {
                ...firebaseExpense,
                timestamp: Timestamp.fromDate(pendingExpense.timestamp),
            });
        });

        try {
            await Promise.all(syncPromises);

            // Clear pending expenses immediately - update both state and ref synchronously
            setPendingExpenses([]);
            pendingExpensesRef.current = []; // Update ref immediately to prevent race condition

            // Save to localStorage immediately with current synced expenses and empty pending
            saveAllExpensesToLocalStorage(expensesRef.current, []);

            // showModal('Sync Success', `${dataToSync.length} expenses saved to Firebase!`, false);
        } catch (error: any) {
            console.error("Error during sync of pending data:", error);
            showModal('Sync Failed', `Failed to upload offline data: ${error.message}.`);
        } finally {
            setLoading(false);
            syncInProgressRef.current = false;
        }
    };

    // --- Auto-Sync Trigger (FIXED: Simplified dependencies to avoid infinite loop) ---
    useEffect(() => {
        // Only run if: Online AND Authenticated AND there are pending items
        // Check syncInProgressRef to prevent duplicate sync during rapid state changes
        if (isOnline && isAuthenticated && db && user && pendingExpensesRef.current.length > 0 && !syncInProgressRef.current) {
            console.log(`Auto-sync triggered: ${pendingExpensesRef.current.length} pending items.`);
            // Use ref to avoid dependency array issues and duplicate syncs
            syncPendingExpensesToFirebase(pendingExpensesRef.current, user.uid);
        }
    }, [isOnline, isAuthenticated, db, user]);

    // --- 2. Real-time Firestore Data Listener (for Synced Data) ---
    useEffect(() => {
        if (!db || !user || !isOnline) {
            setLoading(false);
            return; 
        }

        setLoading(true);
        const path = USER_EXPENSES_COLLECTION_PATH(user.uid);
        const q = query(collection(db, path));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedExpenses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: timestampToDate(doc.data().timestamp),
                syncStatus: 'synced' as 'synced',
            } as Expense));

            fetchedExpenses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setExpenses(fetchedExpenses);
            setLoading(false);

            // Update LocalStorage with the authoritative synced data and latest pending expenses
            saveAllExpensesToLocalStorage(fetchedExpenses, pendingExpensesRef.current);

        }, (error) => {
            console.error("Error fetching documents:", error);
            setLoading(false);
            if (isAuthenticated && isOnline) {
                 // Use handleSignOut inside the error callback function (passed as a stable reference)
                 showModal("Access Denied", "Could not load data. Check auth/rules.", false, () => handleSignOut());
            }
        });

        return () => unsubscribe();
    }, [db, user, isOnline, isAuthenticated, handleSignOut]); // Removed pendingExpenses from dependencies
    
    
    // --- DATA MUTATION ---

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleFormClose = () => {
        setForm({
            amount: '',
            description: '',
            tag: TAGS[0],
            date: new Date().toISOString().substring(0, 10),
            time: new Date().toTimeString().substring(0, 5),
        });
        setView('list');
    }

    // Handle Form Submission (Add Expense)
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();

        const { amount, description, tag, date, time } = form;
        const amountFloat = parseFloat(amount);
        const currentUserId = user?.uid || 'offline-user';

        if (isNaN(amountFloat) || amountFloat <= 0 || !description || !date || !time) {
            showModal("Invalid Input", "Please ensure the amount is positive and all fields are filled.");
            return;
        }

        try {
            setLoading(true);
            const dateTime = new Date(`${date}T${time}:00`);
            
            const newExpense: Expense = {
                id: isOnline ? '' : `local-${Date.now()}`,
                userId: currentUserId,
                amount: amountFloat,
                currency: currency,
                description: description,
                tag: tag,
                timestamp: dateTime,
                dateStr: date,
                timeStr: time,
                syncStatus: isOnline && isAuthenticated ? 'synced' : 'pending',
            };

            if (isOnline && isAuthenticated && db && user) {
                // ONLINE: Save to Firebase (listener handles state update)
                const { id, syncStatus, ...firebaseExpense } = newExpense;
                await addDoc(collection(db, USER_EXPENSES_COLLECTION_PATH(user.uid)), {
                    ...firebaseExpense,
                    timestamp: Timestamp.fromDate(dateTime),
                });
                // showModal("Expense Saved", "Successfully saved to the cloud.");

            } else {
                // OFFLINE: Save to local state and LocalStorage
                setPendingExpenses(prev => {
                    const newPending = [...prev, newExpense];
                    // IMPORTANT: Save against the main synced list + the new pending list
                    saveAllExpensesToLocalStorage(expenses, newPending); 
                    return newPending;
                });
                // showModal("Offline Save", "Expense saved locally. It will sync to the cloud when you're back online.");
            }
            
            // Reset form and switch view
            setForm({
                amount: '',
                description: '',
                tag: TAGS[0],
                date: new Date().toISOString().substring(0, 10),
                time: new Date().toTimeString().substring(0, 5),
            });
            setView('list');

        } catch (error: any) {
            console.error("Error adding expense:", error);
            showModal("Save Error", `Failed to save expense: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Handle Expense Deletion (Supports both synced and pending items)
    const handleDeleteExpense = async (id: string) => {
        if (!id) return;

        // 1. Local Delete (Pending Item)
        if (id.startsWith('local-')) {
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
                    showModal("Expense Deleted", "Locally pending expense removed.");
                }
            );
            return;
        }
        
        // 2. Cloud Delete (Synced Item)
        if (!db || !user) {
            showModal("Permission Denied", "Cannot delete synced item without authentication.");
            return;
        }

        showModal(
            "Confirm Cloud Deletion", 
            "Are you sure you want to permanently delete this expense from the cloud?", 
            true,
            async () => {
                try {
                    setLoading(true);
                    // Disable delete if offline, even for synced items (Firebase SDK needs connection to confirm)
                    if (!isOnline) {
                        showModal("Offline Warning", "Cannot delete a synced item while offline. Please try again when online.");
                        setLoading(false);
                        return;
                    }
                    await deleteDoc(doc(db, USER_EXPENSES_COLLECTION_PATH(user.uid), id)); 
                } catch (error: any) {
                    console.error("Error deleting expense:", error);
                    showModal("Delete Error", `Failed to delete expense: ${error.message}`);
                } finally {
                    setLoading(false);
                }
            }
        );
    };

    // --- VIEW LOGIC ---

    const { filteredExpenses, monthlyTotal } = useMemo(() => {
        const filtered = allExpenses.filter(expense => {
            const expenseDate = expense.timestamp;
            return expenseDate.getMonth() === filterMonth && expenseDate.getFullYear() === filterYear;
        });

        const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);

        return { filteredExpenses: filtered, monthlyTotal: total };
    }, [allExpenses, filterMonth, filterYear]);

    const annualTotals = useMemo<AnnualTotal[]>(() => {
        const totals: { [key: number]: AnnualTotal } = {};
        const currentYearExpenses = allExpenses.filter(e => timestampToDate(e.timestamp).getFullYear() === filterYear);

        for (let i = 0; i < 12; i++) {
            totals[i] = {
                total: 0,
                count: 0,
                monthName: new Date(filterYear, i).toLocaleString('en-US', { month: 'short' })
            };
        }

        currentYearExpenses.forEach(expense => {
            const month = timestampToDate(expense.timestamp).getMonth();
            totals[month].total += expense.amount;
            totals[month].count += 1;
        });

        return Object.values(totals);
    }, [allExpenses, filterYear]);

    const handlePrevMonth = () => {
        const newDate = new Date(filterYear, filterMonth - 1, 1);
        setFilterMonth(newDate.getMonth());
        setFilterYear(newDate.getFullYear());
    };

    const handleNextMonth = () => {
        const newDate = new Date(filterYear, filterMonth + 1, 1);
        setFilterMonth(newDate.getMonth());
        setFilterYear(newDate.getFullYear());
    };

    const currentFilterDate = new Date(filterYear, filterMonth);
    const filterDateString = currentFilterDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Generate available months from all expenses (moved outside of ListView to avoid hook issues)
    const availableMonths = useMemo(() => {
        const monthsSet = new Set<string>();
        allExpenses.forEach(expense => {
            const date = expense.timestamp;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthsSet.add(monthKey);
        });
        return Array.from(monthsSet).sort().reverse();
    }, [allExpenses]);

    const toggleMonthSelection = (monthKey: string) => {
        setSelectedMonths(prev =>
            prev.includes(monthKey)
                ? prev.filter(m => m !== monthKey)
                : [...prev, monthKey]
        );
    };

    // --- Components ---

    const ListView = () => {
        const visibleExpenses = listViewExpenses.slice(0, visibleCount);
        const hasMore = visibleCount < listViewExpenses.length;

        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
            const target = e.target as HTMLDivElement;
            const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
            if (bottom && hasMore) {
                setVisibleCount(prev => prev + 30);
            }
        };

        return (
            <div className="p-4 bg-white rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2 text-indigo-500" />
                        Transactions
                    </h2>
                    {/* Network Status Indicator */}
                    <div className={`flex items-center text-sm font-medium p-2 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isOnline ? (
                            <>
                                <Cloud className="w-4 h-4 mr-1" />
                                Online
                                {pendingExpenses.length > 0 && <span className="ml-2 font-bold">{`(${pendingExpenses.length} Pending)`}</span>}
                            </>
                        ) : (
                            <>
                                <CloudOff className="w-4 h-4 mr-1" />
                                Offline
                            </>
                        )}
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="mb-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex gap-2 flex-wrap">
                         <button
                            onClick={() => { setFilterMode('all'); setVisibleCount(30); }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
                        >
                            All Time
                        </button>
                        <button
                            onClick={() => { setFilterMode('current'); setVisibleCount(30); }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'current' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
                        >
                            Current Month
                        </button>
                        <button
                            onClick={() => { setFilterMode('selected'); setVisibleCount(30); }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'selected' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
                        >
                            Select Months
                        </button>
                        <button
                            onClick={() => { setFilterMode('custom'); setVisibleCount(30); }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filterMode === 'custom' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
                        >
                            Custom Range
                        </button>
                       
                    </div>

                    {/* Month Selection */}
                    {filterMode === 'selected' && (
                        <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600 mb-2">Select months to view:</p>
                            <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                                {availableMonths.map(monthKey => {
                                    const [year, month] = monthKey.split('-');
                                    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                                    return (
                                        <button
                                            key={monthKey}
                                            onClick={() => toggleMonthSelection(monthKey)}
                                            className={`px-2 py-1 text-xs font-medium rounded transition ${selectedMonths.includes(monthKey) ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'}`}
                                        >
                                            {monthName}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Custom Date Range */}
                    {filterMode === 'custom' && (
                        <div className="pt-2 border-t border-gray-200 grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full p-1.5 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Transaction Count */}
                <div className="mb-3 text-sm text-gray-600">
                    Showing {visibleExpenses.length} of {listViewExpenses.length} transactions
                </div>

                {loading && isAuthenticated ? (
                    <div className="text-center py-8 text-gray-500">Loading cloud expenses...</div>
                ) : listViewExpenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                        <HardDrive className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        No expenses found for the selected filter.
                    </div>
                ) : (
                    <div
                        className="space-y-3"
                        style={{maxHeight: "50vh", overflowY: "auto"}}
                        onScroll={handleScroll}
                    >
                        {visibleExpenses.map(expense => (
                            <ExpenseItem key={expense.id} showDate={true} expense={expense} onDelete={handleDeleteExpense} currency={currency} isOnline={isOnline} />
                        ))}
                        {hasMore && (
                            <div className="text-center py-4 text-sm text-gray-500">
                                Scroll for more...
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    
    
    const StatsView = () => {
        const handleMonthClick = (monthIndex: number) => {
            const monthKey = `${filterYear}-${String(monthIndex + 1).padStart(2, '0')}`;
            setSelectedMonths([monthKey]);
            setFilterMode('selected');
            setVisibleCount(30);
            setView('list');
        };

        return (
            <div className="p-4 bg-white rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-green-500" />
                    Financial Overview ({filterYear})
                </h2>

                {/* Annual Summary */}
                <div className="mb-8 border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <h3 className="text-xl font-semibold mb-3 text-gray-700">Yearly Snapshot</h3>
                    <p className="text-xs text-gray-500 mb-3">Click on any month to view transactions</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {annualTotals.map((data, index) => (
                            <button
                                key={index}
                                onClick={() => handleMonthClick(index)}
                                className="p-2 text-center bg-white rounded-lg shadow-sm border border-indigo-100 hover:shadow-md hover:border-indigo-300 transition cursor-pointer"
                            >
                                <div className="text-xs font-medium text-indigo-600">{data.monthName}</div>
                                <div className="text-sm font-bold text-gray-900">{formatAmount(data.total, currency)}</div>
                                <div className="text-xs text-gray-500">{data.count} items</div>
                            </button>
                        ))}
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                        Year Total Expense:
                        <span className="font-bold text-indigo-600 ml-1">
                            {formatAmount(annualTotals.reduce((sum, m) => sum + m.total, 0), currency)}
                        </span>
                    </p>
                </div>

                {/* Monthly Filter and Total */}
                <div className="flex justify-between items-center mb-6 p-3 bg-indigo-50 rounded-lg shadow-inner">
                    <button onClick={handlePrevMonth} className="p-2 text-indigo-700 hover:bg-indigo-200 rounded-full transition duration-150">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="lg:text-lg font-semibold text-indigo-800 flex-grow text-center">
                        {filterDateString} Total:
                        <span className="font-extrabold ml-2">{formatAmount(monthlyTotal, currency)}</span>
                    </h3>
                    <button onClick={handleNextMonth} className="p-2 text-indigo-700 hover:bg-indigo-200 rounded-full transition duration-150">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Monthly Transaction List */}
                <h3 className="text-xl font-semibold mb-3 text-gray-700">
                    Transactions in {filterDateString} ({filteredExpenses.length})
                </h3>
                {filteredExpenses.length === 0 ? (
                    <p className="text-center text-gray-500 py-6 border border-dashed rounded-lg">No expenses recorded for this month.</p>
                ) : (
                    <div className="space-y-3" style={{maxHeight: "50vh", overflowY: "auto"}}>
                        {filteredExpenses.map((expense) => (
                            <ExpenseItem key={expense.id} expense={expense} onDelete={handleDeleteExpense} showDate={true} currency={currency} isOnline={isOnline} />
                        ))}
                    </div>
                )}
            </div>
        );
    };


    const SettingsView = () => {
        return (
            <div className="p-4 bg-white rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-indigo-500" />
                    Application Settings
                </h2 >
                
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 bg-indigo-50 p-2 rounded-full font-medium">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span className="truncate max-w-[80px] sm:max-w-none text-xs">{user?.email || 'OFFLINE / ANONYMOUS'}</span>
                    </div >
                    {isAuthenticated && (
                        <button
                            onClick={handleSignOut}
                            className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition duration-150"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </button>
                    )}
                </div >

                <div className="space-y-8">
                    {/* Currency Setting */}
                    <div className="border-b pb-6 border-gray-100">
                        <h3 className="text-xl font-semibold mb-3 text-indigo-700">General Settings</h3 >
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currency">
                                Default Currency Code (e.g., USD, EUR, INR)
                            </label>
                            <input
                                type="text"
                                id="currency"
                                value={currency}
                                onChange={(e) => updateCurrency(e.target.value)}
                                maxLength={3}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 uppercase"
                                placeholder="e.g., USD, EUR, INR"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Sets the default 3-letter currency code for new expenses.
                            </p>
                        </div >
                    </div >
                    
                    {/* Sync & Export Settings */}
                    <div className="border-b pb-6 border-gray-100">
                        <h3 className="text-xl font-semibold mb-3 text-indigo-700">Cloud & Data Sync</h3 >

                        {/* Current Pending Status */}
                         {pendingExpenses.length > 0 && (
                            <div className="mt-4 p-4 bg-orange-100 border-l-4 border-orange-500 text-orange-800 rounded-lg mb-4">
                                <p className="font-semibold flex items-center mb-2">
                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                    Offline Data: {pendingExpenses.length} records pending cloud sync.
                                </p>
                                <p className="text-sm">
                                    These records will automatically sync when you are online and signed in.
                                </p>
                                {!isOnline && (
                                    <p className="text-xs mt-2 text-red-600">You must be online to trigger synchronization.</p>
                                )}
                                {isOnline && isAuthenticated && (
                                    <button
                                        onClick={() => syncPendingExpensesToFirebase(pendingExpenses, user.uid)}
                                        disabled={loading || !isOnline}
                                        className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:opacity-50 w-full"
                                    >
                                        <Cloud className="w-4 h-4 mr-2 inline" />
                                        Force Sync Now
                                    </button>
                                )}
                            </div >
                        )}

                        {/* Apps Script URL Setting */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="exportUrl">
                                Google Sheets Web App URL
                            </label>
                            <input
                                type="url"
                                id="exportUrl"
                                value={exportUrl}
                                onChange={(e) => updateExportUrl(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                placeholder="e.g., https://script.google.com/macros/s/..."
                                required
                                disabled={!isAuthenticated}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                URL for manual export to Google Sheets. Requires sign-in.
                            </p>
                            <button
                                onClick={() => showModal("Not Implemented", "The Google Sheets Export function is not implemented in this version, but the URL is saved.")}
                                className="mt-2 flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition duration-150 disabled:opacity-50 w-full"
                                disabled={!isAuthenticated || !isOnline || allExpenses.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Manual Export to Sheets
                            </button>
                        </div >
                    </div >
                    
                    {/* CSV Local Backup/Restore */}
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-indigo-700">CSV Backup & Restore</h3 >
                        <p className="text-sm text-gray-600 mb-4">
                            Use CSV files for manual local backups of ALL data (synced + pending).
                        </p>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => downloadCsv()}
                                disabled={loading || allExpenses.length === 0}
                                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 disabled:opacity-50 flex-grow justify-center"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Backup ({allExpenses.length})
                            </button>
                            <button
                                onClick={parseCsvAndRestore}
                                disabled={loading}
                                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition duration-150 disabled:opacity-50 flex-grow justify-center"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Load CSV
                            </button>
                        </div >

                        {/* Sync Stage (CSV Restore) */}
                        {restoredData && isAuthenticated && (
                            <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
                                <p className="font-semibold flex items-center mb-2">
                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                    Awaiting Sync: {restoredData.length} records loaded from CSV.
                                </p>
                                <p className="text-sm">
                                    Clicking 'Sync' will attempt to save these records to your cloud database.
                                </p>
                                <button
                                    onClick={() => syncRestoredCsvToFirebase(restoredData, user.uid)}
                                    disabled={loading}
                                    className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition duration-150 disabled:opacity-50 w-full"
                                >
                                    Sync Loaded CSV Data to Cloud
                                </button>
                            </div >
                        )}
                        {restoredData && !isAuthenticated && (
                             <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-lg">
                                 <p className="font-semibold">Sign In Required:</p>
                                 <p className="text-sm">Please sign in to save the {restoredData.length} records loaded from CSV to your private cloud storage.</p>
                             </div >
                        )}
                    </div >
                </div >
            </div >
        );
    };

    // CSV Restore Sync (Separate from pending sync for clarity)
    const syncRestoredCsvToFirebase = async (dataToSync: Expense[], userId: string) => {
        if (!db || !user) return;
        showModal(
            'Confirm CSV Import', 
            `This will attempt to upload ${dataToSync.length} records from the CSV file. IDs will be used to prevent duplicates if they match existing records.`, 
            true, 
            async () => {
                setLoading(true);
                try {
                    const expenseCollectionRef = collection(db, USER_EXPENSES_COLLECTION_PATH(userId));
                    const existingExpenseIds = new Set(expenses.map(e => e.id));
                    
                    const syncPromises = dataToSync.map(restoredExpense => {
                        const expenseToSave = {
                            userId: userId,
                            amount: restoredExpense.amount,
                            currency: restoredExpense.currency,
                            description: restoredExpense.description,
                            tag: restoredExpense.tag,
                            timestamp: Timestamp.fromDate(restoredExpense.timestamp),
                            dateStr: restoredExpense.dateStr,
                            timeStr: restoredExpense.timeStr,
                        };

                        if (restoredExpense.id && existingExpenseIds.has(restoredExpense.id)) {
                            // Update existing record
                            return setDoc(doc(expenseCollectionRef, restoredExpense.id), expenseToSave, { merge: true });
                        } else {
                            // Add new record
                            return addDoc(expenseCollectionRef, expenseToSave);
                        }
                    });
                    
                    await Promise.all(syncPromises);
                    setRestoredData(null); // Clear staging data
                    showModal('Import Complete', `${syncPromises.length} records processed and synchronized with the cloud.`);
                    
                } catch (error: any) {
                    console.error("Error during CSV import sync:", error);
                    showModal('Import Failed', `Failed to complete synchronization: ${error.message}.`);
                } finally {
                    setLoading(false);
                }
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

    // Authentication View
    const AuthView = () => (
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg text-center h-full min-h-[300px]">
          <Lock className="w-12 h-12 mb-4 text-indigo-500" />
          <h2 className="text-2xl font-bold mb-3 text-indigo-700">Secure Access Required</h2 >
          <p className="text-gray-600 mb-6">
            Please sign in with Google to enable cloud sync for your private expense data.
          </p>
          {loading ? (
            <button
              disabled
              className="flex items-center px-6 py-3 text-sm font-semibold text-white bg-gray-500 rounded-lg disabled:opacity-70"
            >
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
            </button>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition duration-150"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M44 24.896c0-1.636-.14-3.232-.408-4.792H24v9.063h11.136c-.476 2.376-1.764 4.412-3.552 5.864l7.668 5.928c4.544-4.204 7.156-10.372 7.156-17.064z" fill="#4285F4"/>
                <path d="M24 44c5.58 0 10.288-1.856 13.72-5.064l-7.668-5.928c-2.124 1.436-4.856 2.276-7.052 2.276-5.46 0-10.088-3.708-11.756-8.688H3.32l-.088 6.132c3.556 7.04 10.74 11.964 19.332 11.964z" fill="#34A853"/>
                <path d="M12.244 27.656c-.512-1.536-.796-3.176-.796-4.896s.284-3.36.796-4.896l-.048-6.056H3.32C1.652 16.036.796 19.956.796 24c0 4.044.856 7.964 2.524 11.096l8.92-6.056z" fill="#FBBC05"/>
                <path d="M24 15.312c2.964 0 5.612 1.056 7.708 2.972l6.572-6.572C33.84 5.956 29.324 4 24 4c-8.592 0-15.776 4.924-19.332 11.964l8.92 6.056C13.912 19.02 18.54 15.312 24 15.312z" fill="#EA4335"/>
              </svg>
              Sign In with Google
            </button>
          )}
        </div >
    );


    // --- Main Render ---
    
    // Show the loading screen while Firebase initializes 
    if (loading && !isAuthenticated && allExpenses.length === 0) {
        return (
            <div className="min-h-screen bg-gray-100 font-sans flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-extrabold text-indigo-700 mb-4">MoneyTrack</h1 >
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading App...</span >
                </div >
            </div >
        );
    }

    // If not authenticated and no local data, show the Sign-In view
    if (!isAuthenticated && view === 'auth' && allExpenses.length === 0) {
        return (
            <div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-6 flex flex-col items-center justify-center">
                <header className="w-full max-w-2xl mb-6 text-center">
                    <h1 className="text-4xl font-extrabold text-indigo-700">MoneyTrack</h1 >
                </header>
                <main className="w-full max-w-2xl flex-grow flex items-center justify-center">
                    {AuthView()}
                </main>
            </div >
        );
    }


    return (
        <div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-6 flex flex-col items-center w-full"> 
            <header className="w-full max-w-2xl flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                    <h1 className="text-3xl font-extrabold text-indigo-700">
                        MoneyTrack
                    </h1 >
                    <span className="text-sm text-gray-500">(v{currency})</span >
                </div >
                {isAuthenticated && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 bg-white p-2 rounded-full shadow-md">
                        <User className="w-4 h-4 text-indigo-500" />
                        <span className="truncate max-w-[80px] sm:max-w-none font-medium text-xs">
                            {user?.email ? user.email.split('@')[0] : 'UID'}
                        </span >
                    </div >
                )}
            </header>
            
            <main className="w-full max-w-2xl flex-grow mb-20 sm:mb-6">
                {/* Main Content Area */}
                <div className="mb-4">
                    {view === 'list' && ListView()}
                    {view === 'add' && (
                        <AddExpenseView
                            form={form}
                            handleFormChange={handleFormChange}
                            handleFormClose={handleFormClose}
                            handleAddExpense={handleAddExpense}
                            loading={loading}
                            isAuthenticated={isAuthenticated}
                            isOnline={isOnline}
                            setView={setView}
                            currency={currency}
                        />
                    )}
                    {view === 'stats' && StatsView()}
                    {view === 'settings' && SettingsView()}
                    {view === 'auth' && !isAuthenticated && allExpenses.length > 0 && (
                        <div className="p-4 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg">
                            <p className="font-semibold flex items-center mb-1">
                                <Lock className="w-5 h-5 mr-2" />
                                Cloud Sync Disabled
                            </p>
                            <p className="text-sm">
                                You are viewing local data. Please go to **Settings** and sign in to access cloud features and sync pending items.
                            </p>
                        </div >
                    )}
                </div >
            </main>

            {/* Navigation Bar (Fixed Bottom for Mobile Feel) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl sm:static sm:w-full sm:max-w-2xl sm:rounded-xl">
                <div className="flex justify-around py-3">
                    <button
                        onClick={() => setView('list')}
                        className={`flex flex-col items-center p-2 rounded-lg transition duration-200 ${view === 'list' ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-indigo-500'}`}
                    >
                        <DollarSign className="w-6 h-6" />
                        <span className="text-xs mt-1">Transactions</span >
                    </button>
                    
                    <button
                        onClick={() => setView('add')}
                        className="flex flex-col items-center justify-center -mt-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transform hover:scale-105 transition duration-200 ease-in-out border-4 border-white"
                    >
                        <PlusCircle className="w-8 h-8" />
                        <span className="sr-only">Add Expense</span >
                    </button>

                    <button
                        onClick={() => setView('stats')}
                        className={`flex flex-col items-center p-2 rounded-lg transition duration-200 ${view === 'stats' ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-indigo-500'}`}
                    >
                        <Calendar className="w-6 h-6" />
                        <span className="text-xs mt-1">Stats</span >
                    </button>
                    
                    <button
                        onClick={() => setView('settings')}
                        className={`flex flex-col items-center p-2 rounded-lg transition duration-200 ${view === 'settings' ? 'text-indigo-600 font-bold' : 'text-gray-500 hover:text-indigo-500'}`}
                    >
                        <Settings className="w-6 h-6" />
                        <span className="text-xs mt-1">Settings</span >
                    </button>
                </div >
            </nav>
            
        </div >
    );
};

export default App;