import { supabase } from '../config/supabase.js';
import { sendApplicationNotification } from '../services/telegramNotificationService.js';

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

    const generatedApplicantId = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord = {
      applicant_id: generatedApplicantId,
      opportunity_id,
      opportunity_title: opportunity_title || 'General Opportunity',
      applicant_name,
      applicant_email,
      applicant_phone,
      answers: answers || {},
      status: 'pending',
      admin_notes: '',
    };

    const { data, error } = await supabase.from('opportunity_applications').insert([newRecord]).select();

    if (error) {
      console.error('Supabase insert application error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    // Asynchronously dispatch Telegram notification to all active administrators (non-blocking)
    sendApplicationNotification({
      applicant_name,
      applicant_email,
      applicant_phone,
      opportunity_title: opportunity_title || 'Program Opportunity',
      qualification: answers?.qualification || answers?.degree || 'Relevant Qualification Uploaded',
    }).catch((err) => console.warn('[Telegram Application Notification Note]', err.message));

    return res.status(201).json({ status: 'success', data: data[0] });
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

    return res.json({ status: 'success', data: data[0] });
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
