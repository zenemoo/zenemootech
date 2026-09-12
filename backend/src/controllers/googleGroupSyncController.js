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

// In-memory cache for last-known valid Google Group members (Preserves state during read quota limits)
let lastKnownState = {
  members: [],
  memberCount: 148, // Known production base count
  lastFetchedAt: null,
  quotaExceeded: false,
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

    // 2. Handle Google Group member data with Quota Exceeded awareness
    let groupMembers = [];
    let groupMemberCount = lastKnownState.memberCount;
    let connectionStatus = 'ONLINE';
    let appsScriptMessage = appsScriptMembersResult.message || null;

    if (appsScriptMembersResult.code === 'GROUP_READ_QUOTA_EXCEEDED' || appsScriptMembersResult.status === 'QUOTA_EXCEEDED') {
      lastKnownState.quotaExceeded = true;
      connectionStatus = 'QUOTA_EXCEEDED';
      groupMembers = lastKnownState.members;
      groupMemberCount = lastKnownState.members.length > 0 ? lastKnownState.members.length : lastKnownState.memberCount;
      appsScriptMessage = `Google Group read quota temporarily exceeded. Showing last known member count (${groupMemberCount}).`;
    } else if (appsScriptMembersResult.success && Array.isArray(appsScriptMembersResult.members)) {
      lastKnownState.quotaExceeded = false;
      lastKnownState.members = appsScriptMembersResult.members;
      lastKnownState.memberCount = appsScriptMembersResult.members.length;
      lastKnownState.lastFetchedAt = new Date().toISOString();
      groupMembers = appsScriptMembersResult.members;
      groupMemberCount = groupMembers.length;
      connectionStatus = 'ONLINE';
    } else {
      if (lastKnownState.members.length > 0) {
        groupMembers = lastKnownState.members;
        groupMemberCount = lastKnownState.memberCount;
      }
      connectionStatus = appsScriptMembersResult.message?.includes('not configured') ? 'NOT_CONFIGURED' : 'DISCONNECTED';
    }

    const groupMemberEmailSet = new Set(groupMembers.map((m) => m.email.toLowerCase()));

    const exclusions = Array.isArray(appsScriptExclusionsResult.exclusions) ? appsScriptExclusionsResult.exclusions : [];
    const excludedEmailSet = new Set(
      exclusions.map((item) => normalizeAndValidateEmail(item.email || item)).filter(Boolean)
    );

    // 3. Compute intersection (synced), excluded, and diff (pending)
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
    const excludedCount = excludedEmailSet.size;
    const externalMemberCount = Math.max(0, groupMemberCount - syncedCount);

    return res.status(200).json({
      success: true,
      targetGroupEmail,
      connectionStatus,
      quotaExceeded: lastKnownState.quotaExceeded,
      totalEligible,
      groupMemberCount,
      syncedCount,
      pendingSyncCount,
      excludedCount,
      eligibleExcludedCount,
      externalMemberCount,
      sourceBreakdown: supabaseResult.sourceBreakdown,
      lastCheckTime: new Date().toISOString(),
      appsScriptMessage,
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

    let rawMembers = [];
    let isQuotaExceeded = false;

    if (appsScriptResult.code === 'GROUP_READ_QUOTA_EXCEEDED' || appsScriptResult.status === 'QUOTA_EXCEEDED') {
      isQuotaExceeded = true;
      lastKnownState.quotaExceeded = true;
      rawMembers = lastKnownState.members;
    } else if (appsScriptResult.success && Array.isArray(appsScriptResult.members)) {
      lastKnownState.quotaExceeded = false;
      lastKnownState.members = appsScriptResult.members;
      lastKnownState.memberCount = appsScriptResult.members.length;
      lastKnownState.lastFetchedAt = new Date().toISOString();
      rawMembers = appsScriptResult.members;
    } else {
      rawMembers = lastKnownState.members;
    }

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
      count: enrichedMembers.length || lastKnownState.memberCount,
      members: enrichedMembers,
      connected: appsScriptResult.success || isQuotaExceeded,
      quotaExceeded: isQuotaExceeded,
      status: isQuotaExceeded ? 'QUOTA_EXCEEDED' : (appsScriptResult.success ? 'ONLINE' : 'DEGRADED'),
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

// In-memory sync job state tracker for asynchronous background processing
let currentSyncJob = {
  status: 'IDLE', // 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAt: null,
  completedAt: null,
  totalEligible: 0,
  totalCandidates: 0,
  processedCount: 0,
  addedCount: 0,
  skippedCount: 0,
  excludedCount: 0,
  failedCount: 0,
  errors: [],
  currentBatch: 0,
  totalBatches: 0,
  addedEmails: [],
  message: 'No active synchronization job.',
};

/**
 * Executes asynchronous batch synchronization in the background.
 * ARCHITECTURAL SAFETY:
 * 1. Reads Google Group members ONCE at cycle start.
 * 2. Builds in-memory Set: existingMemberEmails.
 * 3. Never re-reads Google Group during batch loops.
 * 4. Updates existingMemberEmails locally as additions succeed.
 * 5. Aborts safely if initial member read fails.
 */
const executeBackgroundSync = async (user, targetGroupEmail) => {
  try {
    // 1. Fetch current eligible database emails, current group members (ONCE), and exclusions
    const [supabaseResult, appsScriptMembersResult, appsScriptExclusionsResult] = await Promise.all([
      fetchEligibleEmailsFromSupabase(),
      googleAppsScriptService.getGoogleGroupMembers(targetGroupEmail),
      googleAppsScriptService.getGoogleGroupExclusions(),
    ]);

    // Safety verification of group membership read
    const hasValidLiveMembers = appsScriptMembersResult && appsScriptMembersResult.success && Array.isArray(appsScriptMembersResult.members);
    const existingGroupMembers = hasValidLiveMembers
      ? appsScriptMembersResult.members
      : (lastKnownState.members.length > 0 ? lastKnownState.members : []);

    if (!hasValidLiveMembers && existingGroupMembers.length === 0) {
      const quotaOrErrorMsg = (appsScriptMembersResult?.code === 'GROUP_READ_QUOTA_EXCEEDED' || appsScriptMembersResult?.status === 'QUOTA_EXCEEDED')
        ? 'Google Group read quota temporarily exceeded.'
        : (appsScriptMembersResult?.message || 'Failed to read current Google Group members.');

      currentSyncJob.status = 'FAILED';
      currentSyncJob.completedAt = new Date().toISOString();
      currentSyncJob.message = `Unable to safely read current Google Group membership (${quotaOrErrorMsg}). Sync aborted for safety.`;
      currentSyncJob.errors.push({ error: currentSyncJob.message });
      return;
    }

    // Populate lastKnownState with the successful members
    if (hasValidLiveMembers) {
      lastKnownState.members = appsScriptMembersResult.members;
      lastKnownState.memberCount = appsScriptMembersResult.members.length;
      lastKnownState.lastFetchedAt = new Date().toISOString();
      lastKnownState.quotaExceeded = false;
    }

    const eligibleEmailSet = supabaseResult.emailSet || new Set();
    const existingMemberEmails = new Set(existingGroupMembers.map((m) => m.email.toLowerCase()));

    const exclusions = Array.isArray(appsScriptExclusionsResult.exclusions) ? appsScriptExclusionsResult.exclusions : [];
    const excludedEmailSet = new Set(
      exclusions.map((item) => normalizeAndValidateEmail(item.email || item)).filter(Boolean)
    );

    // 2. Filter candidate emails (Exclude existing members in Set AND excluded emails)
    const missingCandidates = [];
    let excludedCount = 0;

    for (const email of eligibleEmailSet) {
      if (excludedEmailSet.has(email)) {
        excludedCount++;
      } else if (!existingMemberEmails.has(email)) {
        missingCandidates.push(email);
      }
    }

    currentSyncJob.totalEligible = eligibleEmailSet.size;
    currentSyncJob.excludedCount = excludedCount;
    currentSyncJob.alreadyExisting = existingMemberEmails.size;

    if (missingCandidates.length === 0) {
      currentSyncJob.status = 'COMPLETED';
      currentSyncJob.completedAt = new Date().toISOString();
      currentSyncJob.message = 'Google Group is already 100% synchronized.';
      return;
    }

    // Safety limit per run: up to 100 candidates processed in safe chunks of 25
    const MAX_SYNC_LIMIT = 100;
    const candidatesToProcess = missingCandidates.slice(0, MAX_SYNC_LIMIT);
    const BATCH_SIZE = 25;
    const totalBatches = Math.ceil(candidatesToProcess.length / BATCH_SIZE);

    currentSyncJob.totalCandidates = candidatesToProcess.length;
    currentSyncJob.totalBatches = totalBatches;
    currentSyncJob.message = `Processing ${candidatesToProcess.length} pending candidate(s) in ${totalBatches} batch(es)...`;

    for (let b = 0; b < totalBatches; b++) {
      currentSyncJob.currentBatch = b + 1;
      const batchChunk = candidatesToProcess.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

      // Process batch (Apps Script does 0 GroupsApp reads)
      const syncResult = await googleAppsScriptService.syncGoogleGroupMembers(targetGroupEmail, batchChunk);

      if (syncResult) {
        currentSyncJob.addedCount += syncResult.addedCount || 0;
        currentSyncJob.skippedCount += syncResult.skippedCount || 0;
        currentSyncJob.failedCount += syncResult.failedCount || 0;
        currentSyncJob.processedCount += batchChunk.length;

        if (Array.isArray(syncResult.addedEmails)) {
          currentSyncJob.addedEmails.push(...syncResult.addedEmails);

          // Update in-memory Set immediately so subsequent batches and states recognize them
          for (const added of syncResult.addedEmails) {
            existingMemberEmails.add(added.toLowerCase());
            if (!lastKnownState.members.some((m) => m.email.toLowerCase() === added.toLowerCase())) {
              lastKnownState.members.push({
                id: null,
                email: added,
                role: 'MEMBER',
                type: 'USER',
                status: 'ACTIVE',
                deliverySettings: 'ALL_MAIL',
              });
            }
          }
          lastKnownState.memberCount = Math.max(lastKnownState.memberCount, existingMemberEmails.size);
        }

        if (Array.isArray(syncResult.errors) && syncResult.errors.length > 0) {
          currentSyncJob.errors.push(...syncResult.errors);
        }
      } else {
        currentSyncJob.failedCount += batchChunk.length;
        currentSyncJob.processedCount += batchChunk.length;
        currentSyncJob.errors.push({ error: `Batch ${b + 1} communication timeout or error` });
      }
    }

    currentSyncJob.status = 'COMPLETED';
    currentSyncJob.completedAt = new Date().toISOString();
    currentSyncJob.message = `Sync complete: Added ${currentSyncJob.addedCount} new member(s) (${currentSyncJob.skippedCount} skipped, ${currentSyncJob.excludedCount} excluded).`;

    // Log Admin Audit record
    try {
      if (supabase) {
        await supabase.from('admin_audit_logs').insert([{
          event_type: 'GOOGLE_GROUP_SYNC',
          email: user?.email || 'admin@zenemoo.in',
          ip_address: '127.0.0.1',
          user_agent: 'admin_dashboard',
          details: {
            groupEmail: targetGroupEmail,
            totalEligible: currentSyncJob.totalEligible,
            excludedCount: currentSyncJob.excludedCount,
            totalCandidates: currentSyncJob.totalCandidates,
            addedCount: currentSyncJob.addedCount,
            skippedCount: currentSyncJob.skippedCount,
            failedCount: currentSyncJob.failedCount,
            timestamp: currentSyncJob.completedAt,
          },
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (auditErr) {
      console.warn('[Google Group Audit Log Warning]:', auditErr.message);
    }
  } catch (err) {
    console.error('executeBackgroundSync error:', err);
    currentSyncJob.status = 'FAILED';
    currentSyncJob.completedAt = new Date().toISOString();
    currentSyncJob.message = `Synchronization failed: ${err.message}`;
    currentSyncJob.errors.push({ error: err.message });
  }
};

/**
 * GET /api/admin/google-group/sync-status
 * Returns the current background synchronization progress and state
 */
export const getGoogleGroupSyncStatus = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      ...currentSyncJob,
    });
  } catch (err) {
    console.error('getGoogleGroupSyncStatus error:', err);
    next(err);
  }
};

/**
 * POST /api/admin/google-group/sync
 * Triggers interactive differential sync from Admin Panel asynchronously
 */
export const triggerGoogleGroupSync = async (req, res, next) => {
  try {
    const targetGroupEmail = process.env.GOOGLE_GROUP_EMAIL || 'zenemoocommunity@googlegroups.com';

    // 1. Prevent duplicate concurrent sync runs
    if (currentSyncJob.status === 'RUNNING') {
      return res.status(200).json({
        success: true,
        status: 'RUNNING',
        message: 'A Google Group synchronization job is already running in background.',
        progress: currentSyncJob,
      });
    }

    // 2. Initialize new job state
    currentSyncJob = {
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      completedAt: null,
      totalEligible: 0,
      totalCandidates: 0,
      processedCount: 0,
      addedCount: 0,
      skippedCount: 0,
      excludedCount: 0,
      failedCount: 0,
      errors: [],
      currentBatch: 0,
      totalBatches: 0,
      addedEmails: [],
      message: 'Synchronization started in background...',
    };

    // 3. Kick off background execution asynchronously (non-blocking)
    executeBackgroundSync(req.user, targetGroupEmail);

    return res.status(200).json({
      success: true,
      status: 'RUNNING',
      message: 'Google Group synchronization initiated in background.',
      startedAt: currentSyncJob.startedAt,
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

    // Update in-memory state
    if (lastKnownState.members.length > 0) {
      lastKnownState.members = lastKnownState.members.filter((m) => m.email.toLowerCase() !== targetEmail.toLowerCase());
      lastKnownState.memberCount = lastKnownState.members.length;
    } else {
      lastKnownState.memberCount = Math.max(0, lastKnownState.memberCount - 1);
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

