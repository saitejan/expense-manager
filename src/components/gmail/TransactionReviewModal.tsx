/**
 * Transaction Review Modal
 * Displays parsed transactions for user review before importing
 */

import React from 'react';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import type { ParsedTransaction } from '../../types/gmail';

interface TransactionReviewModalProps {
    isOpen: boolean;
    transactions: ParsedTransaction[];
    onClose: () => void;
    onImport: (selectedTransactions: ParsedTransaction[]) => void;
    onUpdateTransaction: (index: number, updates: Partial<ParsedTransaction>) => void;
    availableTags: string[];
    /** SMS messages are removed from the inbox once reviewed, selected or not */
    mode: 'gmail' | 'sms';
}

export const TransactionReviewModal: React.FC<TransactionReviewModalProps> = ({
    isOpen,
    transactions,
    onClose,
    onImport,
    onUpdateTransaction,
    availableTags,
    mode,
}) => {
    if (!isOpen) return null;

    const selectedCount = transactions.filter(t => t.selected).length;
    const hasInvalidSelection = transactions.some(t => t.selected && !(t.amount > 0 && t.description.trim()));

    const handleToggleSelect = (index: number) => {
        onUpdateTransaction(index, { selected: !transactions[index].selected });
    };

    const handleSelectAll = () => {
        const allSelected = transactions.every(t => t.selected);
        transactions.forEach((_, index) => {
            onUpdateTransaction(index, { selected: !allSelected });
        });
    };

    const handleImport = () => {
        const selected = transactions.filter(t => t.selected);
        onImport(selected);
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Review Transactions</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found • {selectedCount} selected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No new transactions found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((transaction, index) => (
                                <div
                                    key={transaction.emailId}
                                    className={`border rounded-lg p-4 transition-all ${transaction.selected
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={transaction.selected || false}
                                            onChange={() => handleToggleSelect(index)}
                                            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <input
                                                    type="text"
                                                    value={transaction.description}
                                                    onChange={(e) => onUpdateTransaction(index, { description: e.target.value })}
                                                    aria-label="Description"
                                                    className="flex-1 min-w-0 px-2 py-1.5 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg"
                                                />
                                                <div className="flex gap-2">
                                                    <div className={`flex items-center gap-1 px-2 border rounded-lg bg-white ${transaction.transactionType === 'credit' ? 'border-green-300' : 'border-gray-300'}`}>
                                                        <span className={`text-sm font-bold ${transaction.transactionType === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                                            {transaction.transactionType === 'credit' ? '+' : '-'}{transaction.currency}
                                                        </span>
                                                        <input
                                                            type="number"
                                                            inputMode="decimal"
                                                            min="0"
                                                            step="0.01"
                                                            value={transaction.amount || ''}
                                                            onChange={(e) => onUpdateTransaction(index, { amount: parseFloat(e.target.value) || 0 })}
                                                            aria-label="Amount"
                                                            placeholder="Amount"
                                                            className="w-24 py-1.5 text-sm font-bold bg-transparent outline-none"
                                                        />
                                                    </div>
                                                    <select
                                                        value={transaction.suggestedTag}
                                                        onChange={(e) => onUpdateTransaction(index, { suggestedTag: e.target.value })}
                                                        aria-label="Tag"
                                                        className="px-2 py-1.5 text-sm bg-white border border-gray-300 rounded-lg"
                                                    >
                                                        {[...new Set([transaction.suggestedTag, ...availableTags])].map(tag => (
                                                            <option key={tag} value={tag}>{tag}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    <span>{formatDate(transaction.timestamp)}</span>
                                                </div>
                                                {transaction.transactionType === 'credit' && (
                                                    <span className="text-green-700 font-medium">Imports as income</span>
                                                )}
                                            </div>

                                            {transaction.duplicateOf && (
                                                <p className="mt-2 text-xs font-medium text-amber-700 flex items-center gap-1">
                                                    <AlertTriangle size={14} /> Possible duplicate of {transaction.duplicateOf}
                                                </p>
                                            )}

                                            {/* Source text */}
                                            <p className={`text-xs text-gray-400 mt-2 ${mode === 'sms' ? 'line-clamp-3' : 'truncate'}`}>
                                                {mode === 'sms' ? 'SMS' : 'From'}: {transaction.rawEmailSubject}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                    <div>
                        <button
                            onClick={handleSelectAll}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            {transactions.every(t => t.selected) ? 'Deselect All' : 'Select All'}
                        </button>
                        {mode === 'sms' && (
                            <p className="text-xs text-gray-500 mt-1">Unselected messages are discarded.</p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={hasInvalidSelection || (selectedCount === 0 && mode === 'gmail')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {selectedCount === 0 ? 'Discard All' : `Import ${selectedCount} Transaction${selectedCount !== 1 ? 's' : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
