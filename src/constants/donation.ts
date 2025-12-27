/**
 * Donation configuration constants
 */

export const DONATION_CONFIG = {
    // Replace these with your actual UPI details
    UPI_ID: 'sai-expense-tracker@ybl', // e.g., 'yourname@paytm', 'yourname@ybl', etc.
    UPI_NAME: 'Kolluru Sai Teja', // Name registered with UPI

    // Optional: Add a custom message
    MESSAGE: 'Support ExpenseManager Development'
};

/**
 * Donation prompt configuration
 * Controls when the donation prompt appears
 */
export const DONATION_PROMPT_CONFIG = {
    // Show prompt every X days
    INTERVAL_DAYS: 40,

    // Show prompt after X transactions
    TRANSACTION_COUNT: 40,

    // Minimum suggested donation amount (in INR)
    MIN_AMOUNT: 10,

    // Exclusion threshold - users who donate this amount or more can be excluded
    EXCLUSION_THRESHOLD: 1000
};
