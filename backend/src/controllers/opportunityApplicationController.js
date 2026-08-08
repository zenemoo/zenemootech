import { supabase } from '../config/supabase.js';
import { sendApplicationNotification } from '../services/telegramNotificationService.js';
import { syncApplicationToGoogleSheet } from '../services/googleSheetsService.js';

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

    const generatedApplicantId = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

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
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('opportunity_applications').insert([newRecord]).select();

    if (error) {
      console.error('Supabase insert application error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const savedRecord = data[0];

    // Asynchronously trigger Google Sheets synchronization (non-blocking)
    syncApplicationToGoogleSheet(savedRecord).catch((err) => {
      console.warn('[Google Sheets Post-Submit Sync Note]:', err.message);
    });

    // Asynchronously dispatch Telegram notification to administrators (non-blocking)
    sendApplicationNotification({
      applicant_name,
      applicant_email,
      applicant_phone,
      opportunity_title: opportunity_title || 'Program Opportunity',
      qualification: answers?.qualification || answers?.degree || 'Relevant Qualification Uploaded',
    }).catch((err) => console.warn('[Telegram Application Notification Note]', err.message));

    return res.status(201).json({ status: 'success', data: savedRecord });
  } catch (err) {
    console.error('submitApplication controller exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// 3. UPDATE APPLICATION STATUS OR ADMIN NOTES
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

// 4. DELETE APPLICATION
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

// 5. MANUAL RESYNC SINGLE APPLICATION TO GOOGLE SHEETS
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

// 6. BULK RESYNC ALL APPLICATIONS FOR AN OPPORTUNITY TO GOOGLE SHEETS
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
