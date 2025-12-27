/**
 * Core TypeScript interfaces and types for the Expense Manager application
 */

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: string;
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
}

export interface AnnualTotal {
  total: number;
  count: number;
  monthName: string;
}

export type ViewType = 'list' | 'add' | 'stats' | 'settings' | 'auth';

export type FilterMode = 'current' | 'selected' | 'custom' | 'all';
