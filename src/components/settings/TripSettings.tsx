/**
 * Trips: named date ranges. Expenses added during a trip default to it.
 */

import React, { useState } from 'react';
import { Plane, Trash2 } from 'lucide-react';
import type { Trip } from '../../types';
import { POPULAR_CURRENCIES } from '../../constants';
import { formatAmount, showModal } from '../../utils';

interface TripSettingsProps {
  trips: Record<string, Trip>;
  currency: string;
  onSave: (trips: Record<string, Trip>) => void;
}

export const TripSettings: React.FC<TripSettingsProps> = ({ trips, currency, onSave }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [tripCurrency, setTripCurrency] = useState(currency);
  const [budget, setBudget] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate || endDate < startDate) {
      showModal('Invalid Trip', 'Enter a name and an end date on or after the start date.');
      return;
    }
    const budgetValue = parseFloat(budget);
    const trip: Trip = {
      name: name.trim(),
      startDate,
      endDate,
      currency: tripCurrency,
      ...(budgetValue > 0 ? { budget: budgetValue } : {}),
    };
    onSave({ ...trips, [`t${Date.now().toString(36)}`]: trip });
    setName('');
    setStartDate('');
    setEndDate('');
    setBudget('');
  };

  const handleDelete = (id: string) => {
    showModal('Delete Trip', `Delete "${trips[id].name}"? Its expenses stay; they just lose the trip label.`, true, () => {
      const rest = { ...trips };
      delete rest[id];
      onSave(rest);
    });
  };

  const sorted = Object.entries(trips).sort(([, a], [, b]) => b.startDate.localeCompare(a.startDate));
  const inputClass = 'w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm';

  return (
    <div className="border-b pb-6 border-gray-100">
      <h3 className="text-xl font-semibold mb-1 text-indigo-700 flex items-center gap-2"><Plane className="w-5 h-5" /> Trips</h3>
      <p className="text-xs text-gray-500 mb-3">New expenses dated within a trip join it by default (you can change it on the form). Totals show in Stats.</p>

      {sorted.length > 0 && (
        <ul className="space-y-2 mb-4">
          {sorted.map(([id, trip]) => (
            <li key={id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{trip.name}</p>
                <p className="text-xs text-gray-500">
                  {trip.startDate} → {trip.endDate} · {trip.budget ? `budget ${formatAmount(trip.budget, trip.currency)}` : trip.currency}
                </p>
              </div>
              <button onClick={() => handleDelete(id)} className="p-1 text-red-400 hover:text-red-600" aria-label={`Delete ${trip.name}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="space-y-3 p-3 bg-gray-50 rounded-lg">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip name, e.g. Goa Dec" maxLength={60} className={inputClass} aria-label="Trip name" />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-gray-600">Start<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputClass} mt-1`} /></label>
          <label className="text-xs text-gray-600">End<input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} className={`${inputClass} mt-1`} /></label>
          <select value={tripCurrency} onChange={(e) => setTripCurrency(e.target.value)} className={inputClass} aria-label="Trip currency">
            {POPULAR_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
          <input type="number" inputMode="decimal" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget (optional)" className={inputClass} aria-label="Trip budget" />
        </div>
        <button type="submit" className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
          Add Trip
        </button>
      </form>
    </div>
  );
};
