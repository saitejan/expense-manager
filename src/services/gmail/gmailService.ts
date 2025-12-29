/**
 * Gmail API service
 * Fetches and processes emails from Gmail
 */


export interface GmailMessage {
    id: string;
    subject: string;
    body: string;
    date: number;
}

/**
 * Helper to get the Google access token from local storage
 */
const getAccessToken = () => localStorage.getItem('google_access_token');

/**
 * Helper to clean and decode email text
 */
const cleanEmailText = (text: string): string => {
    return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Helper to decode base64url string
 */
const decodeBase64 = (data: string) => {
    return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
};

/**
 * Helper to extract and clean body from message payload parts
 */
const getBodyFromParts = (parts: any[]): string => {
    let textBody = '';
    let htmlBody = '';

    for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
            textBody = decodeBase64(part.body.data);
        } else if (part.mimeType === 'text/html' && part.body?.data) {
            htmlBody = decodeBase64(part.body.data);
        } else if (part.parts) {
            const nested = getBodyFromParts(part.parts);
            if (nested) return nested;
        }
    }

    if (textBody) return textBody;
    if (htmlBody) {
        return cleanEmailText(htmlBody);
    }
    return '';
};

/**
 * Fetch emails from Gmail within a date range
 * @param daysBack - Number of days to look back
 * @param maxResults - Maximum number of emails to fetch
 * @returns Array of Gmail messages
 */
export const fetchGmailMessages = async (
    daysBack: number = 30,
    maxResults: number = 500
): Promise<GmailMessage[]> => {
    try {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Google access token not found. Please sign in again.');
        }

        // Calculate date range
        const afterDate = new Date();
        afterDate.setDate(afterDate.getDate() - daysBack);
        const afterTimestamp = Math.floor(afterDate.getTime() / 1000);

        // Build query for transaction-related emails - as broad as possible
        const query = encodeURIComponent(`after:${afterTimestamp} (debited OR credited OR transaction OR payment OR Pluxee OR "Sodexo" OR INR OR Rs OR ₹ OR "Google Pay" OR PhonePe OR Paytm OR UPI OR Karnataka OR onehelpdesk)`);

        // List messages
        const listResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!listResponse.ok) {
            const errorData = await listResponse.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || listResponse.statusText;

            if (listResponse.status === 401) {
                throw new Error('Authentication expired. Please sign in again.');
            }
            throw new Error(`Gmail API error: ${errorMessage}`);
        }

        const listData = await listResponse.json();
        const messages = listData.messages || [];

        // Fetch full message details
        const fullMessages: GmailMessage[] = [];

        for (const message of messages) {
            try {
                const messageResponse = await fetch(
                    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=full`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );

                if (!messageResponse.ok) continue;

                const fullMessage = await messageResponse.json();
                const headers = fullMessage.payload.headers;
                const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
                const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';

                // Extract body
                let body = '';
                const payload = fullMessage.payload;

                if (fullMessage.snippet) {
                    body = cleanEmailText(fullMessage.snippet);
                } else if (payload.body?.data) {
                    body = cleanEmailText(decodeBase64(payload.body.data));
                } else if (payload.parts) {
                    body = getBodyFromParts(payload.parts);
                }

                // Parse date
                const date = dateHeader ? new Date(dateHeader).getTime() : Date.now();

                fullMessages.push({
                    id: message.id,
                    subject,
                    body,
                    date,
                });
            } catch (error) {
                console.error(`Error fetching message ${message.id}:`, error);
            }
        }

        return fullMessages;
    } catch (error) {
        console.error('Error fetching Gmail messages:', error);
        throw error;
    }
};

/**
 * Fetch a single email by ID
 * @param messageId - Gmail message ID
 * @returns Gmail message or null
 */
export const fetchGmailMessageById = async (messageId: string): Promise<GmailMessage | null> => {
    try {
        const token = getAccessToken();
        if (!token) {
            throw new Error('Google access token not found');
        }

        const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) return null;

        const fullMessage = await response.json();
        const headers = fullMessage.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';

        // Extract body
        let body = '';
        const payload = fullMessage.payload;

        if (payload.body?.data) {
            body = decodeBase64(payload.body.data);
        } else if (payload.parts) {
            body = getBodyFromParts(payload.parts);
        }

        const date = dateHeader ? new Date(dateHeader).getTime() : Date.now();

        return {
            id: messageId,
            subject,
            body,
            date,
        };
    } catch (error) {
        console.error(`Error fetching message ${messageId}:`, error);
        return null;
    }
};
