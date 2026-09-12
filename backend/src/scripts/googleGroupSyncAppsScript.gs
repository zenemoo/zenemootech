/**
 * ============================================================================
 * ZENEMOO GOOGLE GROUP AUTOMATIC EMAIL SYNCHRONIZATION WEB APP & TRIGGER
 * Target Group: zenemoocommunity@googlegroups.com
 * ============================================================================
 * 
 * DESCRIPTION:
 * 1. Web App (doPost): Secure command receiver for the Zenemoo Backend & Admin Panel
 *    - getGroupMembers : Read complete paginated member list and count
 *    - syncMembers     : Add missing community members (strictly add-only)
 *    - removeMember    : Safely remove a single specified member
 *    - healthCheck     : Diagnostic connectivity and permission verification
 * 
 * 2. Automated Job (syncGoogleGroupMembers):
 *    - Daily Time-driven trigger pull synchronization
 * 
 * SECURITY:
 * - Requires secret verification for all incoming Web App requests (GOOGLE_GROUP_SYNC_SECRET)
 * - Zero secrets exposed in output payloads or logging
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Apps Script (https://script.google.com).
 * 2. Create/open the project: "Zenemoo Google Group Sync".
 * 3. Paste this code into `Code.gs`.
 * 4. Enable the Admin SDK Directory API:
 *    - Click "+" next to "Services" in the left sidebar.
 *    - Select "Admin SDK API" (Identifier: `AdminDirectory`).
 *    - Click "Add".
 * 5. Configure Script Properties (Project Settings > Script Properties):
 *    - `GOOGLE_GROUP_SYNC_SECRET` : <your-secure-sync-secret>
 *    - `GOOGLE_GROUP_EMAIL`       : zenemoocommunity@googlegroups.com
 *    - `ZENEMOO_BACKEND_URL`      : https://api.zenemoo.in/api/admin/google-group/eligible-emails
 * 6. Deploy as Web App (Deploy > New Deployment > Web App):
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
  PAUSE_BETWEEN_REQUESTS_MS: 150, // Micro-delay to comply with Google Admin API rate limits
};

// Standard RFC-compliant email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

      case 'healthCheck':
        return jsonResponse(handleHealthCheck(payload));

      default:
        return jsonResponse({
          success: false,
          code: 'UNKNOWN_ACTION',
          message: 'Unsupported action "' + action + '". Available actions: getGroupMembers, syncMembers, removeMember, healthCheck.',
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

    if (action === 'healthCheck') {
      return jsonResponse(handleHealthCheck(params));
    }

    // Explicitly prohibit mutating actions over GET
    if (action === 'syncMembers' || action === 'removeMember') {
      return jsonResponse({
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Mutating actions ("' + action + '") must be executed via HTTP POST.',
      });
    }

    return jsonResponse({
      success: false,
      code: 'UNKNOWN_ACTION',
      message: 'Unsupported GET action "' + action + '". Supported read actions: getGroupMembers, healthCheck.',
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
 * ACTION 1: getGroupMembers
 * Lists all members from the Google Group with full pagination support
 */
function handleGetGroupMembers(payload) {
  const groupEmail = payload.groupEmail || getGroupEmail();
  const members = [];
  let pageToken = null;

  try {
    do {
      const listParams = {
        groupKey: groupEmail,
        maxResults: 200,
      };
      if (pageToken) listParams.pageToken = pageToken;

      const page = AdminDirectory.Members.list(groupEmail, listParams);
      if (page.members && Array.isArray(page.members)) {
        for (let i = 0; i < page.members.length; i++) {
          const m = page.members[i];
          if (m.email) {
            members.push({
              id: m.id || null,
              email: m.email.trim().toLowerCase(),
              role: m.role || 'MEMBER',
              type: m.type || 'USER',
              status: m.status || 'ACTIVE',
              deliverySettings: m.delivery_settings || 'ALL_MAIL',
            });
          }
        }
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    return {
      success: true,
      groupEmail: groupEmail,
      count: members.length,
      members: members,
    };
  } catch (err) {
    Logger.log('❌ getGroupMembers Error: ' + err.toString());
    return {
      success: false,
      code: 'DIRECTORY_LIST_ERROR',
      groupEmail: groupEmail,
      message: 'Failed to retrieve group members: ' + err.message,
      members: [],
      count: 0,
    };
  }
}

/**
 * ACTION 2: syncMembers
 * Adds provided missing email addresses into the Google Group (strictly Add-Only)
 */
function handleSyncMembers(payload) {
  const groupEmail = payload.groupEmail || getGroupEmail();
  const rawCandidateEmails = Array.isArray(payload.emails)
    ? payload.emails
    : Array.isArray(payload.members)
    ? payload.members
    : [];

  let addedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const errors = [];

  for (let i = 0; i < rawCandidateEmails.length; i++) {
    const clean = normalizeEmail(rawCandidateEmails[i]);
    if (!clean) {
      continue;
    }

    try {
      const memberResource = {
        email: clean,
        role: 'MEMBER',
      };

      AdminDirectory.Members.insert(memberResource, groupEmail);
      addedCount++;

      // Micro-pause to prevent quota rate-limit throttling
      if (CONFIG.PAUSE_BETWEEN_REQUESTS_MS > 0) {
        Utilities.sleep(CONFIG.PAUSE_BETWEEN_REQUESTS_MS);
      }
    } catch (insertErr) {
      const errMsg = insertErr.toString();
      // Gracefully handle duplicate/already-exists conditions (409 or memberExists)
      if (errMsg.includes('409') || errMsg.includes('already exists') || errMsg.includes('memberExists')) {
        skippedCount++;
      } else {
        failedCount++;
        errors.push({ email: clean, error: errMsg });
      }
    }
  }

  return {
    success: true,
    groupEmail: groupEmail,
    totalReceived: rawCandidateEmails.length,
    addedCount: addedCount,
    skippedCount: skippedCount,
    failedCount: failedCount,
    errors: errors,
  };
}

/**
 * ACTION 3: removeMember
 * Removes a single specified member email from the Google Group
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

  try {
    AdminDirectory.Members.delete(groupEmail, targetEmail);
    return {
      success: true,
      message: 'Successfully removed member from Google Group.',
      groupEmail: groupEmail,
      email: targetEmail,
    };
  } catch (err) {
    const errMsg = err.toString();
    Logger.log('❌ removeMember Error for ' + targetEmail + ': ' + errMsg);
    return {
      success: false,
      code: 'REMOVE_FAILED',
      message: 'Failed to remove ' + targetEmail + ' from Google Group: ' + err.message,
      email: targetEmail,
    };
  }
}

/**
 * ACTION 4: healthCheck
 * Diagnostic function to verify Admin Directory API access
 */
function handleHealthCheck(payload) {
  const groupEmail = payload.groupEmail || getGroupEmail();
  let adminDirectoryConnected = false;
  let sampleCount = 0;

  try {
    const testPage = AdminDirectory.Members.list(groupEmail, { maxResults: 1 });
    adminDirectoryConnected = true;
    sampleCount = testPage.members ? testPage.members.length : 0;

    return {
      success: true,
      status: 'ONLINE',
      groupEmail: groupEmail,
      adminDirectoryConnected: true,
      sampleMemberFound: sampleCount > 0,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      status: 'DEGRADED',
      groupEmail: groupEmail,
      adminDirectoryConnected: false,
      message: 'Admin Directory access warning: ' + err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * ============================================================================
 * TIME-DRIVEN STANDALONE TRIGGER FUNCTION (Preserved)
 * ============================================================================
 */
function syncGoogleGroupMembers() {
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

  // 2. Read existing members
  const memberResult = handleGetGroupMembers({ groupEmail: targetGroupEmail });
  const existingSet = new Set((memberResult.members || []).map((m) => m.email));

  // 3. Filter missing
  const missing = [];
  for (let i = 0; i < eligibleEmails.length; i++) {
    const clean = normalizeEmail(eligibleEmails[i]);
    if (clean && !existingSet.has(clean)) {
      missing.push(clean);
    }
  }

  Logger.log('📊 Eligible in backend: ' + eligibleEmails.length + ' | Existing in group: ' + existingSet.size + ' | Missing to add: ' + missing.length);

  if (missing.length === 0) {
    Logger.log('🎉 Google Group is already 100% synchronized!');
    return;
  }

  // 4. Batch add missing
  const syncRes = handleSyncMembers({ groupEmail: targetGroupEmail, emails: missing.slice(0, CONFIG.MAX_ADDITIONS_PER_RUN) });

  Logger.log('🏁 Sync Finished — Added: ' + syncRes.addedCount + ' | Skipped: ' + syncRes.skippedCount + ' | Failed: ' + syncRes.failedCount);
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
