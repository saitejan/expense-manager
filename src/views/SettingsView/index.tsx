/**
 * Settings view for managing currency, sync, backups, and account
 */

import React from 'react';
import { Settings as SettingsIcon, User, LogOut, Cloud, Download, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import type { Expense, ViewType } from '../../types';
import { showModal } from '../../utils';
import { saveAllExpensesToLocalStorage } from '../../services/localStorage';
import { DonationSection } from '../../components/common/DonationSection';
import { DONATION_CONFIG } from '../../constants/donation';

interface SettingsViewProps {
  user: any;
  isAuthenticated: boolean;
  handleSignOut: () => void;
  currency: string;
  updateCurrency: (value: string) => void;
  pendingExpenses: Expense[];
  expenses: Expense[];
  syncPendingExpensesToFirebase: (pendingExpenses: Expense[], userId: string) => Promise<void>;
  isOnline: boolean;
  loading: boolean;
  exportUrl: string;
  updateExportUrl: (value: string) => void;
  allExpenses: Expense[];
  downloadCsv: () => void;
  parseCsvAndRestore: () => void;
  restoredData: Expense[] | null;
  syncRestoredCsvToFirebase: (data: Expense[], userId: string) => void;
  setRestoredData: React.Dispatch<React.SetStateAction<Expense[] | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPendingExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  setView: React.Dispatch<React.SetStateAction<ViewType>>;
  handleDeleteAllData: () => void;
  exportToGoogleSheets: () => Promise<void>;
}

/**
 * Application settings panel
 * Manages currency, sync options, CSV backup/restore, and data deletion
 */
export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  isAuthenticated,
  handleSignOut,
  currency,
  updateCurrency,
  pendingExpenses,
  expenses,
  syncPendingExpensesToFirebase,
  isOnline,
  loading,
  exportUrl,
  updateExportUrl,
  allExpenses,
  downloadCsv,
  parseCsvAndRestore,
  restoredData,
  syncRestoredCsvToFirebase,
  setRestoredData,
  setLoading,
  setPendingExpenses,
  setView,
  handleDeleteAllData,
  exportToGoogleSheets,
}) => {
  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
        <SettingsIcon className="w-5 h-5 mr-2 text-indigo-500" />
        Application Settings
      </h2>

      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 text-sm text-gray-600 bg-indigo-50 p-2 rounded-full font-medium">
          <User className="w-4 h-4 text-indigo-500" />
          <span className="truncate max-w-[80px] sm:max-w-none text-xs">{user?.email || 'OFFLINE / ANONYMOUS'}</span>
        </div>
        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition duration-150"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        )}
      </div>

      <div className="space-y-8">
        {/* Currency Setting */}
        <div className="border-b pb-6 border-gray-100">
          <h3 className="text-xl font-semibold mb-3 text-indigo-700">General Settings</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="currency">
              Preferred Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => updateCurrency(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
              required
            >
              <option value="INR">INR - ₹ Indian Rupee</option>
              <option value="USD">USD - $ US Dollar</option>
              <option value="EUR">EUR - € Euro</option>
              <option value="GBP">GBP - £ British Pound</option>
              <option value="JPY">JPY - ¥ Japanese Yen</option>
              <option value="CNY">CNY - ¥ Chinese Yuan</option>
              <option value="AUD">AUD - A$ Australian Dollar</option>
              <option value="CAD">CAD - C$ Canadian Dollar</option>
              <option value="CHF">CHF - Fr Swiss Franc</option>
              <option value="SGD">SGD - S$ Singapore Dollar</option>
              <option value="AED">AED - د.إ UAE Dirham</option>
              <option value="SAR">SAR - ﷼ Saudi Riyal</option>
              <option value="KRW">KRW - ₩ South Korean Won</option>
              <option value="BRL">BRL - R$ Brazilian Real</option>
              <option value="MXN">MXN - Mex$ Mexican Peso</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Sets the default currency for new expenses. You can select a different currency for each expense.
            </p>
          </div>
        </div>

        {/* Donation Section */}
        <DonationSection
          upiId={DONATION_CONFIG.UPI_ID}
          upiName={DONATION_CONFIG.UPI_NAME}
        />

        {/* Sync & Export Settings */}
        <div className="border-b pb-6 border-gray-100">
          <h3 className="text-xl font-semibold mb-3 text-indigo-700">Cloud & Data Sync</h3>

          {/* Current Pending Status */}
          {pendingExpenses.length > 0 && (
            <div className="mt-4 p-4 bg-orange-100 border-l-4 border-orange-500 text-orange-800 rounded-lg mb-4">
              <p className="font-semibold flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Offline Data: {pendingExpenses.length} records pending cloud sync.
              </p>
              <p className="text-sm">
                These records will automatically sync when you are online and signed in.
              </p>
              {!isOnline && (
                <p className="text-xs mt-2 text-red-600">You must be online to trigger synchronization.</p>
              )}
              {isOnline && isAuthenticated && (
                <button
                  onClick={() => syncPendingExpensesToFirebase(pendingExpenses, user.uid)}
                  disabled={loading || !isOnline}
                  className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:opacity-50 w-full"
                >
                  <Cloud className="w-4 h-4 mr-2 inline" />
                  Force Sync Now
                </button>
              )}
            </div>
          )}

          {/* Apps Script URL Setting */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="exportUrl">
              Google Sheets Web App URL
            </label>
            <input
              type="url"
              id="exportUrl"
              value={exportUrl}
              onChange={(e) => updateExportUrl(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
              placeholder="e.g., https://script.google.com/macros/s/..."
              required
              disabled={!isAuthenticated}
            />
            <p className="text-xs text-gray-500 mt-1">
              URL for manual export to Google Sheets. Requires sign-in and deployed Apps Script.
            </p>
            <button
              onClick={exportToGoogleSheets}
              className="mt-2 flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition duration-150 disabled:opacity-50 w-full justify-center"
              disabled={!isAuthenticated || !isOnline || allExpenses.length === 0 || !exportUrl || loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Google Sheets ({allExpenses.length})
            </button>
            {(!exportUrl || exportUrl.trim() === '') && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Please set the Web App URL above first
              </p>
            )}
          </div>
        </div>

        {/* CSV Local Backup/Restore */}
        <div>
          <h3 className="text-xl font-semibold mb-3 text-indigo-700">CSV Backup & Restore</h3>
          <p className="text-sm text-gray-600 mb-4">
            Use CSV files for manual local backups of ALL data (synced + pending).
          </p>

          <div className="flex space-x-4">
            <button
              onClick={() => downloadCsv()}
              disabled={loading || allExpenses.length === 0}
              className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 disabled:opacity-50 flex-grow justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Backup ({allExpenses.length})
            </button>
            <button
              onClick={parseCsvAndRestore}
              disabled={loading}
              className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition duration-150 disabled:opacity-50 flex-grow justify-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Load CSV
            </button>
          </div>

          {/* Sync Stage (CSV Restore) */}
          {restoredData && isAuthenticated && (
            <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
              <p className="font-semibold flex items-center mb-2">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Awaiting Sync: {restoredData.length} records loaded from CSV.
              </p>
              <p className="text-sm">
                Clicking 'Sync' will attempt to save these records to your cloud database.
              </p>
              <button
                onClick={() => syncRestoredCsvToFirebase(restoredData, user.uid)}
                disabled={loading}
                className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition duration-150 disabled:opacity-50 w-full"
              >
                Sync Loaded CSV Data to Cloud
              </button>
            </div>
          )}
          {restoredData && !isAuthenticated && (
            <div className="mt-6 p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded-lg">
              <p className="font-semibold">Import Options:</p>
              <p className="text-sm mb-3">You are not signed in. Choose how to import these {restoredData.length} records:</p>
              <button
                onClick={() => {
                  showModal(
                    'Confirm Local Import',
                    `This will import ${restoredData.length} records to your local storage. They will be saved to your browser and can be synced to the cloud later if you sign in.`,
                    true,
                    () => {
                      setLoading(true);
                      try {
                        // Mark all records as pending so they can be synced later
                        const importedExpenses = restoredData.map((exp, idx) => {
                          const csvId = exp.id?.trim();
                          return {
                            ...exp,
                            id: csvId && csvId.length > 0 ? csvId : `imported-${Date.now()}-${idx}`,
                            syncStatus: 'pending' as const
                          };
                        });

                        setPendingExpenses(prev => {
                          const combined = [...prev, ...importedExpenses];
                          saveAllExpensesToLocalStorage(expenses, combined);
                          return combined;
                        });

                        setRestoredData(null);
                        showModal('Import Complete', `${restoredData.length} records imported to local storage. They will sync to cloud when you sign in.`);
                        setView('list');
                      } catch (error: any) {
                        console.error("Error during local import:", error);
                        showModal('Import Failed', `Failed to import records: ${error.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }
                  );
                }}
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 disabled:opacity-50"
              >
                Import to Local Storage
              </button>
              <p className="text-xs text-blue-700 mt-2">
                Or sign in to sync directly to the cloud.
              </p>
            </div>
          )}
        </div>

        {/* Danger Zone - Delete All Data */}
        <div className="mt-8 border-t-4 border-red-200 pt-6">
          <h3 className="text-xl font-semibold mb-3 text-red-700 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Danger Zone
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Permanently delete all your expense data. This action cannot be undone.
          </p>

          <button
            onClick={handleDeleteAllData}
            disabled={loading || allExpenses.length === 0}
            className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition duration-150 disabled:opacity-50 w-full justify-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Data ({allExpenses.length} records)
          </button>
          {allExpenses.length === 0 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              No data to delete
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
