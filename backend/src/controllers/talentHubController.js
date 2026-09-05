import { supabase } from '../config/supabase.js';
import { sendApplicationNotification } from '../services/telegramNotificationService.js';
import { syncApplicationToGoogleSheet } from '../services/googleSheetsService.js';
import { sendApplicationConfirmationEmail } from './opportunityApplicationController.js';

/**
 * Sanitizes a talent registration record for user-facing exposure.
 * Strips all internal admin notes, scoring, and sensitive administrative fields.
 */
const sanitizeTalentRecord = (talent) => {
  if (!talent) return null;
  const sanitized = { ...talent };
  delete sanitized.internal_notes;
  delete sanitized.internal_scoring;
  delete sanitized.talent_admin_notes;
  return sanitized;
};

/**
 * Sanitizes an opportunity application record.
 * Strips administrative internal notes.
 */
const sanitizeApplicationRecord = (app) => {
  if (!app) return null;
  const sanitized = { ...app };
  delete sanitized.admin_notes;
  return sanitized;
};

/**
 * GET /api/talent-hub/me
 * Retrieves the authenticated talent's registered profile, languages, and experiences.
 */
export const getTalentProfile = async (req, res) => {
  try {
    const email = req.talentEmail;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Unauthenticated email' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    // Query talent_registrations matching normalized email
    const { data: talentRecord, error: talentError } = await supabase
      .from('talent_registrations')
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (talentError) {
      console.error('[TalentHub Profile Fetch Error]:', talentError.message);
      return res.status(500).json({ success: false, message: 'Failed to retrieve profile data' });
    }

    if (!talentRecord) {
      // Authenticated via Google, but not registered in Zenemoo talent database
      return res.json({
        success: true,
        registered: false,
        email,
        message: 'No Zenemoo talent registration found for this Google account',
      });
    }

    // Fetch related languages and experiences
    const [langRes, expRes] = await Promise.all([
      supabase
        .from('talent_languages')
        .select('id, language, proficiency, speaker_availability, capacity, created_at')
        .eq('registration_id', talentRecord.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('talent_experiences')
        .select('id, project_company_name, type_of_work, languages_used, work_volume, duration, description, created_at')
        .eq('registration_id', talentRecord.id)
        .order('created_at', { ascending: true }),
    ]);

    const sanitizedTalent = sanitizeTalentRecord(talentRecord);

    return res.json({
      success: true,
      registered: true,
      talent: sanitizedTalent,
      languages: langRes.data || [],
      experiences: expRes.data || [],
    });
  } catch (err) {
    console.error('[TalentHub getTalentProfile Exception]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/talent-hub/opportunities
 * Retrieves all currently active opportunities for talents.
 */
export const getTalentOpportunities = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('status', 'active')
      .order('position', { ascending: true });

    if (error) {
      console.error('[TalentHub getOpportunities Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to load opportunities' });
    }

    return res.json({
      success: true,
      data: data || [],
    });
  } catch (err) {
    console.error('[TalentHub getTalentOpportunities Exception]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/talent-hub/opportunities/:id
 * Retrieves details of a specific active opportunity.
 */
export const getTalentOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Opportunity ID is required' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('[TalentHub getOpportunityById Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to load opportunity' });
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'Opportunity not found or no longer active' });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('[TalentHub getTalentOpportunityById Exception]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/talent-hub/applications
 * Retrieves only the applications submitted by the authenticated talent.
 */
export const getTalentApplications = async (req, res) => {
  try {
    const email = req.talentEmail;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Unauthenticated email' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    const { data, error } = await supabase
      .from('opportunity_applications')
      .select('id, applicant_id, opportunity_id, opportunity_title, applicant_name, applicant_email, applicant_phone, answers, status, created_at, updated_at')
      .ilike('applicant_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TalentHub getApplications Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to load your applications' });
    }

    const sanitizedList = (data || []).map(sanitizeApplicationRecord);

    return res.json({
      success: true,
      data: sanitizedList,
    });
  } catch (err) {
    console.error('[TalentHub getTalentApplications Exception]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/talent-hub/applications/:id
 * Retrieves a single application owned by the authenticated talent.
 * Strictly prevents IDOR by verifying applicant_email ownership.
 */
export const getTalentApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.talentEmail;

    if (!id || !email) {
      return res.status(400).json({ success: false, message: 'Invalid application request' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    const { data, error } = await supabase
      .from('opportunity_applications')
      .select('id, applicant_id, opportunity_id, opportunity_title, applicant_name, applicant_email, applicant_phone, answers, status, created_at, updated_at')
      .eq('id', id)
      .ilike('applicant_email', email)
      .maybeSingle();

    if (error) {
      console.error('[TalentHub getApplicationById Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to load application' });
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'Application not found or unauthorized' });
    }

    return res.json({
      success: true,
      data: sanitizeApplicationRecord(data),
    });
  } catch (err) {
    console.error('[TalentHub getTalentApplicationById Exception]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * POST /api/talent-hub/opportunities/:id/apply
 * Submits an opportunity application on behalf of the authenticated talent.
 * Pre-fills and locks identity from authorized talent profile.
 * Performs duplicate application check on the backend.
 */
export const submitTalentOpportunityApplication = async (req, res) => {
  try {
    const { id: opportunity_id } = req.params;
    const email = req.talentEmail;

    if (!opportunity_id || !email) {
      return res.status(400).json({ success: false, message: 'Opportunity ID and authenticated email are required' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    // 1. Verify candidate profile exists in talent_registrations
    const { data: talentRecord, error: talentError } = await supabase
      .from('talent_registrations')
      .select('id, full_name, email, phone, status')
      .ilike('email', email)
      .maybeSingle();

    if (talentError || !talentRecord) {
      return res.status(403).json({
        success: false,
        message: 'You must have a verified talent registration with Zenemoo to apply for opportunities.',
      });
    }

    // 2. Verify opportunity exists and is currently active
    const { data: oppRecord, error: oppError } = await supabase
      .from('opportunities')
      .select('id, title, status, custom_questions')
      .eq('id', opportunity_id)
      .maybeSingle();

    if (oppError || !oppRecord) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    if (oppRecord.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Applications for this opportunity are not currently open (Status: ${oppRecord.status}).`,
      });
    }

    // 3. Duplicate application protection check
    const { data: existingApps, error: dupCheckError } = await supabase
      .from('opportunity_applications')
      .select('id, applicant_id, created_at')
      .eq('opportunity_id', opportunity_id)
      .ilike('applicant_email', email)
      .limit(1);

    if (!dupCheckError && existingApps && existingApps.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_APPLICATION',
        message: 'You have already applied for this opportunity.',
      });
    }

    // 4. Validate custom questions if specified
    const answers = req.body.answers || {};
    const customQuestions = Array.isArray(oppRecord.custom_questions) ? oppRecord.custom_questions : [];
    for (const q of customQuestions) {
      if (q.required) {
        const val = answers[q.id || q.label];
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
          return res.status(400).json({
            success: false,
            message: `Please provide an answer for required question: "${q.label || q.id}"`,
          });
        }
      }
    }

    // 5. Construct new application record with identity locked from talent profile
    const generatedApplicantId = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord = {
      applicant_id: generatedApplicantId,
      opportunity_id: oppRecord.id,
      opportunity_title: oppRecord.title || 'Zenemoo Opportunity',
      applicant_name: talentRecord.full_name || 'Zenemoo Contributor',
      applicant_email: email,
      applicant_phone: talentRecord.phone || req.body.applicant_phone || '',
      answers,
      status: 'pending', // Applicants cannot choose a status
      admin_notes: '',
      created_at: new Date().toISOString(),
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('opportunity_applications')
      .insert([newRecord])
      .select();

    if (insertError) {
      if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_APPLICATION',
          message: 'You have already applied for this opportunity.',
        });
      }
      console.error('[TalentHub Application Insert Error]:', insertError.message);
      return res.status(500).json({ success: false, message: 'Failed to submit application. Please try again.' });
    }

    const savedApp = insertedData && insertedData[0] ? insertedData[0] : newRecord;

    // 6. Asynchronously trigger background notifications (non-blocking)
    try {
      sendApplicationConfirmationEmail(savedApp).catch((err) => {
        console.warn('[TalentHub Email Confirmation Note]:', err.message);
      });
      syncApplicationToGoogleSheet(savedApp, oppRecord).catch((err) => {
        console.warn('[TalentHub Google Sheet Sync Note]:', err.message);
      });
      sendApplicationNotification({
        applicant_name: savedApp.applicant_name,
        applicant_email: savedApp.applicant_email,
        applicant_phone: savedApp.applicant_phone,
        opportunity_title: savedApp.opportunity_title,
        applicant_id: savedApp.applicant_id,
      }).catch((err) => {
        console.warn('[TalentHub Telegram Alert Note]:', err.message);
      });
    } catch (notifyErr) {
      console.warn('[TalentHub Post-Submission Notifications Note]:', notifyErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully!',
      data: sanitizeApplicationRecord(savedApp),
    });
  } catch (err) {
    console.error('[TalentHub submitTalentOpportunityApplication Exception]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error while submitting application' });
  }
};
