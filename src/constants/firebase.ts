/**
 * Firebase database paths and configuration
 */

export const USER_EXPENSES_PATH = (uid: string) => `users/${uid}/expenses`;
export const USER_PREFERENCES_PATH = (uid: string) => `users/${uid}/preferences`;
