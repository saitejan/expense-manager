/**
 * Donation component with UPI QR code and direct payment link
 */

import React, { useState } from 'react';
import { Heart, QrCode } from 'lucide-react';
import { DonationModal } from './DonationModal';

interface DonationSectionProps {
    upiId?: string;
    upiName?: string;
}

export const DonationSection: React.FC<DonationSectionProps> = () => {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className="border-b pb-6 border-gray-100">
                <h3 className="text-xl font-semibold mb-3 text-pink-700 flex items-center">
                    <Heart className="w-5 h-5 mr-2 fill-pink-500" />
                    Support Development
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    If you find this app useful, consider supporting its development with a small donation.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Show Donation Modal Button */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-md hover:from-pink-600 hover:to-purple-700 transition duration-150 flex-grow"
                    >
                        <QrCode className="w-4 h-4 mr-2" />
                        Donate Now
                    </button>
                </div>

                <p className="text-xs text-gray-500 mt-3 text-center">
                    💝 Your support helps keep this app free and ad-free!
                </p>
            </div>

            {/* Shared Donation Modal */}
            <DonationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                showPromptMessage={false}
            />
        </>
    );
};

