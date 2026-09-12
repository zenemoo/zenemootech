/**
 * ============================================================================
 * ZENEMOO GOOGLE GROUP AUTOMATIC EMAIL SYNCHRONIZATION SCRIPT
 * Target Group: zenemoocommunity@googlegroups.com
 * ============================================================================
 * 
 * DESCRIPTION:
 * Automatically fetches normalized, eligible community email addresses from the
 * Zenemoo backend aggregation endpoint and adds missing members to the Google Group.
 * 
 * KEY FEATURES:
 * - Strictly ADD-ONLY (Never removes existing members)
 * - In-memory case-insensitive deduplication
 * - Handles duplicate membership errors (409) gracefully
 * - Detailed execution audit logging
 * - Optimized for Google Apps Script execution time & quota limits
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Apps Script (https://script.google.com).
 * 2. Create a new project (e.g., "Zenemoo Google Group Sync").
 * 3. Paste this code into `Code.gs`.
 * 4. Enable the Admin SDK Directory API:
 *    - In the left sidebar, click the "+" next to "Services".
 *    - Select "Admin SDK API" (Directory API).
 *    - Click "Add".
 * 5. Configure Script Properties (Project Settings > Script Properties):
 *    - Property: `ZENEMOO_BACKEND_URL` -> Value: `https://api.zenemoo.in/api/admin/google-group/eligible-emails`
 *    - Property: `GOOGLE_GROUP_SYNC_SECRET` -> Value: `<your-secure-sync-secret>`
 *    - Property: `GOOGLE_GROUP_EMAIL` -> Value: `zenemoocommunity@googlegroups.com`
 * 6. (Optional) Run `syncGoogleGroupMembers()` once manually to authorize permissions.
 * 7. Set up Daily Time-Driven Trigger (Triggers icon on left > Add Trigger > Time-driven > Day timer).
 * ============================================================================
 */

// Global Configuration Defaults (Overridable via Script Properties)
const CONFIG = {
  DEFAULT_BACKEND_URL: 'https://api.zenemoo.in/api/admin/google-group/eligible-emails',
  DEFAULT_GROUP_EMAIL: 'zenemoocommunity@googlegroups.com',
  DEFAULT_SECRET: '', // Recommended: set via Script Properties
  MAX_ADDITIONS_PER_RUN: 100, // Safety limit per execution cycle
  PAUSE_BETWEEN_REQUESTS_MS: 150, // Micro-delay to comply with Google Admin API rate limits
};

/**
 * Main Synchronization Function
 * Can be run manually or invoked on a daily/hourly time-driven trigger.
 */
function syncGoogleGroupMembers() {
  const startTime = new Date();
  Logger.log('====================================================');
  Logger.log('🚀 [ZENEMOO GOOGLE GROUP SYNC] Job started at ' + startTime.toISOString());
  Logger.log('====================================================');

  const scriptProps = PropertiesService.getScriptProperties().getProperties();
  const backendUrl = scriptProps.ZENEMOO_BACKEND_URL || CONFIG.DEFAULT_BACKEND_URL;
  const targetGroupEmail = scriptProps.GOOGLE_GROUP_EMAIL || CONFIG.DEFAULT_GROUP_EMAIL;
  const syncSecret = scriptProps.GOOGLE_GROUP_SYNC_SECRET || CONFIG.DEFAULT_SECRET;

  if (!syncSecret) {
    Logger.log('❌ ERROR: GOOGLE_GROUP_SYNC_SECRET is not configured in Script Properties.');
    return;
  }

  // --------------------------------------------------------------------------
  // Step 1: Fetch eligible unique community emails from Zenemoo backend
  // --------------------------------------------------------------------------
  Logger.log('📡 Step 1: Fetching eligible emails from backend endpoint: ' + backendUrl);
  
  let eligibleEmails = [];
  try {
    const fetchOptions = {
      method: 'get',
      headers: {
        'x-zenemoo-sync-secret': syncSecret,
        'Accept': 'application/json',
      },
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(backendUrl, fetchOptions);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode !== 200) {
      Logger.log('❌ Backend request failed with status ' + responseCode + ': ' + responseBody);
      return;
    }

    const payload = JSON.parse(responseBody);
    if (!payload.success || !Array.isArray(payload.emails)) {
      Logger.log('❌ Backend returned unexpected payload structure: ' + responseBody);
      return;
    }

    eligibleEmails = payload.emails;
    Logger.log('✅ Successfully fetched ' + eligibleEmails.length + ' unique eligible emails from backend.');
  } catch (err) {
    Logger.log('❌ Exception during backend email fetch: ' + err.toString());
    return;
  }

  if (eligibleEmails.length === 0) {
    Logger.log('ℹ️ No eligible emails returned. Sync complete.');
    return;
  }

  // --------------------------------------------------------------------------
  // Step 2: Retrieve existing members from the target Google Group
  // --------------------------------------------------------------------------
  Logger.log('📋 Step 2: Fetching existing members of ' + targetGroupEmail + ' via Admin SDK Directory API...');
  
  const existingMembersSet = new Set();
  try {
    let pageToken = null;
    do {
      const listParams = {
        groupKey: targetGroupEmail,
        maxResults: 200,
      };
      if (pageToken) listParams.pageToken = pageToken;

      const page = AdminDirectory.Members.list(targetGroupEmail, listParams);
      if (page.members && Array.isArray(page.members)) {
        for (let i = 0; i < page.members.length; i++) {
          const m = page.members[i];
          if (m.email) {
            existingMembersSet.add(m.email.trim().toLowerCase());
          }
        }
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    Logger.log('✅ Found ' + existingMembersSet.size + ' existing members in Google Group.');
  } catch (err) {
    Logger.log('⚠️ Could not list members via AdminDirectory (will rely on add-only insertion error catching): ' + err.toString());
  }

  // --------------------------------------------------------------------------
  // Step 3: Filter for missing members (Add-Only)
  // --------------------------------------------------------------------------
  const missingEmails = [];
  for (let i = 0; i < eligibleEmails.length; i++) {
    const clean = eligibleEmails[i].trim().toLowerCase();
    if (clean && !existingMembersSet.has(clean)) {
      missingEmails.push(clean);
    }
  }

  Logger.log('📊 Sync Status Comparison:');
  Logger.log('   - Total eligible emails in backend: ' + eligibleEmails.length);
  Logger.log('   - Existing members in group:       ' + existingMembersSet.size);
  Logger.log('   - New members to add:              ' + missingEmails.length);

  if (missingEmails.length === 0) {
    Logger.log('🎉 Google Group is already 100% synchronized! No new additions needed.');
    return;
  }

  // --------------------------------------------------------------------------
  // Step 4: Add missing members to Google Group
  // --------------------------------------------------------------------------
  let addedCount = 0;
  let alreadyMemberCount = 0;
  let failedCount = 0;

  const emailsToProcess = missingEmails.slice(0, CONFIG.MAX_ADDITIONS_PER_RUN);
  if (missingEmails.length > CONFIG.MAX_ADDITIONS_PER_RUN) {
    Logger.log('⚠️ Notice: Processing ' + emailsToProcess.length + ' members this run to respect rate limits. Remaining will process next run.');
  }

  for (let i = 0; i < emailsToProcess.length; i++) {
    const candidateEmail = emailsToProcess[i];
    try {
      const memberResource = {
        email: candidateEmail,
        role: 'MEMBER',
      };

      AdminDirectory.Members.insert(memberResource, targetGroupEmail);
      addedCount++;
      Logger.log('   [+' + (i + 1) + '/' + emailsToProcess.length + '] Added: ' + candidateEmail);
      
      // Micro-pause to prevent quota rate-limit throttling
      if (CONFIG.PAUSE_BETWEEN_REQUESTS_MS > 0) {
        Utilities.sleep(CONFIG.PAUSE_BETWEEN_REQUESTS_MS);
      }
    } catch (insertErr) {
      const errMsg = insertErr.toString();
      // Handle already-exists error gracefully (Code 409 or Member already exists)
      if (errMsg.includes('409') || errMsg.includes('already exists') || errMsg.includes('memberExists')) {
        alreadyMemberCount++;
        Logger.log('   [INFO] ' + candidateEmail + ' is already a member (skipped).');
      } else {
        failedCount++;
        Logger.log('   [ERROR] Failed to add ' + candidateEmail + ': ' + errMsg);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Step 5: Final Execution Summary Log
  // --------------------------------------------------------------------------
  const durationMs = new Date().getTime() - startTime.getTime();
  Logger.log('====================================================');
  Logger.log('🏁 [JOB SUMMARY]');
  Logger.log('   - Execution Time:    ' + (durationMs / 1000).toFixed(2) + ' seconds');
  Logger.log('   - Total Processed:   ' + eligibleEmails.length);
  Logger.log('   - Already Members:   ' + (existingMembersSet.size + alreadyMemberCount));
  Logger.log('   - Newly Added:       ' + addedCount);
  Logger.log('   - Skipped / Failed:  ' + failedCount);
  Logger.log('====================================================');
}

/**
 * Health Check & Diagnostic function
 * Run this function from the Apps Script editor to test connectivity before scheduling.
 */
function testBackendConnectivity() {
  const scriptProps = PropertiesService.getScriptProperties().getProperties();
  const backendUrl = scriptProps.ZENEMOO_BACKEND_URL || CONFIG.DEFAULT_BACKEND_URL;
  const syncSecret = scriptProps.GOOGLE_GROUP_SYNC_SECRET || CONFIG.DEFAULT_SECRET;

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
