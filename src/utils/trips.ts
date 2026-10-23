/**
 * Trip helpers. A trip is a named date range; expenses join it through `tripId`.
 */

import type { Trip } from '../types';

/** Id of the first trip whose date range covers `date` (YYYY-MM-DD), or '' */
export const findTripIdForDate = (trips: Record<string, Trip>, date: string): string =>
  Object.entries(trips).find(([, trip]) => trip.startDate <= date && date <= trip.endDate)?.[0] ?? '';
