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
}

export interface FormState {
  amount: string;
  description: string;
  tag: string;
  date: string;
  time: string;
  currency: string;
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
}

export interface ExchangeRates {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
}

export type ViewType = 'list' | 'add' | 'stats' | 'settings' | 'auth';

export type FilterMode = 'current' | 'selected' | 'custom' | 'all';
