/**
 * SMS inbox fed by an iOS Shortcuts automation (see services/firebase/smsInbox.ts)
 */

import { useState, useEffect, useCallback } from 'react';
import type { Database } from 'firebase/database';
import type { Expense } from '../types';
import type { ParsedTransaction } from '../types/gmail';
import {
  subscribeToSmsInbox,
  replaceSmsInboxToken,
  deleteSmsMessages,
  generateSmsInboxToken,
  type SmsMessage,
} from '../services/firebase/smsInbox';
import { parseTransactionEmail } from '../services/gmail/emailParser';
import { guessTag } from '../services/gmail/tagMapper';
import { parseQuickEntry } from '../utils/quickAdd';
import { getFirebaseConfig } from '../config/firebase';
import { SMS_INBOX_PATH } from '../constants';

interface UseSmsInboxParams {
  db: Database | null;
  user: { uid: string } | null;
  token: string | null;
  /** For tag guesses from history; sorted newest first */
  expenses: Expense[];
}

/**
 * Bank SMS first; otherwise a quick entry like "450 swiggy" (Siri / typed Shortcut).
 * Anything without an amount still shows up, for the user to fill in or discard.
 */
const toReviewTransaction = (message: SmsMessage, expenses: Expense[]): ParsedTransaction => {
  const parsed = parseTransactionEmail({ id: message.id, subject: message.text, body: message.text, date: message.receivedAt });
  const quick = parsed ? null : parseQuickEntry(message.text);
  const amount = parsed?.amount ?? (parseFloat(quick?.amount || '') || 0);
  const description = parsed?.description ?? (quick?.description || message.text.slice(0, 50));
  return {
    emailId: message.id,
    amount,
    currency: parsed?.currency ?? 'INR',
    description,
    suggestedTag: guessTag(description, expenses) ?? parsed?.suggestedTag ?? 'Other',
    transactionType: parsed?.transactionType ?? 'debit',
    timestamp: message.receivedAt,
    merchantName: parsed?.merchantName,
    rawEmailSubject: message.text,
    selected: amount > 0,
    source: 'sms',
  };
};

export const useSmsInbox = ({ db, user, token, expenses }: UseSmsInboxParams) => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);

  useEffect(() => {
    if (!db || !user || !token) return;
    const unsubscribe = subscribeToSmsInbox(db, token, setMessages, (error) => console.error('Error loading SMS inbox:', error));
    // Clear on sign-out or token change so stale messages never show
    return () => { unsubscribe(); setMessages([]); };
  }, [db, user, token]);

  /** Creates a token, or rotates the current one (its pending messages are discarded) */
  const enableInbox = useCallback(async () => {
    if (!db || !user) return;
    await replaceSmsInboxToken(db, user.uid, token, messages.map(m => m.id), generateSmsInboxToken());
  }, [db, user, token, messages]);

  const disableInbox = useCallback(async () => {
    if (!db || !user || !token) return;
    await replaceSmsInboxToken(db, user.uid, token, messages.map(m => m.id), null);
  }, [db, user, token, messages]);

  const deleteMessages = useCallback(async (ids: string[]) => {
    if (!db || !token) return;
    await deleteSmsMessages(db, token, ids);
  }, [db, token]);

  const buildReviewTransactions = useCallback(
    () => messages.map(message => toReviewTransaction(message, expenses)),
    [messages, expenses]
  );

  const inboxUrl = token ? `${getFirebaseConfig().databaseURL}/${SMS_INBOX_PATH(token)}.json` : null;

  return { messages, inboxUrl, enableInbox, disableInbox, deleteMessages, buildReviewTransactions };
};
