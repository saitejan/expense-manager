/**
 * Google Apps Script for Money Track - Expense Manager
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to https://script.google.com/
 * 2. Create a new project
 * 3. Copy and paste this entire code
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone" (required for cross-origin requests)
 * 8. Click "Deploy"
 * 9. Copy the Web App URL and paste it in your Money Track app settings
 *
 * SPREADSHEET SETUP:
 * - The script will create a new sheet named "Expenses" if it doesn't exist
 * - Or you can specify a different sheet name in the SHEET_NAME variable below
 */

// Configuration
const SHEET_NAME = 'Expenses_app'; // Change this to your preferred sheet name
const SPREADSHEET_ID = null; // Optional: Set a specific spreadsheet ID, or leave null to use the bound spreadsheet

/**
 * Handle POST requests from the Money Track app
 */
function doPost(e) {
    try {
        // Parse the incoming JSON data
        const data = JSON.parse(e.postData.contents);

        // Check the action type
        if (data.action === 'export') {
            // Export expenses to Google Sheet
            const result = exportExpenses(data.expenses);
            return ContentService.createTextOutput(JSON.stringify(result))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // Unknown action
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: 'Unknown action: ' + data.action
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        Logger.log('Error in doPost: ' + error.toString());
        return ContentService.createTextOutput(JSON.stringify({
            success: false,
            message: 'Error: ' + error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Export expenses to Google Sheet
 * @param {Array} expenses - Array of expense objects
 * @return {Object} Result object with success status and message
 */
function exportExpenses(expenses) {
    try {
        // Get or create the spreadsheet and sheet
        const sheet = getOrCreateSheet();

        // Ensure headers exist
        ensureHeaders(sheet);

        // Get existing data to check for duplicates
        const existingData = sheet.getDataRange().getValues();
        const existingIds = new Set();

        // Skip header row (index 0) and collect IDs
        for (let i = 1; i < existingData.length; i++) {
            if (existingData[i][0]) { // Column A contains ID
                existingIds.add(existingData[i][0]);
            }
        }

        // Prepare data rows
        const newRows = [];
        let updatedCount = 0;
        let addedCount = 0;

        expenses.forEach(expense => {
            const row = [
                expense.id || '',
                expense.userId || '',
                expense.amount || 0,
                expense.currency || '',
                expense.amountINR || 0,
                expense.amountUSD || 0,
                expense.description || '',
                expense.tag || '',
                expense.timestamp || '',
                expense.dateStr || '',
                expense.timeStr || '',
                expense.syncStatus || 'synced',
                new Date(), // Last updated timestamp
                expense.timestamp.slice(0,7),
                expense.timestamp.slice(0,4)

            ];

            // Check if this expense already exists
            if (existingIds.has(expense.id)) {
                // Update existing row
                updateExistingRow(sheet, existingData, expense.id, row);
                updatedCount++;
            } else {
                // Add to new rows
                newRows.push(row);
                addedCount++;
            }
        });

        // Append new rows if any
        if (newRows.length > 0) {
            const lastRow = sheet.getLastRow();
            sheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
        }

        // Format the sheet
        formatSheet(sheet);

        // Return success response
        return {
            success: true,
            message: `Successfully exported ${expenses.length} expenses (${addedCount} new, ${updatedCount} updated)`,
            stats: {
                total: expenses.length,
                added: addedCount,
                updated: updatedCount
            }
        };

    } catch (error) {
        Logger.log('Error in exportExpenses: ' + error.toString());
        return {
            success: false,
            message: 'Failed to export: ' + error.toString()
        };
    }
}

/**
 * Get or create the target sheet
 * @return {Sheet} The target sheet
 */
function getOrCreateSheet() {
    let spreadsheet;

    if (SPREADSHEET_ID) {
        spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    } else {
        spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        if (!spreadsheet) {
            // Create a new spreadsheet if none exists
            spreadsheet = SpreadsheetApp.create('Money Track - Expenses');
        }
    }

    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
        sheet = spreadsheet.insertSheet(SHEET_NAME);
    }

    return sheet;
}

/**
 * Ensure the sheet has proper headers
 * @param {Sheet} sheet - The target sheet
 */
function ensureHeaders(sheet) {
    const headers = [
        'id',
        'userId',
        'amount',
        'currency',
        'amountINR',
        'amountUSD',
        'description',
        'tag',
        'timestamp',
        'dateStr',
        'timeStr',
        'syncStatus',
        'Last Updated',
        'Month',
        'Year'
    ];
    // Check if headers exist
    if (sheet.getLastRow() === 0) {
        // Sheet is empty, add headers
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

        // Format headers
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setFontWeight('bold');
        headerRange.setBackground('#4F46E5'); // Indigo color
        headerRange.setFontColor('#FFFFFF');
        headerRange.setHorizontalAlignment('center');
    }
}

/**
 * Update an existing row with new data
 * @param {Sheet} sheet - The target sheet
 * @param {Array} existingData - Current sheet data
 * @param {string} id - The expense ID to update
 * @param {Array} newRow - The new row data
 */
function updateExistingRow(sheet, existingData, id, newRow) {
    for (let i = 1; i < existingData.length; i++) {
        if (existingData[i][0] === id) {
            // Found the row, update it
            sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
            break;
        }
    }
}

/**
 * Format the sheet for better readability
 * @param {Sheet} sheet - The target sheet
 */
function formatSheet(sheet) {
    // Auto-resize columns
    for (let i = 1; i <= 12; i++) {
        sheet.autoResizeColumn(i);
    }

    // Freeze header row
    sheet.setFrozenRows(1);

    // Add alternating row colors for data rows
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
        const dataRange = sheet.getRange(2, 1, lastRow - 1, 12);

        // Apply banding (alternating colors)
        dataRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
    }

    // Format amount columns as numbers
    if (lastRow > 1) {
        // Original amount column
        const amountRange = sheet.getRange(2, 3, lastRow - 1, 1);
        amountRange.setNumberFormat('#,##0.00');

        // Amount INR column
        const amountINRRange = sheet.getRange(2, 5, lastRow - 1, 1);
        amountINRRange.setNumberFormat('₹#,##0.00');

        // Amount USD column
        const amountUSDRange = sheet.getRange(2, 6, lastRow - 1, 1);
        amountUSDRange.setNumberFormat('$#,##0.00');
    }

    // Format timestamp column
    if (lastRow > 1) {
        const timestampRange = sheet.getRange(2, 9, lastRow - 1, 1);
        timestampRange.setNumberFormat('yyyy-mm-dd hh:mm:ss');

        const lastUpdatedRange = sheet.getRange(2, 10, lastRow - 1, 1);
        lastUpdatedRange.setNumberFormat('yyyy-mm-dd hh:mm:ss');
    }
}

/**
 * Test function to verify the script works
 * Run this function manually to test
 */
function testExport() {
    const testData = {
        action: 'export',
        expenses: [
            {
                id: 'test-1',
                userId: 'test-user',
                amount: 100.50,
                currency: 'USD',
                amountINR: 8350.00,
                amountUSD: 100.50,
                description: 'Test Expense 1',
                tag: 'Food',
                timestamp: new Date().toISOString(),
                dateStr: '2025-12-27',
                timeStr: '10:30',
                syncStatus: 'synced'
            },
            {
                id: 'test-2',
                userId: 'test-user',
                amount: 500.00,
                currency: 'INR',
                amountINR: 500.00,
                amountUSD: 6.02,
                description: 'Test Expense 2',
                tag: 'Shopping',
                timestamp: new Date().toISOString(),
                dateStr: '2025-12-27',
                timeStr: '14:45',
                syncStatus: 'synced'
            }
        ]
    };

    const result = exportExpenses(testData.expenses);
    Logger.log('Test result: ' + JSON.stringify(result));
}
