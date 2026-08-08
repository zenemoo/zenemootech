import { supabase } from '../config/supabase.js';
import { sendApplicationNotification } from '../services/telegramNotificationService.js';
import { syncApplicationToGoogleSheet } from '../services/googleSheetsService.js';
import { sendMailViaBrevo } from '../services/emailService.js';
import { generateApplicationConfirmationHtml } from '../services/applicationEmailTemplate.js';
import { generateApplicationAcceptanceHtml } from '../services/applicationAcceptanceEmailTemplate.js';

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

    console.log(`[APPLICATION EMAIL] SUCCESS: Confirmation email accepted by provider! Message ID: ${result.messageId || 'N/A'}`);

    if (id) {
      try {
        await supabase.from('opportunity_applications').update({ email_status: 'sent' }).eq('id', id);
      } catch (_) {}
    }

    return result;
  } catch (err) {
    console.error(`[APPLICATION EMAIL] FAILED for ${applicant_email} (App ID: ${applicant_id || id}): ${err.message}`);

    if (id) {
      try {
        await supabase.from('opportunity_applications').update({ email_status: 'failed' }).eq('id', id);
      } catch (_) {}
    }

    return { success: false, error: err.message };
  }
};

/**
 * IDEMPOTENT APPLICATION ACCEPTANCE EMAIL DISPATCH
 * Guarantees that EXACTLY ONE acceptance email is sent per accepted candidate application.
 * Gracefully handles Supabase schema capabilities while maintaining atomic claim protection.
 */
export const sendApplicationAcceptanceEmail = async (appData, isForceResend = false) => {
  const { id, applicant_id, opportunity_title, applicant_name, applicant_email } = appData;

  // 1. In-Memory Idempotency Safeguard
  if (!isForceResend && (appData.acceptance_email_status === 'sent' || appData.acceptance_email_status === 'sending')) {
    console.log(`[ACCEPTANCE EMAIL] Aborting dispatch: Application ${applicant_id || id} acceptance_email_status is already '${appData.acceptance_email_status}'.`);
    return { success: true, message: 'Acceptance email already delivered.' };
  }

  // 2. Safe Database Atomic Lock Claim (Gracefully handles missing schema columns)
  if (id && !isForceResend) {
    try {
      const { data: claimedData, error: claimError } = await supabase
        .from('opportunity_applications')
        .update({ acceptance_email_status: 'sending' })
        .eq('id', id)
        .neq('acceptance_email_status', 'sent')
        .neq('acceptance_email_status', 'sending')
        .select();

      // Only abort if column exists and 0 rows were updated (meaning another thread claimed it)
      if (claimError) {
        if (claimError.code !== 'PGRST204') {
          console.warn('[ACCEPTANCE EMAIL] Database claim note:', claimError.message);
        }
      } else if (claimedData && claimedData.length === 0) {
        console.log(`[ACCEPTANCE EMAIL] Atomic claim check: Row already claimed by another request for App ID ${applicant_id || id}. Aborting duplicate send.`);
        return { success: true, message: 'Already claimed by another process or already sent.' };
      }
    } catch (claimEx) {
      console.warn('[ACCEPTANCE EMAIL] Database atomic claim exception note:', claimEx.message);
    }
  }

  const sender = process.env.EMAIL_FROM || 'Zenemoo <noreply@zenemoo.in>';
  const ccRecipient = process.env.EMAIL_CC || 'mr.prem2006@gmail.com';
  const subject = `Congratulations! Your Application Has Been Accepted — ${opportunity_title || 'Program Opportunity'} | ${applicant_id || 'APP-2026-ACCEPTED'}`;

  console.log(`\n====================================================`);
  console.log(`🎉 [ACCEPTANCE EMAIL] Sending candidate ACCEPTANCE email...`);
  console.log(`🎉 [ACCEPTANCE EMAIL] Applicant: ${applicant_name} <${applicant_email}>`);
  console.log(`🎉 [ACCEPTANCE EMAIL] Application ID: ${applicant_id || id}`);
  console.log(`====================================================`);

  const sentAtIso = new Date().toISOString();
  const htmlContent = generateApplicationAcceptanceHtml({
    ...appData,
    acceptance_email_sent_at: sentAtIso,
  });

  try {
    const result = await sendMailViaBrevo({
      sender,
      recipients: applicant_email,
      cc: ccRecipient,
      subject,
      html: htmlContent,
    });

    console.log(`🎉 [ACCEPTANCE EMAIL] SUCCESS: Acceptance email delivered! Message ID: ${result.messageId || 'N/A'}`);

    // Update database record with definitive 'sent' state and metadata
    if (id) {
      try {
        await supabase.from('opportunity_applications').update({
          acceptance_email_status: 'sent',
          acceptance_email_sent_at: sentAtIso,
          acceptance_email_message_id: result.messageId || '',
          acceptance_email_error: null,
          email_status: 'sent',
        }).eq('id', id);
      } catch (_) {
        try {
          await supabase.from('opportunity_applications').update({
            email_status: 'sent',
          }).eq('id', id);
        } catch (_) {}
      }
    }

    return { ...result, success: true, messageId: result.messageId };
  } catch (err) {
    console.error(`💥 [ACCEPTANCE EMAIL] FAILED for ${applicant_email} (App ID: ${applicant_id || id}): ${err.message}`);

    if (id) {
      try {
        await supabase.from('opportunity_applications').update({
          acceptance_email_status: 'failed',
          acceptance_email_error: err.message || 'Email delivery failed',
          email_status: 'failed',
        }).eq('id', id);
      } catch (_) {
        try {
          await supabase.from('opportunity_applications').update({
            email_status: 'failed',
          }).eq('id', id);
        } catch (_) {}
      }
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

    console.log(`📥 Candidate application processed: App ID = ${savedRecord.applicant_id} | Email = ${cleanEmail}`);

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

    // Asynchronously dispatch Confirmation Email to applicant (non-blocking / fail-safe)
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

// 4. MANUAL RESEND ACCEPTANCE EMAIL ENDPOINT (ADMIN EXPLICIT RETRY)
export const resendAcceptanceEmailEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    const { data: appRecord, error } = await supabase.from('opportunity_applications').select('*').eq('id', id).single();
    if (error || !appRecord) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    // Force resend explicit administrative action
    const result = await sendApplicationAcceptanceEmail(appRecord, true);
    return res.json({
      status: result.success !== false ? 'success' : 'failed',
      message: result.error ? `Acceptance email resend failed: ${result.error}` : 'Acceptance email resent successfully.',
      result,
    });
  } catch (err) {
    console.error('resendAcceptanceEmailEndpoint exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 5. UPDATE APPLICATION STATUS OR ADMIN NOTES WITH TRANSITION-BASED ACCEPTANCE EMAIL DISPATCH
export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    // Fetch existing application record before applying update to detect status transition
    const { data: existingData } = await supabase.from('opportunity_applications').select('*').eq('id', id);
    const existingRecord = existingData && existingData.length > 0 ? existingData[0] : null;

    const oldStatus = (existingRecord?.status || '').toLowerCase();
    const newStatus = (req.body.status || '').toLowerCase();

    // Check if status is transitioning to ACCEPTED
    const isTransitionToAccepted = oldStatus !== 'accepted' && newStatus === 'accepted';

    const { data, error } = await supabase
      .from('opportunity_applications')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update application error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const updatedRecord = data[0] || { id, ...updates };

    // Sync updated status to Google Sheets row asynchronously
    if (updatedRecord) {
      syncApplicationToGoogleSheet(updatedRecord).catch((err) => {
        console.warn('[Google Sheets Status Update Note]:', err.message);
      });
    }

    // IDEMPOTENT TRIGGER: If transitioning to ACCEPTED, trigger acceptance email
    if (isTransitionToAccepted && updatedRecord) {
      try {
        const emailResult = await sendApplicationAcceptanceEmail(updatedRecord);
        if (emailResult && emailResult.success !== false) {
          updatedRecord.acceptance_email_status = 'sent';
          updatedRecord.email_status = 'sent';
          updatedRecord.acceptance_email_sent_at = new Date().toISOString();
        } else if (emailResult && emailResult.error) {
          updatedRecord.acceptance_email_status = 'failed';
          updatedRecord.email_status = 'failed';
          updatedRecord.acceptance_email_error = emailResult.error;
        }
      } catch (err) {
        console.warn('[Application Acceptance Email Trigger Note]:', err.message);
      }
    }

    return res.json({ status: 'success', data: updatedRecord });
  } catch (err) {
    console.error('updateApplication controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 6. DELETE APPLICATION
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

// 7. MANUAL RESYNC SINGLE APPLICATION TO GOOGLE SHEETS
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

// 8. BULK RESYNC ALL APPLICATIONS FOR AN OPPORTUNITY TO GOOGLE SHEETS
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
