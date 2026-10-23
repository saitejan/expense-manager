// Assertions for the pure helpers. Run: node --experimental-strip-types scripts/selfcheck.ts
import assert from 'node:assert/strict';
import { parseQuickEntry, suggestTagFromHistory, getFavorites } from '../src/utils/quickAdd.ts';
import { getDueMonths, dueDay, MAX_CATCH_UP_MONTHS } from '../src/utils/recurring.ts';
import { pushIdTime, findPossibleDuplicate } from '../src/utils/transactions.ts';
import { findTripIdForDate } from '../src/utils/trips.ts';
import type { Expense } from '../src/types/index.ts';

// Quick entry
assert.deepEqual(parseQuickEntry('450 swiggy'), { amount: '450', description: 'swiggy' });
assert.deepEqual(parseQuickEntry('swiggy 450'), { amount: '450', description: 'swiggy' });
assert.deepEqual(parseQuickEntry('₹1,200 rent'), { amount: '1200', description: 'rent' });
assert.deepEqual(parseQuickEntry('Uber Rs. 320.50'), { amount: '320.50', description: 'Uber' });
assert.deepEqual(parseQuickEntry('  99  '), { amount: '99', description: '' });
assert.deepEqual(parseQuickEntry('milk'), { amount: '', description: 'milk' });
assert.deepEqual(parseQuickEntry('rspca 20'), { amount: '20', description: 'rspca' });

const at = (iso: string, description: string, tag: string, amount = 100, type?: 'credit'): Expense => ({
  id: iso + description, userId: 'u', amount, currency: 'INR', amountINR: amount, amountUSD: amount / 88,
  description, tag, timestamp: new Date(iso), dateStr: iso.slice(0, 10), timeStr: '10:00', syncStatus: 'synced', type,
});
const history = [
  at('2026-10-20T10:00:00', 'Swiggy dinner', 'Food', 450),
  at('2026-10-19T10:00:00', 'Milk', 'Baby', 60),
  at('2026-10-10T10:00:00', 'Milk', 'Food', 55),
  at('2026-10-05T10:00:00', 'Salary', 'Other', 90000, 'credit'),
  at('2026-10-04T10:00:00', 'Salary', 'Other', 90000, 'credit'),
];
assert.equal(suggestTagFromHistory('milk', history), 'Baby'); // newest exact match wins
assert.equal(suggestTagFromHistory('swiggy', history), 'Food'); // first-word match
assert.equal(suggestTagFromHistory('petrol', history), undefined);
const favorites = getFavorites(history, new Date('2026-10-23T12:00:00'));
assert.deepEqual(favorites.map(f => [f.description, f.tag, f.amount]), [['Milk', 'Baby', 60]]); // income and one-offs excluded

// Recurring
const rule = { startMonth: '2026-08', dayOfMonth: 31, active: true };
assert.equal(dueDay('2026-02', 31), 28);
assert.equal(dueDay('2028-02', 31), 29);
assert.equal(dueDay('2026-04', 31), 30);
assert.deepEqual(getDueMonths(rule, new Date(2026, 9, 23)), ['2026-08', '2026-09']); // Oct 31 not reached yet
assert.deepEqual(getDueMonths(rule, new Date(2026, 9, 31)), ['2026-08', '2026-09', '2026-10']);
assert.deepEqual(getDueMonths({ ...rule, dayOfMonth: 1, lastGenerated: '2026-10' }, new Date(2026, 9, 23)), []);
assert.deepEqual(getDueMonths({ ...rule, dayOfMonth: 1, lastGenerated: '2026-11', startMonth: '2026-11' }, new Date(2026, 10, 1)), []);
assert.deepEqual(getDueMonths({ startMonth: '2026-12', dayOfMonth: 5, active: true }, new Date(2027, 0, 5)), ['2026-12', '2027-01']); // year rollover
assert.deepEqual(getDueMonths({ ...rule, active: false }, new Date(2026, 9, 31)), []);
const longGap = getDueMonths({ startMonth: '2020-01', dayOfMonth: 1, active: true }, new Date(2026, 9, 23));
assert.equal(longGap.length, MAX_CATCH_UP_MONTHS);
assert.equal(longGap.at(-1), '2026-10');

// SMS push id time: a known id generated at 1700000000000 ms
const encode = (ms: number) => {
  const chars = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < 8; i++) { out = chars[ms % 64] + out; ms = Math.floor(ms / 64); }
  return out;
};
assert.equal(pushIdTime(encode(1700000000000) + 'abcdefghijkl'), 1700000000000);

// Duplicates
const ts = new Date('2026-10-20T20:00:00').getTime();
assert.equal(findPossibleDuplicate(450.4, ts, history)?.description, 'Swiggy dinner');
assert.equal(findPossibleDuplicate(450, ts + 3 * 24 * 3600 * 1000, history), undefined);
assert.equal(findPossibleDuplicate(451, ts, history), undefined);

// Trips
const trips = { goa: { name: 'Goa', startDate: '2026-12-10', endDate: '2026-12-15', currency: 'INR' } };
assert.equal(findTripIdForDate(trips, '2026-12-15'), 'goa');
assert.equal(findTripIdForDate(trips, '2026-12-16'), '');

console.log('selfcheck ok');
