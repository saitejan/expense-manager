/**
 * Gmail Sync Section Component
 * Main UI for Gmail auto-tracking settings
 */

import React, { useState } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle, Clock, Settings as SettingsIcon, ChevronDown, ChevronRight } from 'lucide-react';
import type { SyncStatus } from '../../hooks/useGmailSync';

interface GmailSyncSectionProps {
    isAuthenticated: boolean;
    isGmailConnected: boolean;
    userEmail: string | null | undefined;
    syncStatus: SyncStatus;
    syncError: string | null;
    lastSyncTimestamp: number | null;
    isEnabled: boolean;
    autoSyncFrequency: 'manual' | 'daily' | 'weekly';
    syncDateRange: number;
    transactionTypeFilter: 'debit' | 'credit' | 'both';
    onSyncWithGmail: () => void;
    onSync: () => void;
    onDisconnect: () => void;
    onToggleEnabled: (enabled: boolean) => void;
    onUpdateFrequency: (frequency: 'manual' | 'daily' | 'weekly') => void;
    onUpdateDateRange: (days: number) => void;
    onUpdateTypeFilter: (filter: 'debit' | 'credit' | 'both') => void;
}

export const GmailSyncSection: React.FC<GmailSyncSectionProps> = ({
    isAuthenticated,
    isGmailConnected,
    userEmail,
    syncStatus,
    syncError,
    lastSyncTimestamp,
    isEnabled,
    autoSyncFrequency,
    syncDateRange,
    transactionTypeFilter,
    onSyncWithGmail,
    onSync,
    onDisconnect,
    onToggleEnabled,
    onUpdateFrequency,
    onUpdateDateRange,
    onUpdateTypeFilter,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatLastSync = (timestamp: number | null) => {
        if (!timestamp) return 'Never';

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header - Always visible and clickable */}
            <div
                className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mail className="text-blue-600" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Gmail Auto-Tracking</h3>
                        <p className="text-sm text-gray-500">Automatically import expenses from transaction emails</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Enable/Disable Toggle - Independent of expand/collapse */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => onToggleEnabled(e.target.checked)}
                                disabled={!isAuthenticated}
                                className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {/* Expand/Collapse Icon */}
                    {isExpanded ? (
                        <ChevronDown className="text-gray-400" size={20} />
                    ) : (
                        <ChevronRight className="text-gray-400" size={20} />
                    )}
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="p-6 pt-0 border-t border-gray-100 mt-2">

                    {/* Connection Status */}
                    {!isGmailConnected ? (
                        <div className="mb-6">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-700 mb-3">
                                    Connect your Gmail account to automatically track expenses from bank and payment app emails.
                                </p>
                                <button
                                    onClick={onSyncWithGmail}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Mail size={18} />
                                    Sync with Gmail
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Connected Account */}
                            <div className="mb-6">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="text-green-600" size={18} />
                                            <div className="flex flex-col">
                                                <p className="text-sm font-medium text-green-900">Connected</p>
                                                <p className="text-xs text-green-700">{userEmail}</p>
                                                <button
                                                    onClick={onDisconnect}
                                                    className="text-[10px] text-red-600 hover:text-red-800 underline uppercase font-bold mt-1 text-left"
                                                >
                                                    Disconnect Gmail
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-xs text-green-600 italic">
                                            Using Firebase Auth
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sync Status */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock size={16} />
                                        <span>Last sync: {formatLastSync(lastSyncTimestamp)}</span>
                                    </div>
                                    <button
                                        onClick={onSync}
                                        disabled={syncStatus === 'syncing' || !isEnabled}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                                        {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
                                    </button>
                                </div>

                                {/* Sync Error */}
                                {syncError && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2 mb-2">
                                            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                                            <p className="text-sm text-red-700">{syncError}</p>
                                        </div>
                                        {syncError.includes('Authentication expired') && (
                                            <button
                                                onClick={onSyncWithGmail}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                            >
                                                <RefreshCw size={12} />
                                                Reconnect to Gmail
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Sync Success */}
                                {syncStatus === 'success' && !syncError && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                                        <p className="text-sm text-green-700">Sync completed successfully</p>
                                    </div>
                                )}
                            </div>

                            {/* Settings */}
                            {isEnabled && (
                                <div className="space-y-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-center gap-2 mb-3">
                                        <SettingsIcon size={16} className="text-gray-600" />
                                        <h4 className="font-medium text-gray-900">Sync Settings</h4>
                                    </div>

                                    {/* Auto-sync Frequency */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Auto-sync Frequency
                                        </label>
                                        <select
                                            value={autoSyncFrequency}
                                            onChange={(e) => onUpdateFrequency(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="manual">Manual only</option>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                        </select>
                                    </div>

                                    {/* Date Range */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Sync Date Range
                                        </label>
                                        <select
                                            value={syncDateRange}
                                            onChange={(e) => onUpdateDateRange(Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value={7}>Last 7 days</option>
                                            <option value={30}>Last 30 days</option>
                                            <option value={90}>Last 90 days</option>
                                            <option value={180}>Last 180 days</option>
                                            <option value={365}>Last 1 year</option>
                                        </select>
                                    </div>

                                    {/* Transaction Type Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Transaction Type
                                        </label>
                                        <select
                                            value={transactionTypeFilter}
                                            onChange={(e) => onUpdateTypeFilter(e.target.value as any)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="both">Both Debit & Credit</option>
                                            <option value="debit">Debit Only</option>
                                            <option value="credit">Credit Only</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
