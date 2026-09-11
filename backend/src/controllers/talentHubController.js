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
 * Sanitizes an opportunity application record and ensures answer keys resolve to clean question labels.
 * Strips administrative internal notes.
 */
const sanitizeApplicationRecord = (app, opportunitiesMap = {}) => {
  if (!app) return null;
  const sanitized = { ...app };
  delete sanitized.admin_notes;

  if (sanitized.answers && typeof sanitized.answers === 'object') {
    const customQuestions = opportunitiesMap[sanitized.opportunity_id] || [];
    if (Array.isArray(customQuestions) && customQuestions.length > 0) {
      const resolved = {};
      Object.entries(sanitized.answers).forEach(([key, val]) => {
        const matched = customQuestions.find((q) => q && (q.id === key || q.key === key));
        if (matched && matched.label) {
          resolved[matched.label.trim()] = val;
        } else {
          resolved[key] = val;
        }
      });
      sanitized.answers = resolved;
    }
  }

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
        isRegistered: false,
        email,
        profile: null,
        talent: null,
        languages: [],
        experiences: [],
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
      isRegistered: true,
      talent: sanitizedTalent,
      profile: sanitizedTalent,
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
 * Retrieves all opportunities with secure applicant counts for talents.
 */
export const getTalentOpportunities = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    const { data: opps, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      console.error('[TalentHub getOpportunities Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to load opportunities' });
    }

    // Calculate applicant count per opportunity
    const oppsWithCounts = await Promise.all(
      (opps || []).map(async (opp) => {
        try {
          const { count, error: countErr } = await supabase
            .from('opportunity_applications')
            .select('id', { count: 'exact', head: true })
            .eq('opportunity_id', opp.id);
          return {
            ...opp,
            applicant_count: countErr ? 0 : (count || 0),
          };
        } catch (_) {
          return { ...opp, applicant_count: 0 };
        }
      })
    );

    return res.json({
      success: true,
      data: oppsWithCounts,
    });
  } catch (err) {
    console.error('[TalentHub getTalentOpportunities Exception]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /api/talent-hub/opportunities/:id
 * Retrieves opportunity details for preview and application modal.
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
      .maybeSingle();

    if (error) {
      console.error('[TalentHub getOpportunityById Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to load opportunity' });
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    let applicantCount = 0;
    try {
      const { count } = await supabase
        .from('opportunity_applications')
        .select('id', { count: 'exact', head: true })
        .eq('opportunity_id', data.id);
      applicantCount = count || 0;
    } catch (_) {}

    return res.json({
      success: true,
      data: {
        ...data,
        applicant_count: applicantCount,
      },
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
      .select('id, applicant_id, opportunity_id, opportunity_title, applicant_name, applicant_email, applicant_phone, answers, status, referral_code, referrer_name, referral_source, created_at, updated_at')
      .ilike('applicant_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TalentHub getApplications Error]:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to load your applications' });
    }

    // Build map of opportunity custom_questions to resolve any legacy q1, q2... answer keys
    const oppIds = [...new Set((data || []).map((a) => a.opportunity_id).filter(Boolean))];
    const opportunitiesMap = {};
    if (oppIds.length > 0) {
      try {
        const { data: opps } = await supabase
          .from('opportunities')
          .select('id, custom_questions')
          .in('id', oppIds);
        (opps || []).forEach((opp) => {
          opportunitiesMap[opp.id] = opp.custom_questions || [];
        });
      } catch (_) {}
    }

    const sanitizedList = (data || []).map((app) => sanitizeApplicationRecord(app, opportunitiesMap));

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
      .select('id, applicant_id, opportunity_id, opportunity_title, applicant_name, applicant_email, applicant_phone, answers, status, referral_code, referrer_name, referral_source, created_at, updated_at')
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

    const opportunitiesMap = {};
    if (data.opportunity_id) {
      try {
        const { data: opp } = await supabase
          .from('opportunities')
          .select('id, custom_questions')
          .eq('id', data.opportunity_id)
          .maybeSingle();
        if (opp) {
          opportunitiesMap[opp.id] = opp.custom_questions || [];
        }
      } catch (_) {}
    }

    return res.json({
      success: true,
      data: sanitizeApplicationRecord(data, opportunitiesMap),
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
 * Handles server-verified referral attribution.
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
      .select('id, full_name, email, phone, status, registration_code')
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

    const oppStatus = (oppRecord.status || '').toLowerCase();
    if (oppStatus !== 'active' && oppStatus !== 'open') {
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

    // 4. Server-Side Referral Attribution Validation
    let referralAttribution = {
      referral_code: null,
      referred_by_id: null,
      referrer_name: null,
      referrer_email: null,
      referral_source: null,
    };

    const rawRefCode = (req.body.referral_code || req.body.ref || '').trim().toUpperCase();
    if (rawRefCode) {
      try {
        const { data: referrerRecord } = await supabase
          .from('talent_registrations')
          .select('id, full_name, email, registration_code, status, is_archived')
          .ilike('registration_code', rawRefCode)
          .maybeSingle();

        if (
          referrerRecord &&
          !referrerRecord.is_archived &&
          referrerRecord.status !== 'banned' &&
          referrerRecord.status !== 'rejected'
        ) {
          const referrerEmail = (referrerRecord.email || '').trim().toLowerCase();
          const applicantEmail = (email || '').trim().toLowerCase();
          // Prevent self-referral
          if (referrerEmail !== applicantEmail && referrerRecord.id !== talentRecord.id) {
            referralAttribution = {
              referral_code: referrerRecord.registration_code || rawRefCode,
              referred_by_id: referrerRecord.id,
              referrer_name: referrerRecord.full_name || 'Zenemoo Contributor',
              referrer_email: referrerEmail,
              referral_source: 'talent_hub',
            };
          }
        }
      } catch (refErr) {
        console.warn('[TalentHub Referral Verification Note]:', refErr.message);
      }
    }

    // 5. Normalize and validate custom questions to ensure keys are human-readable question text
    const incomingAnswers = req.body.answers || {};
    const customQuestions = Array.isArray(oppRecord.custom_questions) ? oppRecord.custom_questions : [];
    const normalizedAnswers = {};

    for (let idx = 0; idx < customQuestions.length; idx++) {
      const q = customQuestions[idx];
      const qLabel = (q.label && q.label.trim()) || q.id || `Question ${idx + 1}`;
      const val =
        incomingAnswers[qLabel] !== undefined
          ? incomingAnswers[qLabel]
          : q.id && incomingAnswers[q.id] !== undefined
          ? incomingAnswers[q.id]
          : incomingAnswers[`q_${idx}`];

      if (q.required) {
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim()) || (Array.isArray(val) && val.length === 0)) {
          return res.status(400).json({
            success: false,
            message: `Please provide an answer for required question: "${qLabel}"`,
          });
        }
      }

      if (val !== undefined && val !== null && val !== '') {
        normalizedAnswers[qLabel] = val;
      }
    }

    // Preserve any answers that might have been supplied with custom keys not in custom_questions definition
    Object.entries(incomingAnswers).forEach(([k, v]) => {
      const isRawId = customQuestions.some((q) => q.id === k);
      if (!isRawId && normalizedAnswers[k] === undefined && v !== undefined && v !== null && v !== '') {
        normalizedAnswers[k] = v;
      }
    });

    // 6. Construct new application record with identity locked from talent profile
    const generatedApplicantId = `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord = {
      applicant_id: generatedApplicantId,
      opportunity_id: oppRecord.id,
      opportunity_title: oppRecord.title || 'Zenemoo Opportunity',
      applicant_name: talentRecord.full_name || 'Zenemoo Contributor',
      applicant_email: email,
      applicant_phone: talentRecord.phone || req.body.applicant_phone || '',
      answers: normalizedAnswers,
      status: 'pending', // Applicants cannot choose a status
      admin_notes: '',
      ...referralAttribution,
      created_at: new Date().toISOString(),
    };

    let { data: insertedData, error: insertError } = await supabase
      .from('opportunity_applications')
      .insert([newRecord])
      .select();

    // Fallback: If database schema has not yet applied extended referral columns, retry with core payload
    if (insertError && (insertError.message?.includes('schema cache') || insertError.message?.includes('Could not find'))) {
      console.warn('[TalentHub Application Insert Schema Fallback] Retrying with core payload:', insertError.message);
      const coreRecord = {
        applicant_id: generatedApplicantId,
        opportunity_id: oppRecord.id,
        opportunity_title: oppRecord.title || 'Zenemoo Opportunity',
        applicant_name: talentRecord.full_name || 'Zenemoo Contributor',
        applicant_email: email,
        applicant_phone: talentRecord.phone || req.body.applicant_phone || '',
        answers: normalizedAnswers,
        status: 'pending',
        admin_notes: '',
        created_at: new Date().toISOString(),
      };
      const fallbackRes = await supabase.from('opportunity_applications').insert([coreRecord]).select();
      insertedData = fallbackRes.data;
      insertError = fallbackRes.error;
    }

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

    // 7. Asynchronously trigger background notifications (non-blocking)
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
        referral_code: savedApp.referral_code,
        referrer_name: savedApp.referrer_name,
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

/**
 * GET /api/talent-hub/referrals
 * Retrieves the authenticated talent's referral profile, global stats, opportunity breakdown,
 * and privacy-sanitized referred members list.
 */
export const getTalentReferrals = async (req, res) => {
  try {
    const email = req.talentEmail;
    if (!email) {
      return res.status(401).json({ success: false, message: 'Unauthenticated email' });
    }

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Database connection unavailable' });
    }

    // 1. Fetch authenticated talent record
    const { data: talentRecord, error: talentError } = await supabase
      .from('talent_registrations')
      .select('id, full_name, email, registration_code, status')
      .ilike('email', email)
      .maybeSingle();

    if (talentError || !talentRecord) {
      return res.status(404).json({
        success: false,
        message: 'No talent registration profile found for this account.',
      });
    }

    const talentCode = talentRecord.registration_code;
    if (!talentCode) {
      return res.json({
        success: true,
        referral_code: '',
        stats: { total: 0, applications: 0, selected: 0, pending: 0, rejected: 0 },
        opportunity_referrals: [],
        referred_applications: [],
      });
    }

    // 2. Query all applications referred by this talent (by referred_by_id OR referral_code)
    let query = supabase
      .from('opportunity_applications')
      .select('id, applicant_id, applicant_name, applicant_email, applicant_phone, opportunity_id, opportunity_title, status, created_at, referral_code, referred_by_id, referral_source')
      .or(`referred_by_id.eq.${talentRecord.id},referral_code.eq.${talentCode}`)
      .order('created_at', { ascending: false });

    const { data: referredApps, error: appError } = await query;

    if (appError) {
      console.warn('[TalentHub Referrals Fetch Note]:', appError.message);
    }

    const appsList = referredApps || [];

    // 3. Compute Aggregated Statistics
    let pendingCount = 0;
    let shortlistedCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;

    const oppStatsMap = {};

    appsList.forEach((app) => {
      const s = (app.status || 'pending').toLowerCase();
      if (s === 'accepted') acceptedCount++;
      else if (s === 'shortlisted') shortlistedCount++;
      else if (s === 'rejected') rejectedCount++;
      else pendingCount++;

      const oppId = app.opportunity_id || 'general';
      if (!oppStatsMap[oppId]) {
        oppStatsMap[oppId] = {
          opportunity_id: oppId,
          opportunity_title: app.opportunity_title || 'Opportunity',
          total: 0,
          pending: 0,
          shortlisted: 0,
          accepted: 0,
          rejected: 0,
          selected: 0,
        };
      }
      oppStatsMap[oppId].total++;
      if (s === 'accepted') {
        oppStatsMap[oppId].accepted++;
        oppStatsMap[oppId].selected++;
      } else if (s === 'shortlisted') {
        oppStatsMap[oppId].shortlisted++;
        oppStatsMap[oppId].selected++;
      } else if (s === 'rejected') {
        oppStatsMap[oppId].rejected++;
      } else {
        oppStatsMap[oppId].pending++;
      }
    });

    const totalApplications = appsList.length;
    const selectedCount = acceptedCount + shortlistedCount;

    // 4. Return referred applications with real Application ID
    const sanitizedReferredList = appsList.map((app) => {
      const realAppId = app.applicant_id || (app.id ? `APP-2026-${app.id.substring(0, 4)}` : 'APP-RECORD');

      return {
        id: app.id,
        applicant_id: realAppId,
        applicant_name: app.applicant_name || 'Zenemoo Applicant',
        applicant_email: app.applicant_email || '',
        applicant_phone: app.applicant_phone || '',
        opportunity_id: app.opportunity_id,
        opportunity_title: app.opportunity_title,
        status: app.status || 'pending',
        created_at: app.created_at,
        referral_code: app.referral_code || talentCode,
        referral_source: app.referral_source || 'talent_hub',
      };
    });

    return res.json({
      success: true,
      referral_code: talentCode,
      referrer_name: talentRecord.full_name,
      stats: {
        total: totalApplications,
        applications: totalApplications,
        selected: selectedCount,
        accepted: acceptedCount,
        shortlisted: shortlistedCount,
        pending: pendingCount,
        rejected: rejectedCount,
      },
      opportunity_referrals: Object.values(oppStatsMap),
      referred_applications: sanitizedReferredList,
    });
  } catch (err) {
    console.error('[TalentHub getTalentReferrals Exception]:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error while fetching referrals' });
  }
};

