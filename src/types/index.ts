/**
 * Core TypeScript interfaces and types for the Expense Manager application
 */

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  amountINR: number;
  amountUSD: number;
  description: string;
  tag: string;
  timestamp: Date;
  dateStr: string;
  timeStr: string;
  syncStatus: 'synced' | 'pending';
  metadata?: Record<string, any>;
  /** 'credit' marks income. Absent means a normal expense. */
  type?: TransactionType;
  tripId?: string;
  /** Photo stored separately at users/{uid}/receipts/{id}, loaded on demand */
  hasReceipt?: boolean;
}

export type TransactionType = 'debit' | 'credit';

export interface FormState {
  amount: string;
  description: string;
  tag: string;
  date: string;
  time: string;
  currency: string;
  type: TransactionType;
  /** '' when the expense is not part of a trip */
  tripId: string;
}

export interface AnnualTotal {
  total: number;
  count: number;
  monthName: string;
}

export interface UserPreferences {
  currency: string;
  exportUrl: string;
  statsCurrency?: string;
  gmailSync?: {
    enabled: boolean;
    autoSyncFrequency: 'manual' | 'daily' | 'weekly';
    lastSyncTimestamp: number | null;
    syncDateRange: number;
    transactionTypeFilter: 'debit' | 'credit' | 'both';
    ignoredEmailIds: string[];
  };
  budgets?: Budgets;
  trips?: Record<string, Trip>;
  /** Secret capability token for the iOS Shortcuts SMS inbox */
  smsInboxToken?: string;
}

/** Monthly budgets. Amounts are in `currency`. */
export interface Budgets {
  currency: string;
  total?: number;
  /** Array, not a map: custom tags may contain characters Firebase forbids in keys */
  tags?: { tag: string; amount: number }[];
}

export interface Trip {
  name: string;
  /** YYYY-MM-DD, inclusive */
  startDate: string;
  endDate: string;
  currency: string;
  budget?: number;
}

/** Monthly recurring expense rule at users/{uid}/recurring/{id} */
export interface RecurringRule {
  id: string;
  description: string;
  amount: number;
  currency: string;
  tag: string;
  /** 1-31, clamped to the month length */
  dayOfMonth: number;
  /** YYYY-MM, first month to generate */
  startMonth: string;
  /** YYYY-MM, last month already generated */
  lastGenerated?: string;
  active: boolean;
  createdAt: number;
}

export interface ExchangeRates {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
}

export type ViewType = 'list' | 'add' | 'stats' | 'settings' | 'auth';

export type FilterMode = 'current' | 'selected' | 'custom' | 'all';
