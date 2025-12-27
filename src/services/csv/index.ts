/**
 * CSV conversion utilities for backup and restore functionality
 * Handles proper escaping and date parsing
 */

import type { Expense } from '../../types';
import { CSV_HEADERS } from '../../constants';

/**
 * Converts an array of expenses to CSV format
 * Handles proper escaping of quotes in descriptions
 * @param data - Array of expenses to convert
 * @returns CSV string with headers and data rows
 */
export const convertToCsv = (data: Expense[]): string => {
  const headers = CSV_HEADERS.join(',') + '\n';
  const rows = data.map(e => [
    e.id || '',
    e.userId,
    e.amount.toString(),
    e.currency,
    e.amountINR?.toString() || '0',
    e.amountUSD?.toString() || '0',
    `"${e.description.replace(/"/g, '""')}"`,
    e.tag,
    e.timestamp.toISOString(),
    e.dateStr,
    e.timeStr,
    e.syncStatus,
  ].join(',')).join('\n');

  return headers + rows;
};

/**
 * Parses CSV string back to an array of Expense objects
 * Validates headers and generates IDs for records without them
 * @param csv - CSV string to parse
 * @returns Array of Expense objects
 * @throws Error if CSV format is invalid
 */
export const parseCsv = (csv: string): Expense[] => {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  // Allow old CSV format without amountINR/amountUSD
  const hasBaseAmounts = headers.includes('amountINR') && headers.includes('amountUSD');

  const data: Expense[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

    if (row.length >= 9) {
      const amount = parseFloat(row[2]);

      if (isNaN(amount)) continue;

      // Generate ID if empty or whitespace
      const csvId = row[0]?.trim();
      const id = csvId && csvId.length > 0 ? csvId : `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Parse base amounts if available, otherwise set to 0 (will be migrated)
      const amountINR = hasBaseAmounts ? parseFloat(row[4]) || 0 : 0;
      const amountUSD = hasBaseAmounts ? parseFloat(row[5]) || 0 : 0;
      const descriptionIndex = hasBaseAmounts ? 6 : 4;
      const tagIndex = hasBaseAmounts ? 7 : 5;
      const timestampIndex = hasBaseAmounts ? 8 : 6;
      const dateStrIndex = hasBaseAmounts ? 9 : 7;
      const timeStrIndex = hasBaseAmounts ? 10 : 8;
      const syncStatusIndex = hasBaseAmounts ? 11 : 9;

      data.push({
        id: id,
        userId: row[1],
        amount: amount,
        currency: row[3],
        amountINR,
        amountUSD,
        description: row[descriptionIndex].replace(/^"|"$/g, '').replace(/""/g, '"'),
        tag: row[tagIndex],
        timestamp: new Date(row[timestampIndex]),
        dateStr: row[dateStrIndex],
        timeStr: row[timeStrIndex],
        syncStatus: row[syncStatusIndex] === 'synced' ? 'synced' : 'pending',
      });
    }
  }
  return data;
};
