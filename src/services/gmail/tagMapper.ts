/**
 * Auto-tag mapper for transactions
 * Maps merchant names and descriptions to expense tags
 */


interface TagRule {
    tag: string;
    keywords: string[];
}

const TAG_RULES: TagRule[] = [
    {
        tag: 'Food',
        keywords: [
            'swiggy', 'zomato', 'uber eats', 'dominos', 'pizza', 'restaurant',
            'cafe', 'coffee', 'starbucks', 'mcdonald', 'kfc', 'burger',
            'food', 'dining', 'meal', 'breakfast', 'lunch', 'dinner',
            'blinkit', 'zepto', 'bigbasket', 'instamart', 'haldiram', 'bbpulse'
        ],
    },
    {
        tag: 'Shopping',
        keywords: [
            'amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall',
            'store', 'retail', 'fashion', 'clothing', 'shoes', 'electronics',
            'appliances', 'furniture', 'decor', 'supermarket', 'grocery',
            'nykaa', 'meesho', 'jiomart', 'dmart', 'reliance digital', 'croma'
        ],
    },
    {
        tag: 'Travel',
        keywords: [
            'uber', 'ola', 'rapido', 'flight', 'airline', 'indigo', 'spicejet',
            'hotel', 'booking', 'makemytrip', 'goibibo', 'cleartrip', 'travel',
            'train', 'irctc', 'bus', 'redbus', 'taxi', 'cab', 'transport',
            'metro', 'petrol', 'fuel', 'shell', 'bpcl', 'hpcl', 'iocl', 'fastag'
        ],
    },
    {
        tag: 'Hospital',
        keywords: [
            'hospital', 'clinic', 'doctor', 'medical', 'pharmacy', 'medicine',
            'health', 'apollo', 'fortis', 'max healthcare', 'medplus',
            'diagnostic', 'lab', 'test', 'consultation', 'pharmeasy', '1mg'
        ],
    },
    {
        tag: 'Bills',
        keywords: [
            'electricity', 'water', 'gas', 'internet', 'broadband', 'mobile',
            'recharge', 'bill', 'utility', 'rent', 'maintenance', 'insurance',
            'emi', 'loan', 'credit card', 'payment', 'jio', 'airtel', 'vi', 'bsnl',
            'act fiber', 'tata sky', 'dish tv', 'bescom', 'kseb', 'hdfc ergo', 'lic',
            'upi', 'imps', 'txn', 'transfer', '@ybl', '@okaxis', '@okhdfc', '@okicici'
        ],
    },
];

/**
 * Suggest a tag based on merchant name or description
 * @param text - Merchant name or transaction description
 * @returns Suggested tag or 'Other' as default
 */
export const suggestTag = (text: string): string => {
    if (!text) return 'Other';

    const lowerText = text.toLowerCase();

    // Find matching tag rule
    for (const rule of TAG_RULES) {
        if (rule.keywords.some(keyword => lowerText.includes(keyword))) {
            return rule.tag;
        }
    }

    return 'Other';
};

/**
 * Get confidence score for tag suggestion (0-1)
 * @param text - Merchant name or transaction description
 * @param suggestedTag - The suggested tag
 * @returns Confidence score
 */
export const getTagConfidence = (text: string, suggestedTag: string): number => {
    if (!text || suggestedTag === 'Other') return 0.3;

    const lowerText = text.toLowerCase();
    const rule = TAG_RULES.find(r => r.tag === suggestedTag);

    if (!rule) return 0.3;

    // Count matching keywords
    const matchCount = rule.keywords.filter(keyword =>
        lowerText.includes(keyword)
    ).length;

    // Higher confidence with more matches
    return Math.min(0.5 + (matchCount * 0.2), 1.0);
};
