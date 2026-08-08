import { supabase } from '../config/supabase.js';
import { sendApplicationNotification } from '../services/telegramNotificationService.js';
import { syncApplicationToGoogleSheet } from '../services/googleSheetsService.js';
import { sendMailViaBrevo } from '../services/emailService.js';
import { generateApplicationConfirmationHtml } from '../services/applicationEmailTemplate.js';

/**
 * Asynchronously sends confirmation email to applicant upon successful Opportunity Application submission
 */
export const sendApplicationConfirmationEmail = async (appData) => {
  const { id, applicant_id, opportunity_title, applicant_name, applicant_email } = appData;

  const sender = process.env.EMAIL_FROM || 'Zenemoo <noreply@zenemoo.in>';
  const ccRecipient = process.env.EMAIL_CC || 'mr.prem2006@gmail.com';
  const subject = `Application Received — ${opportunity_title || 'Program Opportunity'} | ${applicant_id || 'APP-2026-CONFIRM'}`;

  console.log(`\n====================================================`);
  console.log(`[APPLICATION EMAIL] Preparing candidate confirmation email...`);
  console.log(`[APPLICATION EMAIL] Applicant Name: ${applicant_name}`);
  console.log(`[APPLICATION EMAIL] Recipient (TO): ${applicant_email}`);
  console.log(`[APPLICATION EMAIL] CC Recipient: ${ccRecipient}`);
  console.log(`[APPLICATION EMAIL] Sender (FROM): ${sender}`);
  console.log(`[APPLICATION EMAIL] Application ID: ${applicant_id || id}`);
  console.log(`[APPLICATION EMAIL] Opportunity: ${opportunity_title}`);
  console.log(`====================================================`);

  const htmlContent = generateApplicationConfirmationHtml(appData);

  try {
    const result = await sendMailViaBrevo({
      sender,
      recipients: applicant_email,
      cc: ccRecipient,
      subject,
      html: htmlContent,
    });

    console.log(`\n====================================================`);
    console.log(`[APPLICATION EMAIL] SUCCESS: Email accepted by provider!`);
    console.log(`[APPLICATION EMAIL] Execution Path: ${result.executionPath || 'Brevo/Nodemailer'}`);
    console.log(`[APPLICATION EMAIL] Message ID: ${result.messageId || 'N/A'}`);
    console.log(`[APPLICATION EMAIL] Elapsed Time: ${result.elapsedTimeMs || 0}ms`);
    console.log(`====================================================\n`);

    // Update email_status in Supabase if record ID exists (safely ignored if column missing)
    if (id) {
      try {
        await supabase.from('opportunity_applications').update({ email_status: 'sent' }).eq('id', id);
      } catch (_) {}
    }

    return result;
  } catch (err) {
    console.error(`\n====================================================`);
    console.error(`[APPLICATION EMAIL] FAILED for ${applicant_email} (App ID: ${applicant_id || id}):`);
    console.error(`[APPLICATION EMAIL] Reason: ${err.message || JSON.stringify(err)}`);
    console.error(`====================================================\n`);

    if (id) {
      try {
        await supabase.from('opportunity_applications').update({ email_status: 'failed' }).eq('id', id);
      } catch (_) {}
    }

    return { success: false, error: err.message };
  }
};

// 1. GET ALL APPLICATIONS (Filtered by opportunity_id if provided)
export const getApplications = async (req, res) => {
  try {
    const { opportunity_id } = req.query;

    let query = supabase.from('opportunity_applications').select('*').order('created_at', { ascending: false });
    if (opportunity_id) {
      query = query.eq('opportunity_id', opportunity_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch applications error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ status: 'success', data: data || [] });
  } catch (err) {
    console.error('getApplications controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 2. SUBMIT CANDIDATE APPLICATION
export const submitApplication = async (req, res) => {
  try {
    const {
      opportunity_id,
      opportunity_title,
      applicant_name,
      applicant_email,
      applicant_phone,
      answers,
    } = req.body;

    if (!opportunity_id || !applicant_name || !applicant_email || !applicant_phone) {
      return res.status(400).json({ error: 'Missing required applicant fields' });
    }

    // Input Validation & XSS/HTML Sanitization
    const cleanEmail = (applicant_email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid applicant email address.' });
    }

    const cleanName = (applicant_name || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 100);
    const cleanPhone = (applicant_phone || '').replace(/[^\d+ -]/g, '').trim().substring(0, 20);
    const cleanTitle = (opportunity_title || 'General Opportunity').replace(/<[^>]*>?/gm, '').trim().substring(0, 100);

    const generatedApplicantId = req.body.applicant_id || `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord = {
      applicant_id: generatedApplicantId,
      opportunity_id,
      opportunity_title: cleanTitle,
      applicant_name: cleanName,
      applicant_email: cleanEmail,
      applicant_phone: cleanPhone,
      answers: answers || {},
      status: 'pending',
      admin_notes: '',
      sync_status: 'pending',
      email_status: 'pending',
      created_at: new Date().toISOString(),
    };

    let savedRecord = null;

    // Attempt insert into Supabase database (Source of truth)
    const { data, error } = await supabase.from('opportunity_applications').insert([newRecord]).select();

    if (error) {
      console.warn('[Supabase Application Insert Note]:', error.message);
      // Fallback: try fetching existing record if inserted by client SDK
      const { data: existingData } = await supabase
        .from('opportunity_applications')
        .select('*')
        .eq('applicant_email', cleanEmail)
        .eq('opportunity_id', opportunity_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingData && existingData.length > 0) {
        savedRecord = existingData[0];
      } else {
        savedRecord = newRecord;
      }
    } else if (data && data.length > 0) {
      savedRecord = data[0];
    } else {
      savedRecord = newRecord;
    }

    console.log(`\n====================================================`);
    console.log(`📥 Candidate application processed: App ID = ${savedRecord.applicant_id}`);
    console.log(`👤 Applicant: ${cleanName} | Email: ${cleanEmail}`);
    console.log(`====================================================`);

    // Asynchronously trigger Google Sheets synchronization (non-blocking)
    syncApplicationToGoogleSheet(savedRecord).catch((err) => {
      console.warn('[Google Sheets Post-Submit Sync Note]:', err.message);
    });

    // Asynchronously dispatch Telegram notification to administrators (non-blocking)
    sendApplicationNotification({
      applicant_name: cleanName,
      applicant_email: cleanEmail,
      applicant_phone: cleanPhone,
      opportunity_title: cleanTitle,
      qualification: answers?.qualification || answers?.degree || 'Relevant Qualification Uploaded',
    }).catch((err) => console.warn('[Telegram Application Notification Note]', err.message));

    // Asynchronously dispatch Confirmation Email to applicant + CC to mr.prem2006@gmail.com (non-blocking / fail-safe)
    sendApplicationConfirmationEmail(savedRecord).catch((err) => {
      console.warn('[Application Confirmation Email Dispatch Note]:', err.message);
    });

    return res.status(201).json({ status: 'success', data: savedRecord });
  } catch (err) {
    console.error('submitApplication controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 3. MANUAL RESEND / SEND CONFIRMATION EMAIL ENDPOINT
export const sendConfirmationEmailEndpoint = async (req, res) => {
  try {
    const { id, applicant_id, opportunity_id, applicant_email } = req.body;

    let appRecord = null;
    if (id || applicant_id) {
      let query = supabase.from('opportunity_applications').select('*');
      if (id) query = query.eq('id', id);
      else if (applicant_id) query = query.eq('applicant_id', applicant_id);

      const { data } = await query.single();
      if (data) appRecord = data;
    }

    if (!appRecord && applicant_email) {
      appRecord = req.body;
    }

    if (!appRecord || !appRecord.applicant_email) {
      return res.status(400).json({ error: 'Application record or applicant email is required.' });
    }

    const result = await sendApplicationConfirmationEmail(appRecord);
    return res.json({
      status: result.success !== false ? 'success' : 'failed',
      message: result.error ? `Email sending failed: ${result.error}` : 'Confirmation email processed successfully.',
      result,
    });
  } catch (err) {
    console.error('sendConfirmationEmailEndpoint exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 4. UPDATE APPLICATION STATUS OR ADMIN NOTES
export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('opportunity_applications')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update application error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const updatedRecord = data[0];

    // Sync updated status to Google Sheets row asynchronously
    if (updatedRecord) {
      syncApplicationToGoogleSheet(updatedRecord).catch((err) => {
        console.warn('[Google Sheets Status Update Note]:', err.message);
      });
    }

    return res.json({ status: 'success', data: updatedRecord });
  } catch (err) {
    console.error('updateApplication controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 5. DELETE APPLICATION
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('opportunity_applications').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ status: 'success', message: 'Application deleted' });
  } catch (err) {
    console.error('deleteApplication controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 6. MANUAL RESYNC SINGLE APPLICATION TO GOOGLE SHEETS
export const resyncApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('opportunity_applications').select('*').eq('id', id).single();

    if (error || !data) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    const result = await syncApplicationToGoogleSheet(data);
    return res.json({
      status: result.success ? 'success' : 'failed',
      message: result.message,
      data: result,
    });
  } catch (err) {
    console.error('resyncApplication exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 7. BULK RESYNC ALL APPLICATIONS FOR AN OPPORTUNITY TO GOOGLE SHEETS
export const resyncOpportunityApplications = async (req, res) => {
  try {
    const { opportunity_id } = req.params;
    let query = supabase.from('opportunity_applications').select('*');
    if (opportunity_id && opportunity_id !== 'all') {
      query = query.eq('opportunity_id', opportunity_id);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const records = data || [];
    let syncedCount = 0;
    let failedCount = 0;

    for (const record of records) {
      const result = await syncApplicationToGoogleSheet(record);
      if (result.success) syncedCount++;
      else failedCount++;
    }

    return res.json({
      status: 'success',
      total: records.length,
      synced: syncedCount,
      failed: failedCount,
      message: `Resynced ${syncedCount} of ${records.length} applications to Google Sheets.`,
    });
  } catch (err) {
    console.error('resyncOpportunityApplications exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
