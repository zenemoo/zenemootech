/**
 * ============================================================================
 * ZENEMOO GOOGLE GROUP AUTOMATIC EMAIL SYNCHRONIZATION WEB APP & TRIGGER
 * Target Group: zenemoocommunity@googlegroups.com
 * ============================================================================
 * 
 * DESCRIPTION:
 * 1. Web App (doGet / doPost): Secure command receiver for the Zenemoo Backend & Admin Panel
 *    - getGroupMembers : Read complete member list and count via GroupsApp (Owner/Manager permission)
 *    - syncMembers     : Add missing community members (strictly add-only)
 *    - removeMember    : Safely remove a single specified member
 *    - healthCheck     : Diagnostic connectivity and permission verification
 * 
 * 2. Automated Job (syncGoogleGroupMembers):
 *    - Daily Time-driven trigger pull synchronization
 * 
 * 3. Manual Diagnostic (testGoogleGroupAccess):
 *    - Safe standalone tester in Apps Script editor
 * 
 * SECURITY:
 * - Requires secret verification for all incoming Web App requests (GOOGLE_GROUP_SYNC_SECRET)
 * - Zero secrets exposed in output payloads or logging
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Apps Script (https://script.google.com).
 * 2. Create/open the project: "Zenemoo Google Group Sync".
 * 3. Paste this code into `Code.gs`.
 * 4. Configure Script Properties (Project Settings > Script Properties):
 *    - `GOOGLE_GROUP_SYNC_SECRET` : <your-secure-sync-secret>
 *    - `GOOGLE_GROUP_EMAIL`       : zenemoocommunity@googlegroups.com
 *    - `ZENEMOO_BACKEND_URL`      : https://api.zenemoo.in/api/admin/google-group/eligible-emails
 * 5. Deploy as Web App (Deploy > Manage deployments > Edit > Version: New version > Deploy):
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (Security is enforced via payload secret token)
 * ============================================================================
 */

// Global Configuration Defaults (Overridable via Script Properties)
const CONFIG = {
  DEFAULT_BACKEND_URL: 'https://api.zenemoo.in/api/admin/google-group/eligible-emails',
  DEFAULT_GROUP_EMAIL: 'zenemoocommunity@googlegroups.com',
  DEFAULT_SECRET: '',
  MAX_ADDITIONS_PER_RUN: 100, // Safety limit per run
  PAUSE_BETWEEN_REQUESTS_MS: 150, // Micro-delay to comply with rate limits
};

// Standard RFC-compliant email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes, sanitizes, and validates an email string
 */
/**
 * Normalizes, sanitizes, and validates an email string
 */
function normalizeEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') return null;
  let clean = rawEmail.trim().toLowerCase();
  clean = clean.replace(/^["'<(\[]+|["'>)\],.]+$/g, '').trim();
  if (!clean || clean.length < 5 || clean.length > 254) return null;
  if (!EMAIL_REGEX.test(clean)) return null;
  return clean;
}

/**
 * Retrieves the configured secret from Script Properties
 */
function getSecret() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return props.GOOGLE_GROUP_SYNC_SECRET || props.APPS_SCRIPT_SECRET_TOKEN || CONFIG.DEFAULT_SECRET;
}

/**
 * Retrieves the target Google Group email from Script Properties
 */
function getGroupEmail() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return props.GOOGLE_GROUP_EMAIL || CONFIG.DEFAULT_GROUP_EMAIL;
}

/**
 * ============================================================================
 * EXCLUSION PERSISTENCE STORE (PropertiesService)
 * Script Property: GOOGLE_GROUP_EXCLUDED_EMAILS
 * Stored Format: JSON array of objects [ { email: "user@example.com", excludedAt: "ISO_TIMESTAMP" } ]
 * ============================================================================
 */
const EXCLUSION_PROPERTY_KEY = 'GOOGLE_GROUP_EXCLUDED_EMAILS';

/**
 * Retrieves all excluded emails safely from Script Properties
 * @returns {Array<{ email: string, excludedAt: string }>}
 */
function getExcludedEmails() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(EXCLUSION_PROPERTY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalizedList = [];
    const seen = new Set();

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      let emailStr = '';
      let dateStr = new Date().toISOString();

      if (typeof item === 'string') {
        emailStr = item;
      } else if (item && typeof item === 'object') {
        emailStr = item.email || '';
        dateStr = item.excludedAt || dateStr;
      }

      const clean = normalizeEmail(emailStr);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        normalizedList.push({
          email: clean,
          excludedAt: dateStr,
        });
      }
    }
    return normalizedList;
  } catch (err) {
    Logger.log('⚠️ Failed to read or parse GOOGLE_GROUP_EXCLUDED_EMAILS property: ' + err.toString());
    return [];
  }
}

/**
 * Checks if an email is present in the persistent exclusion list
 * @param {string} email
 * @returns {boolean}
 */
function isEmailExcluded(email) {
  const clean = normalizeEmail(email);
  if (!clean) return false;
  const exclusions = getExcludedEmails();
  return exclusions.some(function (item) {
    return item.email === clean;
  });
}

/**
 * Permanently adds an email to the persistent exclusion list
 * @param {string} email
 * @returns {boolean}
 */
function addExcludedEmail(email) {
  const clean = normalizeEmail(email);
  if (!clean) return false;

  try {
    const current = getExcludedEmails();
    const exists = current.some(function (item) {
      return item.email === clean;
    });

    if (!exists) {
      current.push({
        email: clean,
        excludedAt: new Date().toISOString(),
      });
      PropertiesService.getScriptProperties().setProperty(
        EXCLUSION_PROPERTY_KEY,
        JSON.stringify(current)
      );
    }
    return true;
  } catch (err) {
    Logger.log('❌ Failed to save excluded email to Script Properties: ' + err.toString());
    return false;
  }
}

/**
 * Removes an email from the persistent exclusion list (Restores eligibility)
 * @param {string} email
 * @returns {boolean}
 */
function removeExcludedEmail(email) {
  const clean = normalizeEmail(email);
  if (!clean) return false;

  try {
    const current = getExcludedEmails();
    const filtered = current.filter(function (item) {
      return item.email !== clean;
    });

    PropertiesService.getScriptProperties().setProperty(
      EXCLUSION_PROPERTY_KEY,
      JSON.stringify(filtered)
    );
    return true;
  } catch (err) {
    Logger.log('❌ Failed to remove excluded email from Script Properties: ' + err.toString());
    return false;
  }
}

/**
 * Helper to construct JSON ContentService response
 */
function jsonResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * ============================================================================
 * WEB APP ENTRYPOINT (POST) — Handles incoming backend commands
 * ============================================================================
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return jsonResponse({
          success: false,
          code: 'INVALID_JSON',
          message: 'Failed to parse JSON request body: ' + parseErr.message,
        });
      }
    } else {
      return jsonResponse({
        success: false,
        code: 'EMPTY_BODY',
        message: 'Request body must contain valid JSON.',
      });
    }

    // 1. Authenticate Secret Token
    const expectedSecret = getSecret();
    const providedSecret = payload.secret || payload.token || payload.syncSecret;

    if (!expectedSecret) {
      return jsonResponse({
        success: false,
        code: 'CONFIG_ERROR',
        message: 'GOOGLE_GROUP_SYNC_SECRET is not configured in Script Properties.',
      });
    }

    if (!providedSecret || String(providedSecret).trim() !== String(expectedSecret).trim()) {
      return jsonResponse({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Invalid or missing secret token.',
      });
    }

    // 2. Dispatch Action
    const action = payload.action || 'healthCheck';

    switch (action) {
      case 'getGroupMembers':
        return jsonResponse(handleGetGroupMembers(payload));

      case 'syncMembers':
        return jsonResponse(handleSyncMembers(payload));

      case 'removeMember':
        return jsonResponse(handleRemoveMember(payload));

      case 'getExclusions':
        return jsonResponse(handleGetExclusions(payload));

      case 'addExclusion':
        return jsonResponse(handleAddExclusion(payload));

      case 'removeExclusion':
        return jsonResponse(handleRemoveExclusion(payload));

      case 'healthCheck':
        return jsonResponse(handleHealthCheck(payload));

      default:
        return jsonResponse({
          success: false,
          code: 'UNKNOWN_ACTION',
          message: 'Unsupported action "' + action + '". Available actions: getGroupMembers, syncMembers, removeMember, getExclusions, addExclusion, removeExclusion, healthCheck.',
        });
    }
  } catch (err) {
    Logger.log('❌ Uncaught doPost exception: ' + err.toString());
    return jsonResponse({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Internal execution exception: ' + err.message,
    });
  }
}

/**
 * ============================================================================
 * WEB APP ENTRYPOINT (GET) — Handles read-only requests & diagnostic status
 * ============================================================================
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = params.action || 'ping';

    // Ping / diagnostic status (no secret required for simple service verification)
    if (action === 'ping' || !params.action) {
      return jsonResponse({
        success: true,
        service: 'Zenemoo Google Group Management Web App',
        status: 'ONLINE',
        targetGroup: getGroupEmail(),
        timestamp: new Date().toISOString(),
      });
    }

    // Authenticate Secret Token for all data-fetching actions
    const expectedSecret = getSecret();
    const providedSecret = params.secret || params.token || params.syncSecret;

    if (!expectedSecret) {
      return jsonResponse({
        success: false,
        code: 'CONFIG_ERROR',
        message: 'GOOGLE_GROUP_SYNC_SECRET is not configured in Script Properties.',
      });
    }

    if (!providedSecret || String(providedSecret).trim() !== String(expectedSecret).trim()) {
      return jsonResponse({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized: Invalid or missing secret token.',
      });
    }

    // Strictly allowed READ-ONLY actions via GET
    if (action === 'getGroupMembers') {
      return jsonResponse(handleGetGroupMembers(params));
    }

    if (action === 'getExclusions') {
      return jsonResponse(handleGetExclusions(params));
    }

    if (action === 'healthCheck') {
      return jsonResponse(handleHealthCheck(params));
    }

    // Explicitly prohibit mutating actions over GET
    if (action === 'syncMembers' || action === 'removeMember' || action === 'addExclusion' || action === 'removeExclusion') {
      return jsonResponse({
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Mutating actions ("' + action + '") must be executed via HTTP POST.',
      });
    }

    return jsonResponse({
      success: false,
      code: 'UNKNOWN_ACTION',
      message: 'Unsupported GET action "' + action + '". Supported read actions: getGroupMembers, getExclusions, healthCheck.',
    });
  } catch (err) {
    Logger.log('❌ Uncaught doGet exception: ' + err.toString());
    return jsonResponse({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Internal execution exception: ' + err.message,
    });
  }
}

/**
 * ============================================================================
 * CACHE HELPERS (CacheService)
 * Reduces GroupsApp reads by caching group membership in Script Cache (TTL ~300s)
 * ============================================================================
 */
function getMemberCacheKey(groupEmail) {
  return 'MEMBERS_' + (groupEmail || getGroupEmail()).toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function getCachedMembers(groupEmail) {
  try {
    const cache = CacheService.getScriptCache();
    const cachedStr = cache.get(getMemberCacheKey(groupEmail));
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    Logger.log('⚠️ Cache read error: ' + err.toString());
  }
  return null;
}

function setCachedMembers(groupEmail, membersArray, ttlSeconds) {
  try {
    if (!Array.isArray(membersArray)) return;
    const cache = CacheService.getScriptCache();
    const cacheKey = getMemberCacheKey(groupEmail);
    // Keep payload lightweight: only essentials stored in cache
    const lightweight = membersArray.map(function (m) {
      return {
        id: m.id || null,
        email: m.email,
        role: m.role || 'MEMBER',
        type: m.type || 'USER',
        status: m.status || 'ACTIVE',
        deliverySettings: m.deliverySettings || 'ALL_MAIL',
      };
    });
    const serialized = JSON.stringify(lightweight);
    // Apps Script Cache item max length is 100KB (approx 1000+ member objects)
    if (serialized.length < 100000) {
      cache.put(cacheKey, serialized, ttlSeconds || 300);
    }
  } catch (err) {
    Logger.log('⚠️ Cache write error: ' + err.toString());
  }
}

function invalidateMemberCache(groupEmail) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(getMemberCacheKey(groupEmail));
  } catch (err) {
    Logger.log('⚠️ Cache invalidate error: ' + err.toString());
  }
}

/**
 * ACTION 1: getGroupMembers
 * Lists all members from the Google Group using GroupsApp (Owner/Manager permission)
 * Reads once, caches in CacheService, and handles groups.read quota exceptions gracefully.
 */
function handleGetGroupMembers(payload) {
  const groupEmail = (payload && payload.groupEmail) ? payload.groupEmail : getGroupEmail();
  const forceRefresh = payload && (payload.forceRefresh === true || payload.forceRefresh === 'true');

  // 1. Check Cache first (unless forceRefresh requested)
  if (!forceRefresh) {
    const cached = getCachedMembers(groupEmail);
    if (cached && cached.length > 0) {
      return {
        success: true,
        groupEmail: groupEmail,
        count: cached.length,
        members: cached,
        cached: true,
      };
    }
  }

  try {
    const group = GroupsApp.getGroupByEmail(groupEmail);
    if (!group) {
      return {
        success: false,
        code: 'GROUP_NOT_FOUND',
        groupEmail: groupEmail,
        message: 'Google Group not found or not accessible by this Google account: ' + groupEmail,
        members: [],
        count: null,
      };
    }

    const users = group.getUsers();
    const members = [];
    const seen = new Set();

    if (users && Array.isArray(users)) {
      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        const rawEmail = (u && typeof u.getEmail === 'function') ? u.getEmail() : String(u || '');
        const cleanEmail = normalizeEmail(rawEmail);
        if (cleanEmail && !seen.has(cleanEmail)) {
          seen.add(cleanEmail);

          let roleStr = 'MEMBER';
          try {
            if (typeof group.getRole === 'function') {
              const r = group.getRole(u);
              if (r) {
                roleStr = String(r).toUpperCase().replace(/.*ROLE\./i, '');
              }
            }
          } catch (_) {}

          members.push({
            id: null,
            email: cleanEmail,
            role: roleStr || 'MEMBER',
            type: 'USER',
            status: 'ACTIVE',
            deliverySettings: 'ALL_MAIL',
          });
        }
      }
    }

    // Cache successful member list for 5 minutes
    setCachedMembers(groupEmail, members, 300);

    return {
      success: true,
      groupEmail: groupEmail,
      count: members.length,
      members: members,
      cached: false,
    };
  } catch (err) {
    const errMsg = err.toString();
    Logger.log('❌ getGroupMembers Error: ' + errMsg);

    // CRITICAL: Gracefully detect groups.read quota limit
    if (errMsg.includes('Service invoked too many times') || errMsg.includes('groups.read') || errMsg.includes('quota') || errMsg.includes('Quota')) {
      return {
        success: false,
        code: 'GROUP_READ_QUOTA_EXCEEDED',
        status: 'QUOTA_EXCEEDED',
        groupEmail: groupEmail,
        message: 'Service invoked too many times for one day: groups.read (Google Groups daily read quota exceeded)',
        members: [],
        count: null, // DO NOT return 0 which would falsely indicate an empty group
      };
    }

    return {
      success: false,
      code: 'GROUPS_APP_ERROR',
      groupEmail: groupEmail,
      message: 'Failed to retrieve group members: ' + err.message,
      members: [],
      count: null,
    };
  }
}

/**
 * ACTION 2: syncMembers
 * Adds provided candidate email addresses into the Google Group (strictly Add-Only).
 * Automatically filters out any manually excluded emails.
 * Uses 0 GroupsApp read calls (candidate filtering against existing members is done via in-memory Set).
 * Protected with LockService concurrency control.
 */
function handleSyncMembers(payload) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return {
      success: false,
      code: 'SYNC_LOCKED',
      message: 'A Google Group synchronization job is already running. Please try again shortly.',
      addedCount: 0,
      skippedCount: 0,
      excludedCount: 0,
      failedCount: 0,
      addedEmails: [],
      errors: [],
    };
  }

  try {
    const groupEmail = (payload && payload.groupEmail) ? payload.groupEmail : getGroupEmail();
    const rawCandidateEmails = Array.isArray(payload.emails)
      ? payload.emails
      : Array.isArray(payload.members)
      ? payload.members
      : [];

    let addedCount = 0;
    let skippedCount = 0;
    let excludedCount = 0;
    let failedCount = 0;
    const addedEmails = [];
    const errors = [];

    // 1. Load exclusion list (PropertiesService - zero groups.read quota)
    const exclusionSet = new Set(getExcludedEmails().map(function (item) { return item.email; }));

    // 2. Process additions WITHOUT calling GroupsApp read methods in a loop
    for (let i = 0; i < rawCandidateEmails.length; i++) {
      const clean = normalizeEmail(rawCandidateEmails[i]);
      if (!clean) {
        continue;
      }

      // Step A: Check whether email is permanently excluded
      if (exclusionSet.has(clean)) {
        excludedCount++;
        continue;
      }

      // Step B: Attempt direct addition via AdminDirectory
      let inserted = false;
      try {
        if (typeof AdminDirectory !== 'undefined' && AdminDirectory.Members && typeof AdminDirectory.Members.insert === 'function') {
          AdminDirectory.Members.insert({ email: clean, role: 'MEMBER' }, groupEmail);
          addedCount++;
          addedEmails.push(clean);
          inserted = true;

          if (CONFIG.PAUSE_BETWEEN_REQUESTS_MS > 0) {
            Utilities.sleep(CONFIG.PAUSE_BETWEEN_REQUESTS_MS);
          }
        }
      } catch (insertErr) {
        const errMsg = insertErr.toString();
        // 409 Conflict / already exists means member is already present -> safely skip without error
        if (errMsg.includes('409') || errMsg.includes('already exists') || errMsg.includes('memberExists') || errMsg.includes('duplicate')) {
          skippedCount++;
          inserted = true;
        } else {
          failedCount++;
          errors.push({ email: clean, error: errMsg });
          inserted = true;
        }
      }

      if (!inserted) {
        failedCount++;
        errors.push({ email: clean, error: 'Direct programmatic addition requires Google Workspace Group Admin privilege.' });
      }
    }

    // 3. If members were added, update or invalidate cache so next read reflects changes
    if (addedEmails.length > 0) {
      const cached = getCachedMembers(groupEmail);
      if (cached && Array.isArray(cached)) {
        const cachedSet = new Set(cached.map(function (m) { return m.email; }));
        for (let a = 0; a < addedEmails.length; a++) {
          if (!cachedSet.has(addedEmails[a])) {
            cached.push({
              id: null,
              email: addedEmails[a],
              role: 'MEMBER',
              type: 'USER',
              status: 'ACTIVE',
              deliverySettings: 'ALL_MAIL',
            });
          }
        }
        setCachedMembers(groupEmail, cached, 300);
      } else {
        invalidateMemberCache(groupEmail);
      }
    }

    return {
      success: true,
      groupEmail: groupEmail,
      totalReceived: rawCandidateEmails.length,
      addedCount: addedCount,
      skippedCount: skippedCount,
      excludedCount: excludedCount,
      failedCount: failedCount,
      addedEmails: addedEmails,
      errors: errors,
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ACTION 3: removeMember
 * Removes a single specified member email from the Google Group AND adds it to the exclusion list.
 * Updates the member cache accordingly.
 */
function handleRemoveMember(payload) {
  const groupEmail = payload.groupEmail || getGroupEmail();
  const targetEmail = normalizeEmail(payload.email || payload.targetEmail);

  if (!targetEmail) {
    return {
      success: false,
      code: 'EMAIL_REQUIRED',
      message: 'A valid email address is required to remove a member.',
    };
  }

  let removalSucceeded = false;
  let removalMessage = '';

  try {
    if (typeof AdminDirectory !== 'undefined' && AdminDirectory.Members && typeof AdminDirectory.Members.delete === 'function') {
      try {
        AdminDirectory.Members.delete(groupEmail, targetEmail);
        removalSucceeded = true;
        removalMessage = 'Successfully removed member from Google Group.';
      } catch (delErr) {
        const errStr = delErr.toString();
        // 404 means member was already not in group -> removal goal achieved
        if (errStr.includes('404') || errStr.includes('notFound') || errStr.includes('Resource Not Found')) {
          removalSucceeded = true;
          removalMessage = 'Member was already absent from Google Group.';
        } else {
          throw delErr;
        }
      }
    } else {
      // Fallback: If AdminDirectory is unavailable, still record the manual exclusion so they are never added by future syncs
      addExcludedEmail(targetEmail);
      invalidateMemberCache(groupEmail);
      return {
        success: true,
        code: 'EXCLUSION_RECORDED',
        message: 'Direct API removal requires Google Workspace Admin. Member email has been permanently excluded from future automatic syncs. Please remove existing access from groups.google.com if still active.',
        groupEmail: groupEmail,
        email: targetEmail,
        excludedFromFutureSync: true,
      };
    }
  } catch (err) {
    const errMsg = err.toString();
    Logger.log('❌ removeMember Error for ' + targetEmail + ': ' + errMsg);
    return {
      success: false,
      code: 'REMOVE_FAILED',
      message: 'Failed to remove ' + targetEmail + ' from Google Group: ' + err.message,
      email: targetEmail,
      excludedFromFutureSync: false,
    };
  }

  if (removalSucceeded) {
    // Record exclusion in persistent store
    addExcludedEmail(targetEmail);

    // Update or invalidate cache
    const cached = getCachedMembers(groupEmail);
    if (cached && Array.isArray(cached)) {
      const filtered = cached.filter(function (m) { return m.email !== targetEmail; });
      setCachedMembers(groupEmail, filtered, 300);
    } else {
      invalidateMemberCache(groupEmail);
    }

    return {
      success: true,
      message: removalMessage + ' Excluded from future automatic synchronizations.',
      groupEmail: groupEmail,
      email: targetEmail,
      excludedFromFutureSync: true,
    };
  }

  return {
    success: false,
    code: 'REMOVE_INCOMPLETE',
    message: 'Could not complete removal operation.',
    email: targetEmail,
    excludedFromFutureSync: false,
  };
}

/**
 * ACTION 4: getExclusions
 * Retrieves all currently excluded emails
 */
function handleGetExclusions(payload) {
  const exclusions = getExcludedEmails();
  return {
    success: true,
    count: exclusions.length,
    exclusions: exclusions,
    targetGroup: getGroupEmail(),
  };
}

/**
 * ACTION 5: addExclusion
 * Explicitly excludes an email from future automatic syncs without attempting deletion
 */
function handleAddExclusion(payload) {
  const targetEmail = normalizeEmail(payload.email || payload.targetEmail);
  if (!targetEmail) {
    return {
      success: false,
      code: 'EMAIL_REQUIRED',
      message: 'A valid email address is required to add an exclusion.',
    };
  }

  const saved = addExcludedEmail(targetEmail);
  return {
    success: saved,
    email: targetEmail,
    excludedFromFutureSync: true,
    message: saved ? 'Email added to persistent exclusion list.' : 'Failed to save exclusion.',
  };
}

/**
 * ACTION 6: removeExclusion
 * Removes an email from the exclusion list (Restores automatic sync eligibility)
 */
function handleRemoveExclusion(payload) {
  const targetEmail = normalizeEmail(payload.email || payload.targetEmail);
  if (!targetEmail) {
    return {
      success: false,
      code: 'EMAIL_REQUIRED',
      message: 'A valid email address is required to restore sync eligibility.',
    };
  }

  const removed = removeExcludedEmail(targetEmail);
  return {
    success: removed,
    email: targetEmail,
    restored: true,
    message: removed
      ? 'Automatic sync restored for ' + targetEmail + '. The member will be eligible to be added during subsequent synchronizations.'
      : 'Failed to update exclusion store.',
  };
}

/**
 * ACTION 7: healthCheck
 * Diagnostic function to verify GroupsApp connectivity and access
 */
function handleHealthCheck(payload) {
  const groupEmail = payload.groupEmail || getGroupEmail();

  try {
    const cached = getCachedMembers(groupEmail);
    const exclusions = getExcludedEmails();

    if (cached) {
      return {
        success: true,
        status: 'ONLINE',
        groupEmail: groupEmail,
        memberCount: cached.length,
        excludedCount: exclusions.length,
        groupsAppConnected: true,
        cached: true,
        timestamp: new Date().toISOString(),
      };
    }

    const group = GroupsApp.getGroupByEmail(groupEmail);
    if (!group) {
      return {
        success: false,
        status: 'GROUP_NOT_FOUND',
        groupEmail: groupEmail,
        message: 'Google Group not found or not accessible by this Google account: ' + groupEmail,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      status: 'ONLINE',
      groupEmail: groupEmail,
      excludedCount: exclusions.length,
      groupsAppConnected: true,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      status: 'DEGRADED',
      groupEmail: groupEmail,
      groupsAppConnected: false,
      message: 'GroupsApp access error: ' + err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ============================================================================
 * SAFE MANUAL DIAGNOSTIC TEST FUNCTION
 * ============================================================================
 * Run this function inside the Apps Script Editor to test reading members and exclusions.
 * Logs ONLY success/failure, group email, and member count.
 * NEVER logs secrets or the full member list.
 */
function testGoogleGroupAccess() {
  const targetGroupEmail = getGroupEmail();
  Logger.log('====================================================');
  Logger.log('🔍 Testing Google Group access via GroupsApp...');
  Logger.log('   Target Group: ' + targetGroupEmail);

  try {
    const group = GroupsApp.getGroupByEmail(targetGroupEmail);
    if (!group) {
      Logger.log('❌ Result: Group not found or not accessible by this Google account.');
      return;
    }

    const users = group.getUsers();
    const exclusions = getExcludedEmails();
    Logger.log('✅ Result: SUCCESS!');
    Logger.log('   Group Email:    ' + targetGroupEmail);
    Logger.log('   Member Count:   ' + (users ? users.length : 0));
    Logger.log('   Excluded Count: ' + exclusions.length);
    Logger.log('====================================================');
  } catch (err) {
    Logger.log('❌ Result: FAILED — ' + err.toString());
    Logger.log('====================================================');
  }
}

/**
 * ============================================================================
 * TIME-DRIVEN STANDALONE TRIGGER FUNCTION (Exclusion-Aware)
 * ============================================================================
 */
function syncGoogleGroupMembers() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('⚠️ [ZENEMOO GOOGLE GROUP SYNC] Job skipped: Another synchronization task is currently holding the script lock.');
    return;
  }

  try {
    const startTime = new Date();
    Logger.log('====================================================');
    Logger.log('🚀 [ZENEMOO GOOGLE GROUP SYNC] Job started at ' + startTime.toISOString());
    Logger.log('====================================================');

    const backendUrl = PropertiesService.getScriptProperties().getProperty('ZENEMOO_BACKEND_URL') || CONFIG.DEFAULT_BACKEND_URL;
    const targetGroupEmail = getGroupEmail();
    const syncSecret = getSecret();

    if (!syncSecret) {
      Logger.log('❌ ERROR: GOOGLE_GROUP_SYNC_SECRET is not configured in Script Properties.');
      return;
    }

    // 1. Fetch eligible emails from backend
    let eligibleEmails = [];
    try {
      const response = UrlFetchApp.fetch(backendUrl, {
        method: 'get',
        headers: {
          'x-zenemoo-sync-secret': syncSecret,
          'Accept': 'application/json',
        },
        muteHttpExceptions: true,
      });

      if (response.getResponseCode() !== 200) {
        Logger.log('❌ Backend request failed with status ' + response.getResponseCode());
        return;
      }

      const payload = JSON.parse(response.getContentText());
      if (payload.success && Array.isArray(payload.emails)) {
        eligibleEmails = payload.emails;
      }
    } catch (err) {
      Logger.log('❌ Exception during backend fetch: ' + err.toString());
      return;
    }

    if (eligibleEmails.length === 0) {
      Logger.log('ℹ️ No eligible emails returned. Job complete.');
      return;
    }

    // 2. Read existing members via GroupsApp (uses CacheService / single read)
    const memberResult = handleGetGroupMembers({ groupEmail: targetGroupEmail });
    if (!memberResult || memberResult.success === false || !Array.isArray(memberResult.members)) {
      Logger.log('❌ [ZENEMOO GOOGLE GROUP SYNC] Safe abort: Unable to safely read current Google Group membership (' + ((memberResult && (memberResult.code || memberResult.message)) || 'Unknown Error') + ').');
      Logger.log('   Sync cycle aborted to protect Google Group integrity and prevent unwanted duplicate additions.');
      return;
    }

    const existingSet = new Set((memberResult.members || []).map(function (m) { return m.email; }));

    // 3. Read exclusion list
    const exclusionSet = new Set(getExcludedEmails().map(function (item) { return item.email; }));

    // 4. Filter candidate emails (must NOT be in existing group AND must NOT be excluded)
    const missing = [];
    let skippedExcludedCount = 0;

    for (let i = 0; i < eligibleEmails.length; i++) {
      const clean = normalizeEmail(eligibleEmails[i]);
      if (!clean) continue;

      if (exclusionSet.has(clean)) {
        skippedExcludedCount++;
        continue;
      }

      if (!existingSet.has(clean)) {
        missing.push(clean);
      }
    }

    Logger.log('📊 Eligible in backend: ' + eligibleEmails.length + ' | Existing in group: ' + existingSet.size + ' | Excluded: ' + skippedExcludedCount + ' | Missing to add: ' + missing.length);

    if (missing.length === 0) {
      Logger.log('🎉 Google Group is already 100% synchronized! (Zero pending additions)');
      return;
    }

    // 5. Batch add non-excluded missing candidates
    const syncRes = handleSyncMembers({ groupEmail: targetGroupEmail, emails: missing.slice(0, CONFIG.MAX_ADDITIONS_PER_RUN) });

    Logger.log('🏁 Sync Finished — Added: ' + syncRes.addedCount + ' | Skipped: ' + syncRes.skippedCount + ' | Excluded: ' + syncRes.excludedCount + ' | Failed: ' + syncRes.failedCount);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Health Check & Diagnostic function (Preserved)
 */
function testBackendConnectivity() {
  const backendUrl = PropertiesService.getScriptProperties().getProperty('ZENEMOO_BACKEND_URL') || CONFIG.DEFAULT_BACKEND_URL;
  const syncSecret = getSecret();

  Logger.log('🔍 Testing connection to ' + backendUrl + '...');
  try {
    const res = UrlFetchApp.fetch(backendUrl, {
      method: 'get',
      headers: { 'x-zenemoo-sync-secret': syncSecret },
      muteHttpExceptions: true,
    });
    Logger.log('HTTP Status Code: ' + res.getResponseCode());
    Logger.log('Response Payload: ' + res.getContentText());
  } catch (e) {
    Logger.log('Connection failed: ' + e.toString());
  }
}

/**
 * ============================================================================
 * AUTOMATIC DAILY TRIGGER SETUP & MANAGEMENT
 * ============================================================================
 */

/**
 * Sets up a time-driven trigger to automatically execute syncGoogleGroupMembers()
 * once every day. Prevents duplicate triggers and ensures exactly ONE daily trigger exists.
 */
function setupDailyGoogleGroupSyncTrigger() {
  Logger.log('====================================================');
  Logger.log('⚙️ [TRIGGER SETUP] Configuring Daily Google Group Sync Trigger...');
  Logger.log('====================================================');

  const handlerFunctionName = 'syncGoogleGroupMembers';
  const allTriggers = ScriptApp.getProjectTriggers();
  let existingTriggerCount = 0;
  let activeTrigger = null;

  // 1. Identify all existing triggers for syncGoogleGroupMembers
  for (let i = 0; i < allTriggers.length; i++) {
    const trigger = allTriggers[i];
    if (trigger.getHandlerFunction() === handlerFunctionName) {
      existingTriggerCount++;
      if (!activeTrigger) {
        activeTrigger = trigger;
      } else {
        // Delete redundant duplicate trigger
        Logger.log('🧹 Removing duplicate trigger ID: ' + trigger.getUniqueId());
        ScriptApp.deleteTrigger(trigger);
      }
    }
  }

  // 2. If exactly one trigger already exists, log and keep it
  if (existingTriggerCount >= 1 && activeTrigger) {
    Logger.log('✅ Daily sync trigger is ALREADY configured and active.');
    Logger.log('   Handler Function: ' + handlerFunctionName);
    Logger.log('   Trigger ID:       ' + activeTrigger.getUniqueId());
    Logger.log('   Schedule:         Daily (every 24 hours)');
    Logger.log('====================================================');
    return {
      status: 'ALREADY_EXISTS',
      message: 'Trigger already exists and is active.',
      triggerId: activeTrigger.getUniqueId(),
    };
  }

  // 3. If no trigger exists, create exactly ONE daily time-driven trigger
  try {
    const newTrigger = ScriptApp.newTrigger(handlerFunctionName)
      .timeBased()
      .everyDays(1)
      .atHour(2) // Runs daily between 2:00 AM - 3:00 AM script timezone
      .create();

    Logger.log('🎉 SUCCESS: Created 1 daily automatic sync trigger.');
    Logger.log('   Handler Function: ' + handlerFunctionName);
    Logger.log('   Trigger ID:       ' + newTrigger.getUniqueId());
    Logger.log('   Schedule:         Daily (every 1 day at ~2:00 AM)');
    Logger.log('====================================================');

    return {
      status: 'CREATED',
      message: 'Daily sync trigger successfully created.',
      triggerId: newTrigger.getUniqueId(),
    };
  } catch (err) {
    Logger.log('❌ FAILED to create daily sync trigger: ' + err.toString());
    Logger.log('====================================================');
    return {
      status: 'ERROR',
      message: 'Failed to create trigger: ' + err.message,
    };
  }
}

/**
 * Removes all active triggers for syncGoogleGroupMembers().
 * Safe cleanup utility for administrators.
 */
function removeGoogleGroupSyncTriggers() {
  Logger.log('====================================================');
  Logger.log('🗑️ [TRIGGER CLEANUP] Removing Google Group Sync Triggers...');
  Logger.log('====================================================');

  const handlerFunctionName = 'syncGoogleGroupMembers';
  const allTriggers = ScriptApp.getProjectTriggers();
  let removedCount = 0;

  for (let i = 0; i < allTriggers.length; i++) {
    const trigger = allTriggers[i];
    if (trigger.getHandlerFunction() === handlerFunctionName) {
      const id = trigger.getUniqueId();
      ScriptApp.deleteTrigger(trigger);
      Logger.log('   Removed trigger ID: ' + id);
      removedCount++;
    }
  }

  Logger.log('✅ Cleanup complete. Total triggers removed: ' + removedCount);
  Logger.log('====================================================');

  return {
    status: 'SUCCESS',
    removedCount: removedCount,
  };
}


