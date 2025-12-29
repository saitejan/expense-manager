/**
 * Gmail Permission Dialog
 * Explains Gmail access requirements and privacy assurances
 */

import React from 'react';
import { Mail, Shield, Lock, X } from 'lucide-react';

interface GmailPermissionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onGrantPermission: () => void;
    isLoading?: boolean;
}

export const GmailPermissionDialog: React.FC<GmailPermissionDialogProps> = ({
    isOpen,
    onClose,
    onGrantPermission,
    isLoading = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Mail className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Connect Gmail</h2>
                        <p className="text-sm text-gray-500">Auto-track your expenses</p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4 mb-6">
                    <p className="text-gray-700">
                        ExpenseManager needs permission to read your Gmail to automatically track transactions from bank and payment app emails.
                    </p>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <Shield className="text-green-600 mt-1 flex-shrink-0" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-900">Privacy First</h3>
                                <p className="text-sm text-gray-600">
                                    All email processing happens in your browser. No emails are sent to any server.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Lock className="text-green-600 mt-1 flex-shrink-0" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-900">Read-Only Access</h3>
                                <p className="text-sm text-gray-600">
                                    We only request read-only permission. We cannot send, delete, or modify your emails.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Mail className="text-blue-600 mt-1 flex-shrink-0" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-900">Transaction Emails Only</h3>
                                <p className="text-sm text-gray-600">
                                    We only read emails containing transaction notifications from banks and payment apps.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> You'll see a Google consent screen asking for Gmail read permission. This is a standard OAuth flow.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onGrantPermission}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Connecting...' : 'Grant Permission'}
                    </button>
                </div>
            </div>
        </div>
    );
};
