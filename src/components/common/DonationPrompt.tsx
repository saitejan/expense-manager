/**
 * Donation prompt that appears periodically
 * Shows after configured days or transactions (whichever comes first)
 */

import { useState, useEffect } from 'react';
import { DonationModal } from './DonationModal';
import { DONATION_PROMPT_CONFIG } from '../../constants/donation';

interface DonationPromptProps {
    userId: string | null;
    isAuthenticated: boolean;
    totalTransactions: number;
    db: any;
}

const STORAGE_KEY = 'donation_prompt_data';

interface PromptData {
    lastShownDate: string;
    lastTransactionCount: number;
    totalDismissals: number;
}

export const DonationPrompt: React.FC<DonationPromptProps> = ({
    userId,
    isAuthenticated,
    totalTransactions,
    db
}) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isExcluded, setIsExcluded] = useState(false);

    // Check if user is in exclusion list (Firebase)
    useEffect(() => {
        const checkExclusionList = async () => {
            if (!db || !userId || !isAuthenticated) {
                setIsExcluded(false);
                return;
            }

            try {
                const { ref, get } = await import('firebase/database');
                const excludeRef = ref(db, `donationExclusions/${userId}`);
                const snapshot = await get(excludeRef);

                if (snapshot.exists()) {
                    setIsExcluded(true);
                    console.log('User is excluded from donation prompts');
                } else {
                    setIsExcluded(false);
                }
            } catch (error) {
                console.error('Error checking exclusion list:', error);
                setIsExcluded(false);
            }
        };

        checkExclusionList();
    }, [db, userId, isAuthenticated]);

    // Check if prompt should be shown
    useEffect(() => {
        if (isExcluded) {
            return; // Don't show if user is excluded
        }

        const checkShouldShowPrompt = () => {
            try {
                const storedData = localStorage.getItem(STORAGE_KEY);
                const now = new Date();

                if (!storedData) {
                    // First time - show after initial transactions
                    if (totalTransactions >= DONATION_PROMPT_CONFIG.TRANSACTION_COUNT) {
                        setShowPrompt(true);
                    }
                    return;
                }

                const data: PromptData = JSON.parse(storedData);
                const lastShownDate = new Date(data.lastShownDate);
                const daysSinceLastShown = Math.floor(
                    (now.getTime() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                const transactionsSinceLastShown = totalTransactions - data.lastTransactionCount;

                // Show if configured days passed OR configured new transactions
                if (
                    daysSinceLastShown >= DONATION_PROMPT_CONFIG.INTERVAL_DAYS ||
                    transactionsSinceLastShown >= DONATION_PROMPT_CONFIG.TRANSACTION_COUNT
                ) {
                    setShowPrompt(true);
                }
            } catch (error) {
                console.error('Error checking donation prompt:', error);
            }
        };

        checkShouldShowPrompt();
    }, [totalTransactions, isExcluded]);

    const handleDismiss = () => {
        // Save dismissal data
        const data: PromptData = {
            lastShownDate: new Date().toISOString(),
            lastTransactionCount: totalTransactions,
            totalDismissals: 1
        };

        try {
            const storedData = localStorage.getItem(STORAGE_KEY);
            if (storedData) {
                const existing: PromptData = JSON.parse(storedData);
                data.totalDismissals = (existing.totalDismissals || 0) + 1;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving prompt data:', error);
        }

        setShowPrompt(false);
    };

    return (
        <DonationModal
            isOpen={showPrompt && !isExcluded}
            onClose={handleDismiss}
            showPromptMessage={true}
        />
    );
};
