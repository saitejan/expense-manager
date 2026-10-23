/**
 * SMS inbox fed by an iOS Shortcuts automation (see services/firebase/smsInbox.ts)
 */

import { useState, useEffect, useCallback } from 'react';
import type { Database } from 'firebase/database';
import type { ParsedTransaction } from '../types/gmail';
import {
  subscribeToSmsInbox,
  replaceSmsInboxToken,
  deleteSmsMessages,
  generateSmsInboxToken,
  type SmsMessage,
} from '../services/firebase/smsInbox';
import { parseTransactionEmail } from '../services/gmail/emailParser';
import { getFirebaseConfig } from '../config/firebase';
import { SMS_INBOX_PATH } from '../constants';

interface UseSmsInboxParams {
  db: Database | null;
  user: { uid: string } | null;
  token: string | null;
}

/** Unparsable messages still show up, with an empty amount for the user to fill or discard */
const toReviewTransaction = (message: SmsMessage): ParsedTransaction => {
  const parsed = parseTransactionEmail({ id: message.id, subject: message.text, body: message.text, date: message.receivedAt });
  return {
    emailId: message.id,
    amount: parsed?.amount ?? 0,
    currency: parsed?.currency ?? 'INR',
    description: parsed?.description ?? message.text.slice(0, 50),
    suggestedTag: parsed?.suggestedTag ?? 'Other',
    transactionType: parsed?.transactionType ?? 'debit',
    timestamp: message.receivedAt,
    merchantName: parsed?.merchantName,
    rawEmailSubject: message.text,
    selected: !!parsed,
    source: 'sms',
  };
};

export const useSmsInbox = ({ db, user, token }: UseSmsInboxParams) => {
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

  const buildReviewTransactions = useCallback(() => messages.map(toReviewTransaction), [messages]);

  const inboxUrl = token ? `${getFirebaseConfig().databaseURL}/${SMS_INBOX_PATH(token)}.json` : null;

  return { messages, inboxUrl, enableInbox, disableInbox, deleteMessages, buildReviewTransactions };
};
