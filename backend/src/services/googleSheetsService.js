import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';

// Default Spreadsheet ID provided by user
const DEFAULT_SPREADSHEET_ID = '1TRWH_zKjTtEiUAmQSS0XsA6_OtKc57FtMaDMeoIfjMs';
export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;

/**
 * Initialize Google Sheets API Client (Service Account fallback)
 */
const getGoogleSheetsClient = () => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

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
 * Supports:
 * 1. 100% Free Google Apps Script Web App (Preferred, ZERO cost, NO credit card needed)
 * 2. Service Account fallback (if configured)
 */
export const syncApplicationToGoogleSheet = async (applicationRecord, opportunityObj = null) => {
  if (!applicationRecord) return { success: false, message: 'No application record provided.' };

  const applicantId = applicationRecord.applicant_id || `APP-${applicationRecord.id}`;
  const sheetTitle = sanitizeSheetName(opportunityObj?.title || applicationRecord.opportunity_title || 'General');

  // METHOD 1: Google Apps Script Web App (100% FREE - Zero Cost)
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (appsScriptUrl) {
    try {
      const secret = process.env.ZENEMOO_SHEETS_SYNC_SECRET || 'zenemoo-secret-key-2026';
      const payload = {
        secret,
        action: 'sync_application',
        payload: {
          id: applicationRecord.id,
          applicant_id: applicantId,
          opportunity_title: opportunityObj?.title || applicationRecord.opportunity_title || 'General Opportunity',
          sheet_name: sheetTitle,
          applicant_name: applicationRecord.applicant_name,
          applicant_email: applicationRecord.applicant_email,
          applicant_phone: applicationRecord.applicant_phone,
          status: (applicationRecord.status || 'pending').toUpperCase(),
          created_at: applicationRecord.created_at || new Date().toISOString(),
          answers: applicationRecord.answers || {},
        },
      };

      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resText = await res.text();
      let resJson = {};
      try {
        resJson = JSON.parse(resText);
      } catch (_) {}

      if (res.ok && resJson.status === 'success') {
        await updateAppDbSyncStatus(applicationRecord.id, 'synced');
        return { success: true, message: resJson.message || `Synced ${applicantId} via Apps Script`, updated: resJson.updated };
      } else {
        const errMsg = resJson.message || `Apps Script returned HTTP ${res.status}`;
        await updateAppDbSyncStatus(applicationRecord.id, 'failed', errMsg);
        return { success: false, message: errMsg };
      }
    } catch (appsScriptErr) {
      console.warn(`[Google Apps Script Sync Note for ${applicantId}]:`, appsScriptErr.message);
      await updateAppDbSyncStatus(applicationRecord.id, 'failed', appsScriptErr.message);
      return { success: false, message: appsScriptErr.message };
    }
  }

  // METHOD 2: Direct Google Sheets API (Service Account Fallback)
  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    console.warn('[Google Sheets Note] Neither GOOGLE_APPS_SCRIPT_URL nor GOOGLE_SERVICE_ACCOUNT_EMAIL set. Queued sync in database.');
    await updateAppDbSyncStatus(applicationRecord.id, 'pending', 'Google Apps Script URL pending configuration in environment');
    return { success: false, message: 'Google Apps Script URL pending configuration in .env' };
  }

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetList = spreadsheet.data.sheets || [];
    let targetSheet = sheetList.find((s) => s.properties?.title === sheetTitle);

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

    const headerRange = `'${sheetTitle}'!1:1`;
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: headerRange,
    });

    let currentHeaders = headerRes.data.values?.[0] || [];

    const answersObj = applicationRecord.answers || {};
    const customQuestionKeys = Object.keys(answersObj);

    const defaultHeaders = ['Applicant ID', 'Applicant Name', 'Email', 'Phone'];
    const endHeaders = ['Status', 'Application Date'];

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

    if (currentHeaders.length === 0) {
      currentHeaders = expectedHeaders;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetTitle}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [currentHeaders] },
      });
    } else {
      let headersUpdated = false;
      expectedHeaders.forEach((reqCol) => {
        if (!currentHeaders.includes(reqCol)) {
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
          requestBody: { values: [currentHeaders] },
        });
      }
    }

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

      if (answersObj[headerName] !== undefined && answersObj[headerName] !== null) {
        const val = answersObj[headerName];
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }

      return '';
    });

    const colARange = `'${sheetTitle}'!A:A`;
    const colARes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: colARange,
    });

    const existingColumnA = colARes.data.values || [];
    let existingRowIndex = -1;

    for (let i = 0; i < existingColumnA.length; i++) {
      if (existingColumnA[i]?.[0] === applicantId) {
        existingRowIndex = i + 1;
        break;
      }
    }

    if (existingRowIndex > 0) {
      const updateRange = `'${sheetTitle}'!A${existingRowIndex}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] },
      });

      await updateAppDbSyncStatus(applicationRecord.id, 'synced');
      return { success: true, message: `Updated row ${existingRowIndex} for ${applicantId}`, updated: true };
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetTitle}'!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [rowValues] },
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
