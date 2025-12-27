/**
 * Shared donation modal component
 * Used by both DonationSection (Settings) and DonationPrompt (periodic)
 */

import React, { useState } from 'react';
import { Heart, X, QrCode, Smartphone, Copy, Check } from 'lucide-react';
import upiQrCode from '../../assets/upi_qr.png';
import { DONATION_CONFIG, DONATION_PROMPT_CONFIG } from '../../constants/donation';

interface DonationModalProps {
    isOpen: boolean;
    onClose: () => void;
    showPromptMessage?: boolean; // Show "Enjoying the App?" message
}

export const DonationModal: React.FC<DonationModalProps> = ({
    isOpen,
    onClose,
    showPromptMessage = false
}) => {
    const [showQrCode, setShowQrCode] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateUpiUrl = () => {
        const params = new URLSearchParams({
            pa: DONATION_CONFIG.UPI_ID,
            pn: DONATION_CONFIG.UPI_NAME,
            cu: 'INR',
            am: DONATION_PROMPT_CONFIG.MIN_AMOUNT.toString()
        });
        return `upi://pay?${params.toString()}`;
    };

    const handleUpiPayment = () => {
        window.location.href = generateUpiUrl();
        onClose();
    };

    const handleCopyUpiId = async () => {
        try {
            await navigator.clipboard.writeText(DONATION_CONFIG.UPI_ID);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy UPI ID:', error);
        }
    };

    const handleClose = () => {
        setShowQrCode(false);
        setCopied(false);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-slideUp">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                    aria-label="Close"
                >
                    <X className="w-6 h-6" />
                </button>

                {!showQrCode ? (
                    // Initial View
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                            <div className="bg-gradient-to-br from-pink-100 to-purple-100 p-4 rounded-full">
                                <Heart className="w-12 h-12 text-pink-500 fill-pink-500" />
                            </div>
                        </div>

                        {showPromptMessage ? (
                            <>
                                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                                    Enjoying the App?
                                </h3>

                                <p className="text-gray-600 mb-2">
                                    If you find <span className="font-semibold text-indigo-600">ExpenseManager</span> useful,
                                    please consider supporting its development!
                                </p>

                                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 my-4 border border-pink-200">
                                    <p className="text-sm text-gray-700 mb-2">
                                        💝 Your support helps keep this app:
                                    </p>
                                    <ul className="text-sm text-gray-600 space-y-1 text-left">
                                        <li>✅ Free forever</li>
                                        <li>✅ Ad-free</li>
                                        <li>✅ Continuously improved</li>
                                    </ul>
                                </div>

                                <p className="text-lg font-semibold text-pink-600 mb-4">
                                    Donate as low as ₹{DONATION_PROMPT_CONFIG.MIN_AMOUNT}
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                                    Support Development
                                </h3>

                                <p className="text-gray-600 mb-4">
                                    Your donations help keep ExpenseManager free, ad-free, and continuously improved!
                                </p>

                                <p className="text-lg font-semibold text-pink-600 mb-4">
                                    Donate as low as ₹{DONATION_PROMPT_CONFIG.MIN_AMOUNT}
                                </p>
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowQrCode(true)}
                                className="flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 transition duration-150"
                            >
                                <QrCode className="w-5 h-5 mr-2" />
                                Show QR Code
                            </button>

                            <button
                                onClick={handleUpiPayment}
                                className="flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg shadow-md hover:from-indigo-600 hover:to-blue-700 transition duration-150"
                            >
                                <Smartphone className="w-5 h-5 mr-2" />
                                Pay via UPI App
                            </button>

                            {showPromptMessage && (
                                <button
                                    onClick={handleClose}
                                    className="text-sm text-gray-500 hover:text-gray-700 transition py-2"
                                >
                                    Maybe later
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    // QR Code View
                    <div className="text-center">
                        <button
                            onClick={() => setShowQrCode(false)}
                            className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition"
                            aria-label="Back"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="flex items-center justify-center mb-4">
                            <Heart className="w-8 h-8 text-pink-500 fill-pink-500 mr-2" />
                            <h3 className="text-2xl font-bold text-gray-800">Support Us</h3>
                        </div>

                        <p className="text-sm text-gray-600 mb-6">
                            Scan with any UPI app to donate
                        </p>

                        {/* QR Code */}
                        <div className="bg-white p-4 rounded-xl border-4 border-indigo-100 inline-block mb-6">
                            <img
                                src={upiQrCode}
                                alt="UPI QR Code"
                                className="w-64 h-64 object-contain"
                            />
                        </div>

                        {/* UPI ID */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                                    <p className="text-sm font-mono font-semibold text-gray-800 break-all">
                                        {DONATION_CONFIG.UPI_ID}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCopyUpiId}
                                    className="ml-3 p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                                    title="Copy UPI ID"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Suggested Amount */}
                        <div className="bg-pink-50 rounded-lg p-3 mb-4 border border-pink-200">
                            <p className="text-sm text-pink-700">
                                💝 Suggested: <span className="font-bold">₹{DONATION_PROMPT_CONFIG.MIN_AMOUNT} or more</span>
                            </p>
                        </div>

                        <button
                            onClick={handleUpiPayment}
                            className="w-full flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg shadow-md hover:from-indigo-600 hover:to-blue-700 transition duration-150 mb-3"
                        >
                            <Smartphone className="w-5 h-5 mr-2" />
                            Open UPI App
                        </button>

                        <p className="text-xs text-gray-500">
                            Thank you for your support! ❤️
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};
