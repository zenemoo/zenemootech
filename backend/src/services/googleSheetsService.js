import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';

// Default Spreadsheet ID provided by user
const DEFAULT_SPREADSHEET_ID = '1TRWH_zKjTtEiUAmQSS0XsA6_OtKc57FtMaDMeoIfjMs';
export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;

/**
 * Initialize Google Sheets API Client
 */
const getGoogleSheetsClient = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Handle line breaks in private key string
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    console.warn('[Google Sheets Auth Init Note]:', err.message);
    return null;
  }
};

/**
 * Sanitize Opportunity Title for Google Sheets Worksheet Name (Max 30 chars, no special chars)
 */
export const sanitizeSheetName = (title = '') => {
  if (!title) return 'Applications';
  let clean = title.replace(/^Zenemoo\s*[×x|-]\s*/i, '').trim();
  clean = clean.replace(/[\?:*\[\]\/\\]/g, '').trim();
  if (clean.length > 30) {
    clean = clean.substring(0, 30).trim();
  }
  return clean || 'Applications';
};

/**
 * Synchronize candidate application to Google Sheets.
 * Database is ALWAYS the single source of truth.
 * Returns { success: boolean, message: string, updated?: boolean }
 */
export const syncApplicationToGoogleSheet = async (applicationRecord, opportunityObj = null) => {
  if (!applicationRecord) return { success: false, message: 'No application record provided.' };

  const sheets = getGoogleSheetsClient();
  const applicantId = applicationRecord.applicant_id || `APP-${applicationRecord.id}`;
  const sheetTitle = sanitizeSheetName(opportunityObj?.title || applicationRecord.opportunity_title || 'General');

  if (!sheets) {
    console.warn('[Google Sheets Note] Service account credentials not configured in environment. Queued sync in database.');
    await updateAppDbSyncStatus(applicationRecord.id, 'pending', 'Google credentials pending configuration in environment');
    return { success: false, message: 'Google Sheets credentials pending configuration in .env' };
  }

  try {
    // 1. Get Spreadsheet Metadata to verify worksheet existence
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetList = spreadsheet.data.sheets || [];
    let targetSheet = sheetList.find((s) => s.properties?.title === sheetTitle);

    // 2. Create worksheet if missing
    if (!targetSheet) {
      const addSheetRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                  gridProperties: { frozenRowCount: 1 },
                },
              },
            },
          ],
        },
      });
      targetSheet = addSheetRes.data.replies?.[0]?.addSheet;
    }

    // 3. Fetch existing headers from Row 1
    const headerRange = `'${sheetTitle}'!1:1`;
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: headerRange,
    });

    let currentHeaders = headerRes.data.values?.[0] || [];

    // Extract custom form question labels from answers object
    const answersObj = applicationRecord.answers || {};
    const customQuestionKeys = Object.keys(answersObj);

    // Default core headers
    const defaultHeaders = [
      'Applicant ID',
      'Applicant Name',
      'Email',
      'Phone',
    ];

    const endHeaders = ['Status', 'Application Date'];

    // Construct expected headers
    let expectedHeaders = [...defaultHeaders];
    customQuestionKeys.forEach((q) => {
      if (!expectedHeaders.includes(q)) {
        expectedHeaders.push(q);
      }
    });

    endHeaders.forEach((eh) => {
      if (!expectedHeaders.includes(eh)) {
        expectedHeaders.push(eh);
      }
    });

    // If current headers are empty (new sheet), write initial header row
    if (currentHeaders.length === 0) {
      currentHeaders = expectedHeaders;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetTitle}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [currentHeaders],
        },
      });
    } else {
      // Check if new custom questions need to be appended to existing headers
      let headersUpdated = false;
      expectedHeaders.forEach((reqCol) => {
        if (!currentHeaders.includes(reqCol)) {
          // Insert new custom question column before "Status" / "Application Date"
          const statusIdx = currentHeaders.indexOf('Status');
          if (statusIdx !== -1) {
            currentHeaders.splice(statusIdx, 0, reqCol);
          } else {
            currentHeaders.push(reqCol);
          }
          headersUpdated = true;
        }
      });

      if (headersUpdated) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetTitle}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [currentHeaders],
          },
        });
      }
    }

    // 4. Map applicant values into header column order
    const dateFormatted = applicationRecord.created_at
      ? new Date(applicationRecord.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

    const rowValues = currentHeaders.map((headerName) => {
      if (headerName === 'Applicant ID') return applicantId;
      if (headerName === 'Applicant Name') return applicationRecord.applicant_name || '';
      if (headerName === 'Email') return applicationRecord.applicant_email || '';
      if (headerName === 'Phone') return applicationRecord.applicant_phone || '';
      if (headerName === 'Status') return (applicationRecord.status || 'pending').toUpperCase();
      if (headerName === 'Application Date') return dateFormatted;

      // Custom form answers lookup
      if (answersObj[headerName] !== undefined && answersObj[headerName] !== null) {
        const val = answersObj[headerName];
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }

      return '';
    });

    // 5. Check if row with this Applicant ID already exists (Deduplication / Retry Safety)
    const colARange = `'${sheetTitle}'!A:A`;
    const colARes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: colARange,
    });

    const existingColumnA = colARes.data.values || [];
    let existingRowIndex = -1;

    for (let i = 0; i < existingColumnA.length; i++) {
      if (existingColumnA[i]?.[0] === applicantId) {
        existingRowIndex = i + 1; // 1-based index in Sheets
        break;
      }
    }

    if (existingRowIndex > 0) {
      // UPDATE existing row
      const updateRange = `'${sheetTitle}'!A${existingRowIndex}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowValues],
        },
      });

      await updateAppDbSyncStatus(applicationRecord.id, 'synced');
      return { success: true, message: `Updated row ${existingRowIndex} for ${applicantId}`, updated: true };
    } else {
      // APPEND new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetTitle}'!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [rowValues],
        },
      });

      await updateAppDbSyncStatus(applicationRecord.id, 'synced');
      return { success: true, message: `Appended new row for ${applicantId}`, updated: false };
    }
  } catch (err) {
    console.error(`[Google Sheets Sync Error for ${applicantId}]:`, err.message);
    await updateAppDbSyncStatus(applicationRecord.id, 'failed', err.message);
    return { success: false, message: err.message };
  }
};

/**
 * Helper to update sync_status in Supabase opportunity_applications table
 */
const updateAppDbSyncStatus = async (recordId, syncStatus, syncError = null) => {
  if (!recordId) return;
  try {
    if (supabase) {
      await supabase
        .from('opportunity_applications')
        .update({
          sync_status: syncStatus,
          sync_error: syncError,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', recordId);
    }
  } catch (_) {}
};
