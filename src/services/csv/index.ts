/**
 * CSV conversion utilities for backup and restore functionality
 * Handles proper escaping and date parsing
 */

import type { Expense } from '../../types';
import { CSV_HEADERS } from '../../constants/csv.ts';

/** Quotes a text field; doubled quotes escape quotes inside it */
const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;

/**
 * Splits CSV text into rows of fields (RFC 4180).
 * Quoted fields may hold commas, doubled quotes and line breaks.
 */
const parseCsvRows = (csv: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

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
    quote(e.description),
    quote(e.tag),
    e.timestamp.toISOString(),
    e.dateStr,
    e.timeStr,
    e.syncStatus,
    e.type || 'debit',
    quote(e.tripId || ''),
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
  const lines = parseCsvRows(csv.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].map(h => h.trim());
  // Allow old CSV format without amountINR/amountUSD
  const hasBaseAmounts = headers.includes('amountINR') && headers.includes('amountUSD');
  // Columns added later; older backups simply don't have them
  const typeIndex = headers.indexOf('type');
  const tripIdIndex = headers.indexOf('tripId');

  const data: Expense[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];

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
        description: row[descriptionIndex],
        tag: row[tagIndex],
        timestamp: new Date(row[timestampIndex]),
        dateStr: row[dateStrIndex],
        timeStr: row[timeStrIndex],
        syncStatus: row[syncStatusIndex] === 'synced' ? 'synced' : 'pending',
        ...(typeIndex >= 0 && row[typeIndex]?.trim() === 'credit' ? { type: 'credit' as const } : {}),
        ...(tripIdIndex >= 0 && row[tripIdIndex]?.trim() ? { tripId: row[tripIdIndex].trim() } : {}),
      });
    }
  }
  return data;
};
