/**
 * Setup for SMS auto-import via an iOS Shortcuts "Message" automation
 */

import React, { useState } from 'react';
import { MessageSquare, Copy, Check } from 'lucide-react';
import { showModal } from '../../utils';

interface SmsInboxSettingsProps {
  isAuthenticated: boolean;
  isOnline: boolean;
  inboxUrl: string | null;
  pendingCount: number;
  onEnable: () => Promise<void>;
  onDisable: () => Promise<void>;
}

export const SmsInboxSettings: React.FC<SmsInboxSettingsProps> = ({ isAuthenticated, isOnline, inboxUrl, pendingCount, onEnable, onDisable }) => {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      showModal('SMS Import', `Could not update SMS import: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async () => {
    if (!inboxUrl) return;
    try {
      await navigator.clipboard.writeText(inboxUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showModal('Copy Failed', 'Long-press the URL to select and copy it.');
    }
  };

  return (
    <div className="border-b pb-6 border-gray-100">
      <h3 className="text-xl font-semibold mb-1 text-indigo-700 flex items-center gap-2"><MessageSquare className="w-5 h-5" /> SMS Auto-Import</h3>
      <p className="text-xs text-gray-500 mb-3">
        An iPhone Shortcuts automation sends each bank SMS here. You review them before anything is added.
      </p>

      {!isAuthenticated ? (
        <p className="text-sm text-gray-600">Sign in to use SMS auto-import.</p>
      ) : !inboxUrl ? (
        <button onClick={() => run(onEnable)} disabled={busy || !isOnline} className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          Turn On SMS Import
        </button>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sms-url">Your private import URL</label>
            <div className="flex gap-2">
              <input id="sms-url" readOnly value={inboxUrl} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 p-2 text-xs font-mono border border-gray-300 rounded-lg bg-gray-50" />
              <button onClick={copyUrl} className="px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center gap-1">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-1">Keep it private. Anyone with it can add messages to your review queue (never straight into your expenses).</p>
          </div>

          <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
            <li>Open <b>Shortcuts</b> → <b>Automation</b> → <b>+</b> → <b>Message</b>.</li>
            <li>Set <b>Message Contains</b> to <code>debited</code>. Choose <b>Run Immediately</b> and turn off <b>Notify When Run</b>.</li>
            <li>Add the action <b>Get Contents of URL</b> and paste the URL above.</li>
            <li>Tap <b>Show More</b>: Method <b>POST</b>, Request Body <b>JSON</b>, add a Text field named <code>text</code> with the value <b>Shortcut Input</b> (Message).</li>
            <li>Repeat with <code>spent</code> if your card alerts say "spent".</li>
          </ol>
          <p className="text-xs text-gray-500">Menu names can differ slightly between iOS versions.</p>

          <p className="text-sm text-gray-600">Waiting for review: <b>{pendingCount}</b></p>

          <div className="flex gap-2">
            <button
              onClick={() => showModal('New Import URL', 'The current URL stops working and messages waiting for review are discarded. You must paste the new URL into your Shortcut.', true, () => run(onEnable))}
              disabled={busy || !isOnline}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              New URL
            </button>
            <button
              onClick={() => showModal('Turn Off SMS Import', 'The URL stops working and messages waiting for review are discarded.', true, () => run(onDisable))}
              disabled={busy || !isOnline}
              className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
            >
              Turn Off
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
