import { supabase } from '../config/supabase.js';
import { supabaseService } from '../services/supabaseService.js';

export const subscribeNewsletter = async (req, res, next) => {
  try {
    const rawInput = req.body.emails || req.body.email;
    if (!rawInput) {
      return res.status(400).json({ success: false, message: 'Please provide at least one email address.' });
    }

    // 1. Split raw input into raw email tokens
    let rawTokens = [];
    if (Array.isArray(rawInput)) {
      rawTokens = rawInput.flatMap((item) => String(item).split(/[,\s\n\r;]+/));
    } else if (typeof rawInput === 'string') {
      rawTokens = rawInput.split(/[,\s\n\r;]+/);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid email format provided.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validCandidateEmails = [];
    const invalidEmails = [];
    const seenInBatch = new Set();

    // 2. Clean, normalize, and split valid vs invalid emails
    for (let token of rawTokens) {
      if (!token) continue;
      let cleanToken = token.trim().toLowerCase();
      // Remove angle brackets or quotes if present
      cleanToken = cleanToken.replace(/^["'<\(\[]+|["'>\)\],.]+$/g, '').trim();
      if (!cleanToken) continue;

      if (emailRegex.test(cleanToken)) {
        if (!seenInBatch.has(cleanToken)) {
          seenInBatch.add(cleanToken);
          validCandidateEmails.push(cleanToken);
        }
      } else {
        if (!invalidEmails.includes(cleanToken)) {
          invalidEmails.push(cleanToken);
        }
      }
    }

    if (validCandidateEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid email addresses found in the provided input.',
        summary: {
          addedCount: 0,
          skippedCount: 0,
          invalidCount: invalidEmails.length,
          invalidEmails,
        },
      });
    }

    // 3. Query existing subscribers in Supabase database with targeted lookup (Zero full-table scan)
    let existingList = [];
    if (supabase) {
      try {
        const { data: matchedDb } = await supabase
          .from('subscribers')
          .select('id, email, status')
          .in('email', validCandidateEmails);
        existingList = matchedDb || [];
      } catch (e) {
        console.warn('Supabase targeted subscriber check warning:', e.message);
      }
    }

    const existingMap = new Map((existingList || []).map((s) => [s.email.toLowerCase().trim(), s]));

    const alreadySubscribedEmails = [];
    const reactivatedEmails = [];
    const newEmailsToInsert = [];

    for (let cleanEmail of validCandidateEmails) {
      if (existingMap.has(cleanEmail)) {
        const existingRec = existingMap.get(cleanEmail);
        if (existingRec && existingRec.status === 'unsubscribed') {
          reactivatedEmails.push({ record: existingRec, email: cleanEmail });
        } else {
          alreadySubscribedEmails.push(cleanEmail);
        }
      } else {
        newEmailsToInsert.push(cleanEmail);
      }
    }

    // 4. Reactivate unsubscribed subscribers
    const savedRecords = [];
    for (let item of reactivatedEmails) {
      try {
        const updated = await supabaseService.update('subscribers', item.record.id, {
          status: 'active',
          unsubscribed_at: null,
          subscribed_at: new Date().toISOString(),
        });
        if (updated) savedRecords.push(updated);
      } catch (reactivateErr) {
        console.warn(`[Subscriber reactivation note for ${item.email}]:`, reactivateErr.message);
      }
    }

    // 5. Insert ONLY new emails into database
    for (let newEmail of newEmailsToInsert) {
      try {
        const payload = {
          email: newEmail,
          status: 'active',
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        };
        const saved = await supabaseService.insert('subscribers', payload);
        if (saved) savedRecords.push(saved);
      } catch (insertErr) {
        console.warn(`[Bulk subscriber insert note for ${newEmail}]:`, insertErr.message);
        if (
          insertErr.message?.includes('duplicate key') ||
          insertErr.code === '23505' ||
          insertErr.message?.includes('subscribers_email_key')
        ) {
          if (!alreadySubscribedEmails.includes(newEmail)) {
            alreadySubscribedEmails.push(newEmail);
          }
        }
      }
    }

    // 6. Construct user-friendly summary
    let message = 'Subscription request processed.';
    if (savedRecords.length > 0 && alreadySubscribedEmails.length === 0) {
      message = savedRecords.length === 1
        ? `Successfully subscribed ${savedRecords[0].email} to Zenemoo Dispatch!`
        : `Successfully subscribed ${savedRecords.length} email addresses to Zenemoo Dispatch!`;
    } else if (savedRecords.length > 0 && alreadySubscribedEmails.length > 0) {
      message = `Subscribed ${savedRecords.length} new email(s). (${alreadySubscribedEmails.length} were already active subscribers)`;
    } else if (savedRecords.length === 0 && alreadySubscribedEmails.length > 0) {
      message = alreadySubscribedEmails.length === 1
        ? `${alreadySubscribedEmails[0]} is already subscribed to Zenemoo Dispatch.`
        : `All ${alreadySubscribedEmails.length} email addresses are already active subscribers.`;
    }

    return res.status(200).json({
      success: true,
      message,
      summary: {
        addedCount: savedRecords.length,
        skippedCount: alreadySubscribedEmails.length,
        invalidCount: invalidEmails.length,
        addedEmails: savedRecords.map((r) => r.email),
        alreadySubscribedEmails,
        invalidEmails,
      },
      data: savedRecords,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Unsubscribe Newsletter Controller
 */
export const unsubscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        code: 'EMAIL_REQUIRED',
        message: 'Please provide a valid email address to unsubscribe.',
      });
    }

    // Step 1 — Normalize email (trim whitespace, convert to lowercase)
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_EMAIL',
        message: 'Please enter a valid email address format.',
      });
    }

    // Step 2 — Targeted single lookup in public.subscribers table (Zero full-table scan)
    let existingRecord = null;
    if (supabase) {
      try {
        const { data: matched } = await supabase
          .from('subscribers')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
        existingRecord = matched;
      } catch (e) {
        console.warn('Supabase unsubscribe single lookup warning:', e.message);
      }
    }

    // Step 5 — If email does NOT exist in subscribers
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        code: 'NOT_SUBSCRIBED',
        message: "You're not subscribed to Zenemoo Dispatch.",
      });
    }

    // Step 6 — If email exists but is ALREADY unsubscribed
    if (existingRecord.status === 'unsubscribed') {
      return res.status(200).json({
        success: true,
        code: 'ALREADY_UNSUBSCRIBED',
        message: 'This email is already unsubscribed from Zenemoo Dispatch.',
        email: cleanEmail,
        data: existingRecord,
      });
    }

    // Step 4 — If email EXISTS and is Active (status !== 'unsubscribed')
    // DO NOT INSERT A NEW ROW. Update existing row: status = 'unsubscribed', unsubscribed_at = current timestamp
    const nowIso = new Date().toISOString();
    const updatedRecord = await supabaseService.update('subscribers', existingRecord.id, {
      status: 'unsubscribed',
      unsubscribed_at: nowIso,
    });

    console.log(`🔕 [UNSUBSCRIBE] ${cleanEmail} unsubscribed from Zenemoo Dispatch at ${nowIso}`);

    return res.status(200).json({
      success: true,
      code: 'UNSUBSCRIBE_SUCCESS',
      message: 'Successfully unsubscribed',
      email: cleanEmail,
      data: updatedRecord || { ...existingRecord, status: 'unsubscribed', unsubscribed_at: nowIso },
    });
  } catch (err) {
    console.error('unsubscribeNewsletter error:', err.message);
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: "We couldn't process your request right now. Please try again.",
    });
  }
};

// GET /api/subscribers - Database-side pagination & filtering for Admin
export const getSubscribers = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 25, limit = 25, status, search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(pageSize || limit, 10) || 25));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const LIST_COLUMNS = 'id, email, status, subscribed_at, unsubscribed_at, created_at, updated_at';

    if (supabase) {
      try {
        let query = supabase.from('subscribers').select(LIST_COLUMNS, { count: 'exact' });

        if (status && status.trim() && status.toLowerCase() !== 'all') {
          query = query.ilike('status', status.trim());
        }

        if (search && search.trim()) {
          const q = search.trim();
          query = query.ilike('email', `%${q}%`);
        }

        query = query.order('subscribed_at', { ascending: false }).range(from, to);

        // Fetch paginated rows AND lightweight count stats with head: true (zero row egress)
        const [mainRes, activeRes, unsubscribedRes, totalAllRes] = await Promise.all([
          query,
          supabase.from('subscribers').select('id', { count: 'exact', head: true }).neq('status', 'unsubscribed'),
          supabase.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
          supabase.from('subscribers').select('id', { count: 'exact', head: true }),
        ]);

        const { data: dbData, count: totalFiltered, error } = mainRes;

        if (!error && Array.isArray(dbData)) {
          const total = totalFiltered ?? dbData.length;
          const activeCount = activeRes?.count ?? 0;
          const unsubscribedCount = unsubscribedRes?.count ?? 0;
          const totalCount = totalAllRes?.count ?? (activeCount + unsubscribedCount);

          return res.json({
            success: true,
            count: dbData.length,
            total,
            page: pageNum,
            pageSize: limitNum,
            totalPages: Math.max(1, Math.ceil(total / limitNum)),
            totalCount,
            activeCount,
            unsubscribedCount,
            data: dbData,
          });
        }
      } catch (dbErr) {
        console.warn('Supabase subscribers DB pagination note:', dbErr.message);
      }
    }

    // Fallback
    const data = await supabaseService.selectAll('subscribers', 'subscribed_at', false);
    let allRecords = Array.isArray(data) ? data : [];
    const activeCount = allRecords.filter((s) => (s.status || '').toLowerCase() !== 'unsubscribed').length;
    const unsubscribedCount = allRecords.filter((s) => (s.status || '').toLowerCase() === 'unsubscribed').length;
    const totalCount = allRecords.length;

    let filtered = allRecords;
    if (status && status !== 'all') {
      filtered = filtered.filter((s) => (s.status || '').toLowerCase() === status.toLowerCase());
    }
    if (search && search.trim()) {
      filtered = filtered.filter((s) => (s.email || '').toLowerCase().includes(search.toLowerCase().trim()));
    }
    const total = filtered.length;
    const paginated = filtered.slice(from, to + 1);

    res.json({
      success: true,
      count: paginated.length,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      totalCount,
      activeCount,
      unsubscribedCount,
      data: paginated,
    });
  } catch (err) {
    next(err);
  }
};

export const updateSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, status } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Subscriber ID is required' });
    }

    const updatePayload = {};
    if (email && email.includes('@')) {
      updatePayload.email = email.toLowerCase().trim();
    }
    if (status) {
      updatePayload.status = status;
    }

    const updated = await supabaseService.update('subscribers', id, updatePayload);

    res.json({
      success: true,
      message: 'Subscriber updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Subscriber ID is required' });
    }
    await supabaseService.delete('subscribers', id);
    res.json({
      success: true,
      message: 'Subscriber deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
