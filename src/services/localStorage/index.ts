/**
 * LocalStorage service for persisting expenses in the browser
 * Handles both synced and pending expenses
 */

import React from 'react';
import type { Expense } from '../../types';
import { LOCAL_STORAGE_KEY } from '../../constants';

/**
 * Loads all expenses from LocalStorage and separates them into synced and pending arrays
 * @param setExpenses - State setter for synced expenses
 * @param setPendingExpenses - State setter for pending expenses
 */
export const loadExpensesFromLocalStorage = (
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>,
  setPendingExpenses: React.Dispatch<React.SetStateAction<Expense[]>>
) => {
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

/**
 * Saves all expenses (synced + pending) to LocalStorage
 * @param synced - Array of synced expenses
 * @param pending - Array of pending expenses
 */
export const saveAllExpensesToLocalStorage = (synced: Expense[], pending: Expense[]) => {
  try {
    const dataToStore = [...synced, ...pending];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};
