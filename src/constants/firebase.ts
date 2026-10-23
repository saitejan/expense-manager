/**
 * Firebase database paths and configuration
 */

export const USER_EXPENSES_PATH = (uid: string) => `users/${uid}/expenses`;
export const USER_PREFERENCES_PATH = (uid: string) => `users/${uid}/preferences`;
export const USER_PATH = (uid: string) => `users/${uid}`;
export const USER_RECEIPTS_PATH = (uid: string) => `users/${uid}/receipts`;
export const USER_RECURRING_PATH = (uid: string) => `users/${uid}/recurring`;
export const SMS_INBOX_PATH = (token: string) => `smsInbox/${token}`;
export const SMS_INBOX_TOKENS_PATH = 'smsInboxTokens';
