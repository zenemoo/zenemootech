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
 * Restricts eligibility strictly to:
 * 1. subscribers (email)
 * 2. talent_registrations (email)
 * 3. opportunity_applications (applicant_email, referrer_email)
 */
export const fetchEligibleEmailsFromSupabase = async () => {
  const emailSet = new Set();
  const emailSourcesMap = new Map(); // normalized email -> Set<string>
  const sourceBreakdown = {
    subscribers: { totalProcessed: 0, uniqueAdded: 0 },
    talent_registrations: { totalProcessed: 0, uniqueAdded: 0 },
    opportunity_applications: { totalProcessed: 0, uniqueAdded: 0 },
  };

  if (!supabase) {
    return { emailSet, emailSourcesMap, sourceBreakdown, error: 'Supabase client not initialized' };
  }

  const [
    subscribersRes,
    talentRes,
    applicationsRes,
  ] = await Promise.allSettled([
    supabase.from('subscribers').select('email').neq('status', 'unsubscribed'),
    supabase.from('talent_registrations').select('email').eq('is_archived', false).neq('status', 'banned').neq('status', 'rejected'),
    supabase.from('opportunity_applications').select('applicant_email, referrer_email').neq('status', 'rejected'),
  ]);

  const addEmailWithSource = (emailValue, sourceKey, detailedLabel) => {
    const normalized = normalizeAndValidateEmail(emailValue);
    if (normalized) {
      const beforeSize = emailSet.size;
      emailSet.add(normalized);
      if (sourceBreakdown[sourceKey]) {
        sourceBreakdown[sourceKey].totalProcessed++;
        if (emailSet.size > beforeSize) {
          sourceBreakdown[sourceKey].uniqueAdded++;
        }
      }
      if (!emailSourcesMap.has(normalized)) {
        emailSourcesMap.set(normalized, new Set());
      }
      emailSourcesMap.get(normalized).add(detailedLabel);
    }
  };

  if (subscribersRes.status === 'fulfilled' && subscribersRes.value?.data) {
    for (const row of subscribersRes.value.data) {
      addEmailWithSource(row.email, 'subscribers', 'Subscribers');
    }
  }
  if (talentRes.status === 'fulfilled' && talentRes.value?.data) {
    for (const row of talentRes.value.data) {
      addEmailWithSource(row.email, 'talent_registrations', 'Talent Registrations');
    }
  }
  if (applicationsRes.status === 'fulfilled' && applicationsRes.value?.data) {
    for (const row of applicationsRes.value.data) {
      if (row.applicant_email) {
        addEmailWithSource(row.applicant_email, 'opportunity_applications', 'Opportunity Applications — Applicant');
      }
      if (row.referrer_email) {
        addEmailWithSource(row.referrer_email, 'opportunity_applications', 'Opportunity Applications — Referrer');
      }
    }
  }

  return { emailSet, emailSourcesMap, sourceBreakdown };
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

    // 1. Fetch Supabase eligible emails in parallel with Google Group live members and persistent exclusions
    const [supabaseResult, appsScriptMembersResult, appsScriptExclusionsResult] = await Promise.all([
      fetchEligibleEmailsFromSupabase(),
      googleAppsScriptService.getGoogleGroupMembers(targetGroupEmail),
      googleAppsScriptService.getGoogleGroupExclusions(),
    ]);

    const eligibleEmailSet = supabaseResult.emailSet || new Set();
    const groupMembers = Array.isArray(appsScriptMembersResult.members) ? appsScriptMembersResult.members : [];
    const groupMemberEmailSet = new Set(groupMembers.map((m) => m.email.toLowerCase()));

    const exclusions = Array.isArray(appsScriptExclusionsResult.exclusions) ? appsScriptExclusionsResult.exclusions : [];
    const excludedEmailSet = new Set(
      exclusions.map((item) => normalizeAndValidateEmail(item.email || item)).filter(Boolean)
    );

    // 2. Compute intersection (synced), excluded, and diff (pending)
    let syncedCount = 0;
    let eligibleExcludedCount = 0;
    let pendingSyncCount = 0;

    for (const email of eligibleEmailSet) {
      if (groupMemberEmailSet.has(email)) {
        syncedCount++;
      } else if (excludedEmailSet.has(email)) {
        eligibleExcludedCount++;
      } else {
        pendingSyncCount++;
      }
    }

    const totalEligible = eligibleEmailSet.size;
    const groupMemberCount = groupMembers.length;
    const excludedCount = excludedEmailSet.size;
    const externalMemberCount = Math.max(0, groupMemberCount - syncedCount);

    // 3. Determine connection status
    let connectionStatus = 'ONLINE';
    if (!appsScriptMembersResult.success) {
      connectionStatus = appsScriptMembersResult.message?.includes('not configured') ? 'NOT_CONFIGURED' : 'DISCONNECTED';
    }

    return res.status(200).json({
      success: true,
      targetGroupEmail,
      connectionStatus,
      totalEligible,
      groupMemberCount,
      syncedCount,
      pendingSyncCount,
      excludedCount,
      eligibleExcludedCount,
      externalMemberCount,
      sourceBreakdown: supabaseResult.sourceBreakdown,
      lastCheckTime: new Date().toISOString(),
      appsScriptMessage: appsScriptMembersResult.message || null,
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

    const [supabaseResult, appsScriptResult, exclusionsResult] = await Promise.all([
      fetchEligibleEmailsFromSupabase(),
      googleAppsScriptService.getGoogleGroupMembers(targetGroupEmail),
      googleAppsScriptService.getGoogleGroupExclusions(),
    ]);

    const eligibleEmailSet = supabaseResult.emailSet || new Set();
    const emailSourcesMap = supabaseResult.emailSourcesMap || new Map();
    const rawMembers = Array.isArray(appsScriptResult.members) ? appsScriptResult.members : [];

    const rawExclusions = Array.isArray(exclusionsResult?.exclusions) ? exclusionsResult.exclusions : [];
    const exclusionMap = new Map();
    for (const item of rawExclusions) {
      const email = normalizeAndValidateEmail(typeof item === 'string' ? item : item?.email);
      if (email) {
        exclusionMap.set(email, typeof item === 'object' && item.excludedAt ? item.excludedAt : new Date().toISOString());
      }
    }

    // Tag each member with sync origin, approved sources, exclusion state, and metadata
    const enrichedMembers = rawMembers.map((m) => {
      const normEmail = normalizeAndValidateEmail(m.email) || m.email.toLowerCase();
      const sourcesSet = emailSourcesMap.get(normEmail);
      const sources = sourcesSet ? Array.from(sourcesSet) : [];
      const isExcluded = exclusionMap.has(normEmail);
      const excludedAt = exclusionMap.get(normEmail) || null;

      return {
        id: m.id || null,
        email: m.email,
        role: m.role || 'MEMBER',
        type: m.type || 'USER',
        status: m.status || 'ACTIVE',
        deliverySettings: m.deliverySettings || 'ALL_MAIL',
        isSupabaseEligible: eligibleEmailSet.has(normEmail),
        sources,
        isExcluded,
        excludedAt,
        joinedAt: m.joinedAt || m.createdTime || null,
      };
    });

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
 * GET /api/admin/google-group/exclusions
 * Retrieves all currently excluded emails from Google Group automatic sync
 */
export const getGoogleGroupExclusions = async (req, res, next) => {
  try {
    const result = await googleAppsScriptService.getGoogleGroupExclusions();
    const exclusions = Array.isArray(result.exclusions) ? result.exclusions : [];

    return res.status(200).json({
      success: true,
      count: exclusions.length,
      exclusions: exclusions,
    });
  } catch (err) {
    console.error('getGoogleGroupExclusions error:', err);
    next(err);
  }
};

/**
 * DELETE /api/admin/google-group/exclusions/:email
 * Removes an email from persistent exclusion, restoring automatic sync eligibility
 */
export const restoreGoogleGroupExclusion = async (req, res, next) => {
  try {
    const targetEmail = normalizeAndValidateEmail(req.params.email || req.body.email);

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required to restore sync eligibility.',
      });
    }

    const result = await googleAppsScriptService.removeGoogleGroupExclusion(targetEmail);

    if (!result || result.success === false) {
      return res.status(500).json({
        success: false,
        message: result?.message || `Failed to restore sync eligibility for ${targetEmail}`,
      });
    }

    // Log Admin Audit record
    try {
      if (supabase) {
        await supabase.from('admin_audit_logs').insert([{
          event_type: 'GOOGLE_GROUP_EXCLUSION_RESTORED',
          email: req.user?.email || 'admin@zenemoo.in',
          ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
          user_agent: req.headers['user-agent'] || 'admin_dashboard',
          details: {
            restoredEmail: targetEmail,
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
      message: `Automatic sync restored for ${targetEmail}. The member will be eligible to be added during subsequent synchronizations.`,
      email: targetEmail,
      restored: true,
    });
  } catch (err) {
    console.error('restoreGoogleGroupExclusion error:', err);
    next(err);
  }
};

/**
 * POST /api/admin/google-group/sync
 * Triggers interactive differential sync from Admin Panel (Exclusion-Aware)
 */
export const triggerGoogleGroupSync = async (req, res, next) => {
  try {
    const targetGroupEmail = process.env.GOOGLE_GROUP_EMAIL || 'zenemoocommunity@googlegroups.com';

    // 1. Fetch current database emails, current group members, and exclusions in parallel
    const [supabaseResult, appsScriptMembersResult, appsScriptExclusionsResult] = await Promise.all([
      fetchEligibleEmailsFromSupabase(),
      googleAppsScriptService.getGoogleGroupMembers(targetGroupEmail),
      googleAppsScriptService.getGoogleGroupExclusions(),
    ]);

    const eligibleEmailSet = supabaseResult.emailSet || new Set();
    const existingGroupMembers = Array.isArray(appsScriptMembersResult.members) ? appsScriptMembersResult.members : [];
    const existingGroupEmailSet = new Set(existingGroupMembers.map((m) => m.email.toLowerCase()));

    const exclusions = Array.isArray(appsScriptExclusionsResult.exclusions) ? appsScriptExclusionsResult.exclusions : [];
    const excludedEmailSet = new Set(
      exclusions.map((item) => normalizeAndValidateEmail(item.email || item)).filter(Boolean)
    );

    // 2. Filter candidate emails (Exclude both existing members AND excluded emails)
    const missingCandidates = [];
    let excludedCount = 0;

    for (const email of eligibleEmailSet) {
      if (excludedEmailSet.has(email)) {
        excludedCount++;
      } else if (!existingGroupEmailSet.has(email)) {
        missingCandidates.push(email);
      }
    }

    if (missingCandidates.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Google Group is already 100% up-to-date with Supabase community records.',
        totalEligible: eligibleEmailSet.size,
        alreadySynced: existingGroupMembers.length,
        excludedCount: excludedCount,
        addedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
      });
    }

    // 3. Dispatch batch addition of non-excluded candidates to Google Apps Script
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
            excludedCount: excludedCount,
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
      message: `Sync complete: Added ${syncResult.addedCount || 0} new member(s) (${excludedCount} excluded email(s) skipped).`,
      totalEligible: eligibleEmailSet.size,
      missingCount: missingCandidates.length,
      excludedCount: excludedCount,
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
 * Explicitly removes a single member from the Google Group AND persists manual exclusion
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

    // Command Google Apps Script to delete member & add exclusion
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
          event_type: 'GOOGLE_GROUP_MEMBER_REMOVED_AND_EXCLUDED',
          email: req.user?.email || 'admin@zenemoo.in',
          ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
          user_agent: req.headers['user-agent'] || 'admin_dashboard',
          details: {
            groupEmail: targetGroupEmail,
            removedMemberEmail: targetEmail,
            excludedFromFutureSync: true,
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
      message: `Successfully removed ${targetEmail} from ${targetGroupEmail} and excluded from future automatic sync.`,
      email: targetEmail,
      excludedFromFutureSync: true,
    });
  } catch (err) {
    console.error('removeGoogleGroupMember error:', err);
    next(err);
  }
};

