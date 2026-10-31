import { google } from 'googleapis';
import { supabase } from '../config/supabase.js';

// Default Spreadsheet ID provided by user
const DEFAULT_SPREADSHEET_ID = '1TRWH_zKjTtEiUAmQSS0XsA6_OtKc57FtMaDMeoIfjMs';
export const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
export const SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;

/**
 * Initialize Google Sheets API Client (Service Account fallback)
 */
export const getGoogleSheetsClient = () => {
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
 * Strips generic brand prefixes so each project receives a unique, dedicated tab name.
 */
export const sanitizeSheetName = (title = '') => {
  if (!title) return 'Applications';

  // 1. Remove generic brand prefixes to preserve unique project title within 30 chars limit
  let clean = title
    .replace(/^Zenemoo\s*(Opportunity\s*Program|Opportunity|Program)?\s*[×x|-]?\s*/i, '')
    .trim();

  if (!clean) clean = title;

  // 2. Remove illegal characters for Google Sheets tab names
  clean = clean.replace(/[\?:*\[\]\/\\]/g, '').replace(/\s+/g, ' ').trim();

  // 3. Truncate to Google Sheets tab limit of 30 characters
  if (clean.length > 30) {
    clean = clean.substring(0, 30).trim();
  }

  return clean || 'Applications';
};

/**
 * Helper to identify referral column header variants
 */
export const isReferralHeader = (h) => {
  if (!h || typeof h !== 'string') return false;
  const clean = h.trim().toLowerCase();
  return (
    clean === 'referral name' ||
    clean === 'referrer name' ||
    clean === 'referral' ||
    clean === 'referrer' ||
    clean === 'referred by' ||
    clean === 'referral / direct'
  );
};

/**
 * Robust helper to resolve referral details with database fallback and registration lookup.
 * Always returns 'Direct' for non-referred candidates and 'Ref: <CODE> (<NAME>)' for referred.
 */
export const resolveReferralDetails = async (applicationRecord) => {
  let referrerName = (applicationRecord.referrer_name || '').trim();
  let referralCode = (applicationRecord.referral_code || '').trim().toUpperCase();
  let referredById = applicationRecord.referred_by_id;

  if (!referrerName && !referralCode && applicationRecord.id && supabase) {
    try {
      const { data: dbApp } = await supabase
        .from('opportunity_applications')
        .select('referrer_name, referral_code, referred_by_id')
        .eq('id', applicationRecord.id)
        .maybeSingle();
      if (dbApp) {
        referrerName = (dbApp.referrer_name || '').trim();
        referralCode = (dbApp.referral_code || '').trim().toUpperCase();
        referredById = dbApp.referred_by_id || referredById;
      }
    } catch (_) {}
  }

  // If referralCode exists but referrerName is missing, attempt profile lookup
  if (!referrerName && referralCode && supabase) {
    try {
      const { data: refTalent } = await supabase
        .from('talent_registrations')
        .select('full_name, id')
        .ilike('registration_code', referralCode)
        .maybeSingle();
      if (refTalent && refTalent.full_name) {
        referrerName = refTalent.full_name.trim();
        if (!referredById && refTalent.id) referredById = refTalent.id;

        // Persist missing referrer_name back to database record for permanent consistency
        if (applicationRecord.id) {
          supabase
            .from('opportunity_applications')
            .update({ referrer_name: referrerName, ...(referredById ? { referred_by_id: referredById } : {}) })
            .eq('id', applicationRecord.id)
            .then(() => {})
            .catch(() => {});
        }
      }
    } catch (_) {}
  }

  const isReferred = !!(referrerName || referralCode);
  let referralDisplayName = 'Direct';

  if (isReferred) {
    if (referralCode && referrerName) {
      referralDisplayName = `Ref: ${referralCode} (${referrerName})`;
    } else if (referrerName) {
      referralDisplayName = referrerName;
    } else if (referralCode) {
      referralDisplayName = `Ref: ${referralCode}`;
    }
  }

  return {
    isReferred,
    referrerName,
    referralCode,
    referralDisplayName,
  };
};

/**
 * Maps a candidate record to row values matching the active spreadsheet header columns
 */
export const mapApplicationToRow = (currentHeaders, appRecord, resolvedAnswers, referralDisplayName, dateFormatted) => {
  const applicantId = appRecord.applicant_id || `APP-${appRecord.id}`;
  return currentHeaders.map((headerName) => {
    if (headerName === 'Applicant ID') return applicantId;
    if (headerName === 'Applicant Name') return appRecord.applicant_name || '';
    if (headerName === 'Email') return appRecord.applicant_email || '';
    if (headerName === 'Phone') return appRecord.applicant_phone || '';
    if (headerName === 'Status') return (appRecord.status || 'pending').toUpperCase();
    if (headerName === 'Application Date') return dateFormatted;
    if (isReferralHeader(headerName)) {
      return referralDisplayName || 'Direct';
    }

    if (resolvedAnswers) {
      if (resolvedAnswers[headerName] !== undefined && resolvedAnswers[headerName] !== null) {
        const val = resolvedAnswers[headerName];
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }
      const hTrim = headerName.trim().toLowerCase();
      for (const [k, v] of Object.entries(resolvedAnswers)) {
        if (k.trim().toLowerCase() === hTrim && v !== undefined && v !== null) {
          if (typeof v === 'object') return JSON.stringify(v);
          return String(v);
        }
      }
    }

    return '';
  });
};

/**
 * Pre-create a dedicated sheet (tab) in Google Sheets for a newly created or updated project/opportunity.
 */
export const ensureOpportunitySheetExists = async (opportunityObj) => {
  if (!opportunityObj || !opportunityObj.title) return { success: false, message: 'No opportunity title provided.' };
  const sheetTitle = sanitizeSheetName(opportunityObj.title);

  // METHOD 1: Google Apps Script Web App
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (appsScriptUrl) {
    try {
      const secret = process.env.ZENEMOO_SHEETS_SYNC_SECRET ? process.env.ZENEMOO_SHEETS_SYNC_SECRET.trim() : '';
      await fetch(appsScriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          secret,
          action: 'ensure_sheet',
          payload: {
            sheet_name: sheetTitle,
            opportunity_title: opportunityObj.title,
          },
        }),
        redirect: 'follow',
      });
    } catch (err) {
      console.warn(`[Apps Script ensure_sheet Note for "${sheetTitle}"]:`, err.message);
    }
  }

  // METHOD 2: Direct Google Sheets API (Service Account Fallback)
  const sheets = getGoogleSheetsClient();
  if (sheets) {
    try {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetList = spreadsheet.data.sheets || [];
      const exists = sheetList.some((s) => s.properties?.title === sheetTitle);

      if (!exists) {
        await sheets.spreadsheets.batchUpdate({
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

        // Initialize header row for new project sheet tab
        const defaultHeaders = ['Applicant ID', 'Applicant Name', 'Email', 'Phone', 'Status', 'Application Date', 'Referral Name'];
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetTitle}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [defaultHeaders] },
        });
        console.log(`[Google Sheets] Created separate sheet tab "${sheetTitle}" for project "${opportunityObj.title}".`);
      }
      return { success: true, sheetTitle };
    } catch (err) {
      console.warn(`[Google Sheets Service Account ensure_sheet Note for "${sheetTitle}"]:`, err.message);
    }
  }

  return { success: false, message: 'Google Sheets sync not configured or completed in background.' };
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

  // Resolve answers so all keys are human-readable question text labels
  let resolvedAnswers = { ...(applicationRecord.answers || {}) };
  let customQuestions = opportunityObj?.custom_questions;

  if (!customQuestions && applicationRecord.opportunity_id && supabase) {
    try {
      const { data: oppData } = await supabase
        .from('opportunities')
        .select('custom_questions')
        .eq('id', applicationRecord.opportunity_id)
        .maybeSingle();
      if (oppData && oppData.custom_questions) {
        customQuestions = oppData.custom_questions;
      }
    } catch (_) {}
  }

  if (Array.isArray(customQuestions) && customQuestions.length > 0) {
    const normalized = {};
    Object.entries(resolvedAnswers).forEach(([key, val]) => {
      const matchedQ = customQuestions.find((q) => q && (q.id === key || q.key === key));
      if (matchedQ && matchedQ.label) {
        normalized[matchedQ.label.trim()] = val;
      } else {
        normalized[key] = val;
      }
    });
    resolvedAnswers = normalized;
  }

  // Resolve referral details (Referrer Name / Referral Code / Direct)
  const { isReferred, referrerName, referralCode, referralDisplayName } = await resolveReferralDetails(applicationRecord);

  // CRITICAL: Always inject 'Referral Name' directly inside resolvedAnswers so the Google Apps Script
  // creates/maps the Referral Name column and populates candidate referral attribution (Direct or Ref: ...)
  resolvedAnswers['Referral Name'] = referralDisplayName || (isReferred ? (referrerName || referralCode) : 'Direct');

  // METHOD 1: Google Apps Script Web App (100% FREE - Zero Cost)
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (appsScriptUrl) {
    try {
      const secret = process.env.ZENEMOO_SHEETS_SYNC_SECRET ? process.env.ZENEMOO_SHEETS_SYNC_SECRET.trim() : '';
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
          referral_name: referralDisplayName,
          referrer_name: isReferred ? (referrerName || referralCode) : 'Direct',
          referral_code: isReferred ? referralCode : '',
          is_referred: isReferred,
          answers: resolvedAnswers,
        },
      };

      const res = await fetch(appsScriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
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
        const errMsg = resJson.message || (res.status === 404 ? 'Apps Script URL returned 404. Ensure script is deployed with "Who has access: Anyone".' : `Apps Script HTTP ${res.status}`);
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

    const answersObj = resolvedAnswers;
    const customQuestionKeys = Object.keys(answersObj);

    const defaultHeaders = ['Applicant ID', 'Applicant Name', 'Email', 'Phone'];
    const endHeaders = ['Status', 'Application Date', 'Referral Name'];

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
        const hasCol = currentHeaders.some((ch) => ch.trim().toLowerCase() === reqCol.trim().toLowerCase());
        if (!hasCol) {
          const statusIdx = currentHeaders.findIndex((h) => h.trim().toLowerCase() === 'status');
          if (statusIdx !== -1 && reqCol !== 'Referral Name') {
            currentHeaders.splice(statusIdx, 0, reqCol);
          } else {
            currentHeaders.push(reqCol);
          }
          headersUpdated = true;
        }
      });

      // Ensure a referral column exists even if old sheet was initialized without it
      const hasReferralCol = currentHeaders.some((h) => isReferralHeader(h));
      if (!hasReferralCol) {
        currentHeaders.push('Referral Name');
        headersUpdated = true;
      }

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

    const rowValues = mapApplicationToRow(currentHeaders, applicationRecord, resolvedAnswers, referralDisplayName, dateFormatted);

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
 * Bulk synchronize ALL applications for an opportunity to Google Sheets in one fast, atomic, quota-safe batch.
 * Guarantees that:
 * 1. Sheet tab exists with clean headers: ['Applicant ID', 'Applicant Name', 'Email', 'Phone', ...customQuestions, 'Status', 'Application Date', 'Referral Name']
 * 2. Records are sorted chronologically by created_at ASC (matching Applicant ID creation order)
 * 3. Every row receives its referral attribution: "Ref: <CODE> (<NAME>)" or "Direct" (for non-referred)
 * 4. All rows are updated in a single batch write (A2:end) to avoid Google Sheets API 429 rate limits
 * 5. Supabase sync_status is updated to 'synced' with zero data deletion
 */
export const syncOpportunityApplicationsBulkToGoogleSheet = async (opportunityId, opportunityObj = null) => {
  if (!supabase) {
    return { success: false, message: 'Supabase database client unavailable' };
  }

  // 1. Resolve Opportunity Title and Custom Questions
  if (!opportunityObj && opportunityId && opportunityId !== 'all') {
    try {
      const { data: oppData } = await supabase
        .from('opportunities')
        .select('id, title, custom_questions')
        .eq('id', opportunityId)
        .maybeSingle();
      if (oppData) opportunityObj = oppData;
    } catch (_) {}
  }

  // 2. Fetch all applications for this opportunity ordered chronologically by created_at ASC (matching Applicant ID order)
  let query = supabase
    .from('opportunity_applications')
    .select('*')
    .order('created_at', { ascending: true });

  if (opportunityId && opportunityId !== 'all') {
    query = query.eq('opportunity_id', opportunityId);
  }

  const { data: records, error: fetchErr } = await query;
  if (fetchErr) {
    return { success: false, message: fetchErr.message };
  }

  if (!records || records.length === 0) {
    return { success: true, total: 0, synced: 0, message: 'No applications found to synchronize.' };
  }

  // 3. Collect unique missing referral codes and do a single batch query against talent_registrations
  const missingRefCodes = [
    ...new Set(
      records
        .filter((r) => !r.referrer_name && r.referral_code)
        .map((r) => String(r.referral_code).trim().toUpperCase())
    ),
  ];

  const talentNameMap = new Map();
  if (missingRefCodes.length > 0) {
    try {
      const { data: talents } = await supabase
        .from('talent_registrations')
        .select('registration_code, full_name, id')
        .in('registration_code', missingRefCodes);

      if (talents) {
        talents.forEach((t) => {
          if (t.registration_code && t.full_name) {
            talentNameMap.set(t.registration_code.toUpperCase(), t.full_name.trim());
          }
        });
      }
    } catch (_) {}
  }

  const sheetTitle = sanitizeSheetName(opportunityObj?.title || records[0]?.opportunity_title || 'Applications');

  // METHOD 1: Google Apps Script Web App (if configured)
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  if (appsScriptUrl) {
    try {
      const secret = process.env.ZENEMOO_SHEETS_SYNC_SECRET ? process.env.ZENEMOO_SHEETS_SYNC_SECRET.trim() : '';
      let syncedCount = 0;
      let failedCount = 0;

      for (const record of records) {
        let refName = (record.referrer_name || '').trim();
        let refCode = (record.referral_code || '').trim().toUpperCase();
        if (!refName && refCode && talentNameMap.has(refCode)) {
          refName = talentNameMap.get(refCode);
        }
        const isRef = !!(refName || refCode);
        const refDisplay = isRef
          ? (refCode && refName ? `Ref: ${refCode} (${refName})` : (refName || `Ref: ${refCode}`))
          : 'Direct';

        let appAnswers = { ...(record.answers || {}) };
        if (Array.isArray(opportunityObj?.custom_questions) && opportunityObj.custom_questions.length > 0) {
          const normalized = {};
          Object.entries(appAnswers).forEach(([k, v]) => {
            const matchedQ = opportunityObj.custom_questions.find((q) => q && (q.id === k || q.key === k));
            if (matchedQ && matchedQ.label) {
              normalized[matchedQ.label.trim()] = v;
            } else {
              normalized[k] = v;
            }
          });
          appAnswers = normalized;
        }

        // CRITICAL: Always inject 'Referral Name' into answers so Apps Script creates/maps the Referral Name column
        appAnswers['Referral Name'] = refDisplay;

        const payload = {
          secret,
          action: 'sync_application',
          payload: {
            id: record.id,
            applicant_id: record.applicant_id || `APP-${record.id}`,
            opportunity_title: opportunityObj?.title || record.opportunity_title || 'Applications',
            sheet_name: sheetTitle,
            applicant_name: record.applicant_name,
            applicant_email: record.applicant_email,
            applicant_phone: record.applicant_phone,
            status: (record.status || 'pending').toUpperCase(),
            created_at: record.created_at || new Date().toISOString(),
            referral_name: refDisplay,
            referrer_name: isRef ? (refName || refCode) : 'Direct',
            referral_code: isRef ? refCode : '',
            is_referred: isRef,
            answers: appAnswers,
          },
        };

        try {
          const res = await fetch(appsScriptUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow',
          });
          const resJson = await res.json().catch(() => ({}));
          if (res.ok && resJson.status === 'success') {
            syncedCount++;
            await updateAppDbSyncStatus(record.id, 'synced');
          } else {
            failedCount++;
            await updateAppDbSyncStatus(record.id, 'failed', resJson.message || `HTTP ${res.status}`);
          }
        } catch (fetchErr) {
          failedCount++;
          await updateAppDbSyncStatus(record.id, 'failed', fetchErr.message);
        }
      }

      // Also persist any newly resolved referrer names back to Supabase
      if (talentNameMap.size > 0) {
        for (const [code, name] of talentNameMap.entries()) {
          supabase
            .from('opportunity_applications')
            .update({ referrer_name: name })
            .eq('opportunity_id', opportunityId)
            .ilike('referral_code', code)
            .is('referrer_name', null)
            .then(() => {})
            .catch(() => {});
        }
      }

      return {
        success: syncedCount > 0,
        total: records.length,
        synced: syncedCount,
        failed: failedCount,
        message: `Synchronized ${syncedCount} of ${records.length} applications to Google Sheets with referral attribution.`,
      };
    } catch (err) {
      console.warn('[Apps Script Sequential Sync Error]:', err.message);
    }
  }

  // METHOD 2: Direct Google Sheets API (Service Account Fallback - Guaranteed batch update)
  const sheets = getGoogleSheetsClient();
  if (!sheets) {
    return { success: false, message: 'Neither GOOGLE_APPS_SCRIPT_URL nor GOOGLE_SERVICE_ACCOUNT_EMAIL configured.' };
  }

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetList = spreadsheet.data.sheets || [];
    let targetSheet = sheetList.find((s) => s.properties?.title === sheetTitle);

    if (!targetSheet) {
      await sheets.spreadsheets.batchUpdate({
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
    }

    const headerRange = `'${sheetTitle}'!1:1`;
    const headerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: headerRange,
    });

    let currentHeaders = headerRes.data.values?.[0] || [];

    // Collect all custom questions
    let customQuestions = opportunityObj?.custom_questions;
    let customQuestionLabels = [];
    if (Array.isArray(customQuestions) && customQuestions.length > 0) {
      customQuestionLabels = customQuestions
        .map((q) => (q?.label ? q.label.trim() : (q?.id || q?.key || '')))
        .filter(Boolean);
    } else {
      const keySet = new Set();
      records.forEach((r) => {
        if (r.answers && typeof r.answers === 'object') {
          Object.keys(r.answers).forEach((k) => keySet.add(k.trim()));
        }
      });
      customQuestionLabels = Array.from(keySet);
    }

    const defaultHeaders = ['Applicant ID', 'Applicant Name', 'Email', 'Phone'];
    const endHeaders = ['Status', 'Application Date', 'Referral Name'];

    let expectedHeaders = [...defaultHeaders];
    customQuestionLabels.forEach((q) => {
      if (!expectedHeaders.includes(q)) expectedHeaders.push(q);
    });
    endHeaders.forEach((eh) => {
      if (!expectedHeaders.includes(eh)) expectedHeaders.push(eh);
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
        const hasCol = currentHeaders.some((ch) => ch.trim().toLowerCase() === reqCol.trim().toLowerCase());
        if (!hasCol) {
          const statusIdx = currentHeaders.findIndex((h) => h.trim().toLowerCase() === 'status');
          if (statusIdx !== -1 && reqCol !== 'Referral Name') {
            currentHeaders.splice(statusIdx, 0, reqCol);
          } else {
            currentHeaders.push(reqCol);
          }
          headersUpdated = true;
        }
      });

      const hasReferralCol = currentHeaders.some((h) => isReferralHeader(h));
      if (!hasReferralCol) {
        currentHeaders.push('Referral Name');
        headersUpdated = true;
      }

      if (headersUpdated) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetTitle}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [currentHeaders] },
        });
      }
    }

    // Map all applicant records to rows in exact header order
    const allRows = records.map((record) => {
      let refName = (record.referrer_name || '').trim();
      let refCode = (record.referral_code || '').trim().toUpperCase();

      if (!refName && refCode && talentNameMap.has(refCode)) {
        refName = talentNameMap.get(refCode);
      }

      const isRef = !!(refName || refCode);
      const referralDisplayName = isRef
        ? (refCode && refName ? `Ref: ${refCode} (${refName})` : (refName || `Ref: ${refCode}`))
        : 'Direct';

      let resolvedAnswers = { ...(record.answers || {}) };
      if (Array.isArray(customQuestions) && customQuestions.length > 0) {
        const normalized = {};
        Object.entries(resolvedAnswers).forEach(([k, v]) => {
          const matchedQ = customQuestions.find((q) => q && (q.id === k || q.key === k));
          if (matchedQ && matchedQ.label) {
            normalized[matchedQ.label.trim()] = v;
          } else {
            normalized[k] = v;
          }
        });
        resolvedAnswers = normalized;
      }

      const dateFormatted = record.created_at
        ? new Date(record.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
        : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

      return mapApplicationToRow(currentHeaders, record, resolvedAnswers, referralDisplayName, dateFormatted);
    });

    // High performance atomic write: updates rows 2 to (records.length + 1) in ONE call!
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetTitle}'!A2`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });

    // Update Supabase sync status for all synchronized applications in batch
    const appIds = records.map((r) => r.id);
    const nowIso = new Date().toISOString();
    await supabase
      .from('opportunity_applications')
      .update({
        sync_status: 'synced',
        sync_error: null,
        last_synced_at: nowIso,
      })
      .in('id', appIds);

    // Also persist any newly resolved referrer names back to Supabase
    if (talentNameMap.size > 0) {
      for (const [code, name] of talentNameMap.entries()) {
        supabase
          .from('opportunity_applications')
          .update({ referrer_name: name })
          .eq('opportunity_id', opportunityId)
          .ilike('referral_code', code)
          .is('referrer_name', null)
          .then(() => {})
          .catch(() => {});
      }
    }

    return {
      success: true,
      total: records.length,
      synced: records.length,
      message: `Successfully synchronized ${records.length} applications to Google Sheets with referral attribution.`,
    };
  } catch (err) {
    console.error('[Google Sheets Bulk Sync Error]:', err.message);
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
