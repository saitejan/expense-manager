/**
 * SMS inbox fed by an iOS Shortcuts automation.
 * The Shortcut POSTs {"text": "..."} to smsInbox/{token}.json without signing in. The token is a
 * write-only capability: rules only accept writes for registered tokens, and only the owner can read
 * or delete. A leaked token can spam the review queue, never the expense list.
 */

import { ref, onValue, off, update, type Database } from 'firebase/database';
import { SMS_INBOX_PATH, SMS_INBOX_TOKENS_PATH, USER_PREFERENCES_PATH } from '../../constants';
import { pushIdTime } from '../../utils/transactions';

export interface SmsMessage {
  id: string;
  text: string;
  receivedAt: number;
}

/** 24 random bytes as base64url: 32 chars, all valid in Firebase keys */
export const generateSmsInboxToken = (): string =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export const subscribeToSmsInbox = (
  db: Database,
  token: string,
  onData: (messages: SmsMessage[]) => void,
  onError: (error: Error) => void
): (() => void) => {
  const inboxRef = ref(db, SMS_INBOX_PATH(token));
  onValue(
    inboxRef,
    (snapshot) => {
      const data: Record<string, { text: string }> | null = snapshot.val();
      const messages = Object.entries(data || {}).map(([id, message]) => ({ id, text: message.text, receivedAt: pushIdTime(id) }));
      onData(messages.sort((a, b) => b.receivedAt - a.receivedAt));
    },
    onError
  );
  return () => off(inboxRef);
};

/**
 * Switches the user's inbox token in one atomic write: retires the old token and its messages
 * (each message is deleted individually, as rules only allow deletes per message) and registers the new one.
 * @param newToken - null turns the inbox off
 */
export const replaceSmsInboxToken = async (
  db: Database,
  userId: string,
  oldToken: string | null,
  oldMessageIds: string[],
  newToken: string | null
): Promise<void> => {
  const updates: Record<string, string | null> = {};
  if (oldToken) {
    for (const id of oldMessageIds) updates[`${SMS_INBOX_PATH(oldToken)}/${id}`] = null;
    updates[`${SMS_INBOX_TOKENS_PATH}/${oldToken}`] = null;
  }
  if (newToken) updates[`${SMS_INBOX_TOKENS_PATH}/${newToken}`] = userId;
  updates[`${USER_PREFERENCES_PATH(userId)}/smsInboxToken`] = newToken;
  await update(ref(db), updates);
};

export const deleteSmsMessages = async (db: Database, token: string, ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  await update(ref(db, SMS_INBOX_PATH(token)), Object.fromEntries(ids.map(id => [id, null])));
};
