/**
 * Expense tags and their visual styling
 */

export const TAGS = [
  'Shopping',
  'Food',
  'Travel',
  'Hospital',
  'Wife',
  'Baby',
  'Me',
  'Bills',
  'Other'
] as const;

/**
 * Color mapping for expense tags
 * Used across ExpenseItem and filter components
 */
export const TAG_COLORS: Record<string, string> = {
  'Shopping': 'bg-pink-100 text-pink-700 border-pink-300',
  'Food': 'bg-green-100 text-green-700 border-green-300',
  'Travel': 'bg-blue-100 text-blue-700 border-blue-300',
  'Hospital': 'bg-red-100 text-red-700 border-red-300',
  'Wife': 'bg-purple-100 text-purple-700 border-purple-300',
  'Baby': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Me': 'bg-indigo-100 text-indigo-700 border-indigo-300',
  'Bills': 'bg-cyan-100 text-cyan-700 border-cyan-300',
  'Other': 'bg-gray-100 text-gray-700 border-gray-300',
};

export const DEFAULT_TAG_COLOR = 'bg-gray-100 text-gray-700 border-gray-300';
