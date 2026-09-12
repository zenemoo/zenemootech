import { supabase } from '../config/supabase.js';
import { googleAppsScriptService } from '../services/googleAppsScriptService.js';

/**
 * Standard RFC-compliant email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes, sanitizes, and validates an email string
 * @param {string|null|undefined} rawEmail
 * @returns {string|null} normalized email or null if invalid
 */
export const normalizeAndValidateEmail = (rawEmail) => {
  if (!rawEmail || typeof rawEmail !== 'string') return null;

  // 1. Trim whitespace and convert to lowercase
  let clean = rawEmail.trim().toLowerCase();

  // 2. Strip enclosing quotes, angle brackets, parentheses, square brackets or trailing punctuation
  clean = clean.replace(/^["'<(\[]+|["'>)\],.]+$/g, '').trim();

  // 3. Minimum length check & RFC Regex validation
  if (!clean || clean.length < 5 || clean.length > 254) return null;
  if (!EMAIL_REGEX.test(clean)) return null;

  // 4. Reject obvious test/placeholder domains
  const parts = clean.split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1];
  if (['example.com', 'test.com', 'localhost', 'invalid'].includes(domain)) {
    return null;
  }

  return clean;
};

/**
 * Safely adds an email value into the accumulator Set
 */
const addEmailToSet = (emailSet, emailValue, sourceName, breakdownCounts) => {
  const normalized = normalizeAndValidateEmail(emailValue);
  if (normalized) {
    const beforeSize = emailSet.size;
    emailSet.add(normalized);
    if (breakdownCounts && breakdownCounts[sourceName] !== undefined) {
      breakdownCounts[sourceName].totalProcessed++;
      if (emailSet.size > beforeSize) {
        breakdownCounts[sourceName].uniqueAdded++;
      }
    }
  }
};

/**
 * Core query engine: Aggregates eligible community emails with explicit column selection only.
 * Guaranteed zero SELECT-ALL full-table wildcards.
 */
export const fetchEligibleEmailsFromSupabase = async () => {
  const emailSet = new Set();
  const sourceBreakdown = {
    subscribers: { totalProcessed: 0, uniqueAdded: 0 },
    talent_registrations: { totalProcessed: 0, uniqueAdded: 0 },
    opportunity_applications: { totalProcessed: 0, uniqueAdded: 0 },
    call_bookings: { totalProcessed: 0, uniqueAdded: 0 },
    contacts: { totalProcessed: 0, uniqueAdded: 0 },
    talent_team_members: { totalProcessed: 0, uniqueAdded: 0 },
    support_tickets: { totalProcessed: 0, uniqueAdded: 0 },
    support_payments: { totalProcessed: 0, uniqueAdded: 0 },
  };

  if (!supabase) {
    return { emailSet, sourceBreakdown, error: 'Supabase client not initialized' };
  }

  const [
    subscribersRes,
    talentRes,
    applicationsRes,
    bookingsRes,
    contactsRes,
    talentTeamRes,
    supportTicketsRes,
    supportPaymentsRes,
  ] = await Promise.allSettled([
    supabase.from('subscribers').select('email').neq('status', 'unsubscribed'),
    supabase.from('talent_registrations').select('email').eq('is_archived', false).neq('status', 'banned').neq('status', 'rejected'),
    supabase.from('opportunity_applications').select('applicant_email, referrer_email').neq('status', 'rejected'),
    supabase.from('call_bookings').select('email').neq('status', 'cancelled').neq('status', 'no_show'),
    supabase.from('contacts').select('email'),
    supabase.from('talent_team_members').select('email').neq('status', 'inactive'),
    supabase.from('support_tickets').select('user_email'),
    supabase.from('support_payments').select('customer_email').eq('status', 'SUCCESS'),
  ]);

  if (subscribersRes.status === 'fulfilled' && subscribersRes.value?.data) {
    for (const row of subscribersRes.value.data) addEmailToSet(emailSet, row.email, 'subscribers', sourceBreakdown);
  }
  if (talentRes.status === 'fulfilled' && talentRes.value?.data) {
    for (const row of talentRes.value.data) addEmailToSet(emailSet, row.email, 'talent_registrations', sourceBreakdown);
  }
  if (applicationsRes.status === 'fulfilled' && applicationsRes.value?.data) {
    for (const row of applicationsRes.value.data) {
      if (row.applicant_email) addEmailToSet(emailSet, row.applicant_email, 'opportunity_applications', sourceBreakdown);
      if (row.referrer_email) addEmailToSet(emailSet, row.referrer_email, 'opportunity_applications', sourceBreakdown);
    }
  }
  if (bookingsRes.status === 'fulfilled' && bookingsRes.value?.data) {
    for (const row of bookingsRes.value.data) addEmailToSet(emailSet, row.email, 'call_bookings', sourceBreakdown);
  }
  if (contactsRes.status === 'fulfilled' && contactsRes.value?.data) {
    for (const row of contactsRes.value.data) addEmailToSet(emailSet, row.email, 'contacts', sourceBreakdown);
  }
  if (talentTeamRes.status === 'fulfilled' && talentTeamRes.value?.data) {
    for (const row of talentTeamRes.value.data) addEmailToSet(emailSet, row.email, 'talent_team_members', sourceBreakdown);
  }
  if (supportTicketsRes.status === 'fulfilled' && supportTicketsRes.value?.data) {
    for (const row of supportTicketsRes.value.data) addEmailToSet(emailSet, row.user_email, 'support_tickets', sourceBreakdown);
  }
  if (supportPaymentsRes.status === 'fulfilled' && supportPaymentsRes.value?.data) {
    for (const row of supportPaymentsRes.value.data) addEmailToSet(emailSet, row.customer_email, 'support_payments', sourceBreakdown);
  }

  return { emailSet, sourceBreakdown };
};

/**
 * GET /api/admin/google-group/eligible-emails
 * Simple payload for Google Apps Script pull integration
 */
export const getEligibleCommunityEmails = async (req, res, next) => {
  try {
    const targetGroupEmail = process.env.GOOGLE_GROUP_EMAIL || 'zenemoocommunity@googlegroups.com';
    const { emailSet, sourceBreakdown, error } = await fetchEligibleEmailsFromSupabase();

    if (error) {
      return res.status(503).json({ success: false, message: error });
    }

    const sortedEmails = Array.from(emailSet).sort();

    return res.status(200).json({
      success: true,
      groupEmail: targetGroupEmail,
      totalUnique: sortedEmails.length,
      emails: sortedEmails,
      breakdown: req.query.debug === 'true' ? sourceBreakdown : undefined,
    });
  } catch (err) {
    console.error('getEligibleCommunityEmails error:', err);
    next(err);
  }
};

/**
 * GET /api/admin/google-group/overview
 * Comprehensive dashboard metrics endpoint for Admin Panel
 */
export const getGoogleGroupOverview = async (req, res, next) => {
  try {
    const targetGroupEmail = process.env.GOOGLE_GROUP_EMAIL || 'zenemoocommunity@googlegroups.com';

    // 1. Fetch Supabase eligible emails in parallel with Google Group live members
    const [supabaseResult, appsScriptResult] = await Promise.all([
      fetchEligibleEmailsFromSupabase(),
      googleAppsScriptService.getGoogleGroupMembers(targetGroupEmail),
    ]);

    const eligibleEmailSet = supabaseResult.emailSet || new Set();
    const groupMembers = Array.isArray(appsScriptResult.members) ? appsScriptResult.members : [];
    const groupMemberEmailSet = new Set(groupMembers.map((m) => m.email.toLowerCase()));

    // 2. Compute intersection (synced) and diff (pending)
    let syncedCount = 0;
    for (const email of eligibleEmailSet) {
      if (groupMemberEmailSet.has(email)) {
        syncedCount++;
      }
    }

    const totalEligible = eligibleEmailSet.size;
    const groupMemberCount = groupMembers.length;
    const pendingSyncCount = Math.max(0, totalEligible - syncedCount);
    const externalMemberCount = Math.max(0, groupMemberCount - syncedCount);

    // 3. Determine connection status
    let connectionStatus = 'ONLINE';
    if (!appsScriptResult.success) {
      connectionStatus = appsScriptResult.message?.includes('not configured') ? 'NOT_CONFIGURED' : 'DISCONNECTED';
    }

    return res.status(200).json({
      success: true,
      targetGroupEmail,
      connectionStatus,
      totalEligible,
      groupMemberCount,
      syncedCount,
      pendingSyncCount,
      externalMemberCount,
      sourceBreakdown: supabaseResult.sourceBreakdown,
      lastCheckTime: new Date().toISOString(),
      appsScriptMessage: appsScriptResult.message || null,
    });
  } catch (err) {
    console.error('getGoogleGroupOverview error:', err);
    next(err);
  }
};

/**
 * GET /api/admin/google-group/members
 * Searchable, tagged member list endpoint for Admin Panel
 */
export const getGoogleGroupMembers = async (req, res, next) => {
  try {
    const targetGroupEmail = process.env.GOOGLE_GROUP_EMAIL || 'zenemoocommunity@googlegroups.com';

    const [supabaseResult, appsScriptResult] = await Promise.all([
      fetchEligibleEmailsFromSupabase(),
      googleAppsScriptService.getGoogleGroupMembers(targetGroupEmail),
    ]);

    const eligibleEmailSet = supabaseResult.emailSet || new Set();
    const rawMembers = Array.isArray(appsScriptResult.members) ? appsScriptResult.members : [];

    // Tag each member with sync origin
    const enrichedMembers = rawMembers.map((m) => ({
      id: m.id || null,
      email: m.email,
      role: m.role || 'MEMBER',
      type: m.type || 'USER',
      status: m.status || 'ACTIVE',
      deliverySettings: m.deliverySettings || 'ALL_MAIL',
      isSupabaseEligible: eligibleEmailSet.has(m.email.toLowerCase()),
    }));

    return res.status(200).json({
      success: true,
      targetGroupEmail,
      count: enrichedMembers.length,
      members: enrichedMembers,
      connected: appsScriptResult.success,
    });
  } catch (err) {
    console.error('getGoogleGroupMembers error:', err);
    next(err);
  }
};

/**
 * POST /api/admin/google-group/sync
 * Triggers interactive differential sync from Admin Panel
 */
export const triggerGoogleGroupSync = async (req, res, next) => {
  try {
    const targetGroupEmail = process.env.GOOGLE_GROUP_EMAIL || 'zenemoocommunity@googlegroups.com';

    // 1. Fetch current database emails and current group members
    const [supabaseResult, appsScriptMembersResult] = await Promise.all([
      fetchEligibleEmailsFromSupabase(),
      googleAppsScriptService.getGoogleGroupMembers(targetGroupEmail),
    ]);

    const eligibleEmailSet = supabaseResult.emailSet || new Set();
    const existingGroupMembers = Array.isArray(appsScriptMembersResult.members) ? appsScriptMembersResult.members : [];
    const existingGroupEmailSet = new Set(existingGroupMembers.map((m) => m.email.toLowerCase()));

    // 2. Identify missing candidates
    const missingCandidates = [];
    for (const email of eligibleEmailSet) {
      if (!existingGroupEmailSet.has(email)) {
        missingCandidates.push(email);
      }
    }

    if (missingCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Google Group is already 100% up-to-date with Supabase community records.',
        totalEligible: eligibleEmailSet.size,
        alreadySynced: existingGroupMembers.length,
        addedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
      });
    }

    // 3. Dispatch batch addition to Google Apps Script
    const syncResult = await googleAppsScriptService.syncGoogleGroupMembers(targetGroupEmail, missingCandidates);

    // 4. Log Admin Audit record
    try {
      if (supabase) {
        await supabase.from('admin_audit_logs').insert([{
          event_type: 'GOOGLE_GROUP_SYNC',
          email: req.user?.email || 'admin@zenemoo.in',
          ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
          user_agent: req.headers['user-agent'] || 'admin_dashboard',
          details: {
            groupEmail: targetGroupEmail,
            totalEligible: eligibleEmailSet.size,
            missingCandidates: missingCandidates.length,
            addedCount: syncResult.addedCount || 0,
            skippedCount: syncResult.skippedCount || 0,
            failedCount: syncResult.failedCount || 0,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (auditErr) {
      console.warn('[Google Group Audit Log Warning]:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Sync complete: Added ${syncResult.addedCount || 0} new member(s).`,
      totalEligible: eligibleEmailSet.size,
      missingCount: missingCandidates.length,
      addedCount: syncResult.addedCount || 0,
      skippedCount: syncResult.skippedCount || 0,
      failedCount: syncResult.failedCount || 0,
      errors: syncResult.errors || [],
    });
  } catch (err) {
    console.error('triggerGoogleGroupSync error:', err);
    next(err);
  }
};

/**
 * DELETE /api/admin/google-group/members/:email
 * Explicitly removes a single member from the Google Group upon admin confirmation
 */
export const removeGoogleGroupMember = async (req, res, next) => {
  try {
    const targetGroupEmail = process.env.GOOGLE_GROUP_EMAIL || 'zenemoocommunity@googlegroups.com';
    const targetEmail = normalizeAndValidateEmail(req.params.email || req.body.email);

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required to remove a group member.',
      });
    }

    // Command Google Apps Script to delete member
    const result = await googleAppsScriptService.removeGoogleGroupMember(targetGroupEmail, targetEmail);

    if (!result || result.success === false) {
      return res.status(500).json({
        success: false,
        message: result?.message || `Failed to remove ${targetEmail} from Google Group`,
      });
    }

    // Log Admin Audit record
    try {
      if (supabase) {
        await supabase.from('admin_audit_logs').insert([{
          event_type: 'GOOGLE_GROUP_MEMBER_REMOVED',
          email: req.user?.email || 'admin@zenemoo.in',
          ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
          user_agent: req.headers['user-agent'] || 'admin_dashboard',
          details: {
            groupEmail: targetGroupEmail,
            removedMemberEmail: targetEmail,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (auditErr) {
      console.warn('[Google Group Audit Log Warning]:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully removed ${targetEmail} from ${targetGroupEmail}`,
      email: targetEmail,
    });
  } catch (err) {
    console.error('removeGoogleGroupMember error:', err);
    next(err);
  }
};
