import { supabase } from '../config/supabase.js';

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
 * Safely adds an array or single email value into the accumulator Set
 * @param {Set<string>} emailSet
 * @param {string|null|undefined} emailValue
 * @param {string} sourceName
 * @param {Object} breakdownCounts
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
 * GET /api/admin/google-group/eligible-emails
 * Retrieves a deduplicated, normalized list of all eligible community emails across Supabase data sources.
 * Optimized for zero unnecessary egress: Explicit column selection ONLY. Zero full-table wildcards.
 */
export const getEligibleCommunityEmails = async (req, res, next) => {
  try {
    const targetGroupEmail = process.env.GOOGLE_GROUP_EMAIL || 'zenemoocommunity@googlegroups.com';
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
      return res.status(503).json({
        success: false,
        message: 'Supabase client is not initialized on the server.',
      });
    }

    // Execute independent, targeted single-column queries in parallel for maximum throughput & minimum egress
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
      // 1. Subscribers: active subscribers only
      supabase
        .from('subscribers')
        .select('email')
        .neq('status', 'unsubscribed'),

      // 2. Talent Registrations: non-archived, non-banned talent
      supabase
        .from('talent_registrations')
        .select('email')
        .eq('is_archived', false)
        .neq('status', 'banned')
        .neq('status', 'rejected'),

      // 3. Opportunity Applications: applicants & referrers, excluding rejected
      supabase
        .from('opportunity_applications')
        .select('applicant_email, referrer_email')
        .neq('status', 'rejected'),

      // 4. Call Bookings: confirmed / pending / completed meetings, excluding cancelled / no_show
      supabase
        .from('call_bookings')
        .select('email')
        .neq('status', 'cancelled')
        .neq('status', 'no_show'),

      // 5. Contacts: inbound contact inquiries
      supabase
        .from('contacts')
        .select('email'),

      // 6. Talent Team Members: active talent agency / vendor members
      supabase
        .from('talent_team_members')
        .select('email')
        .neq('status', 'inactive'),

      // 7. Support Tickets: inbound customer support inquiries
      supabase
        .from('support_tickets')
        .select('user_email'),

      // 8. Support Payments: verified supporters & contributors
      supabase
        .from('support_payments')
        .select('customer_email')
        .eq('status', 'SUCCESS'),
    ]);

    // 1. Process Subscribers
    if (subscribersRes.status === 'fulfilled' && subscribersRes.value?.data) {
      for (const row of subscribersRes.value.data) {
        addEmailToSet(emailSet, row.email, 'subscribers', sourceBreakdown);
      }
    } else if (subscribersRes.status === 'rejected') {
      console.warn('[GoogleGroupSync] subscribers query warning:', subscribersRes.reason?.message);
    }

    // 2. Process Talent Registrations
    if (talentRes.status === 'fulfilled' && talentRes.value?.data) {
      for (const row of talentRes.value.data) {
        addEmailToSet(emailSet, row.email, 'talent_registrations', sourceBreakdown);
      }
    } else if (talentRes.status === 'rejected') {
      console.warn('[GoogleGroupSync] talent_registrations query warning:', talentRes.reason?.message);
    }

    // 3. Process Opportunity Applications (both applicant_email & referrer_email)
    if (applicationsRes.status === 'fulfilled' && applicationsRes.value?.data) {
      for (const row of applicationsRes.value.data) {
        if (row.applicant_email) {
          addEmailToSet(emailSet, row.applicant_email, 'opportunity_applications', sourceBreakdown);
        }
        if (row.referrer_email) {
          addEmailToSet(emailSet, row.referrer_email, 'opportunity_applications', sourceBreakdown);
        }
      }
    } else if (applicationsRes.status === 'rejected') {
      console.warn('[GoogleGroupSync] opportunity_applications query warning:', applicationsRes.reason?.message);
    }

    // 4. Process Call Bookings
    if (bookingsRes.status === 'fulfilled' && bookingsRes.value?.data) {
      for (const row of bookingsRes.value.data) {
        addEmailToSet(emailSet, row.email, 'call_bookings', sourceBreakdown);
      }
    } else if (bookingsRes.status === 'rejected') {
      console.warn('[GoogleGroupSync] call_bookings query warning:', bookingsRes.reason?.message);
    }

    // 5. Process Contacts
    if (contactsRes.status === 'fulfilled' && contactsRes.value?.data) {
      for (const row of contactsRes.value.data) {
        addEmailToSet(emailSet, row.email, 'contacts', sourceBreakdown);
      }
    } else if (contactsRes.status === 'rejected') {
      console.warn('[GoogleGroupSync] contacts query warning:', contactsRes.reason?.message);
    }

    // 6. Process Talent Team Members
    if (talentTeamRes.status === 'fulfilled' && talentTeamRes.value?.data) {
      for (const row of talentTeamRes.value.data) {
        addEmailToSet(emailSet, row.email, 'talent_team_members', sourceBreakdown);
      }
    } else if (talentTeamRes.status === 'rejected') {
      console.warn('[GoogleGroupSync] talent_team_members query warning:', talentTeamRes.reason?.message);
    }

    // 7. Process Support Tickets
    if (supportTicketsRes.status === 'fulfilled' && supportTicketsRes.value?.data) {
      for (const row of supportTicketsRes.value.data) {
        addEmailToSet(emailSet, row.user_email, 'support_tickets', sourceBreakdown);
      }
    } else if (supportTicketsRes.status === 'rejected') {
      console.warn('[GoogleGroupSync] support_tickets query warning:', supportTicketsRes.reason?.message);
    }

    // 8. Process Support Payments
    if (supportPaymentsRes.status === 'fulfilled' && supportPaymentsRes.value?.data) {
      for (const row of supportPaymentsRes.value.data) {
        addEmailToSet(emailSet, row.customer_email, 'support_payments', sourceBreakdown);
      }
    } else if (supportPaymentsRes.status === 'rejected') {
      console.warn('[GoogleGroupSync] support_payments query warning:', supportPaymentsRes.reason?.message);
    }

    // Convert to sorted array
    const sortedEmails = Array.from(emailSet).sort();

    // Respond with minimal required payload (Strict zero PII)
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
