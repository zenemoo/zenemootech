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

    // 3. Query existing subscribers in Supabase database
    const existingList = await supabaseService.selectAll('subscribers', 'subscribed_at', false);
    const existingEmailSet = new Set((existingList || []).map((s) => s.email.toLowerCase().trim()));

    const alreadySubscribedEmails = [];
    const newEmailsToInsert = [];

    for (let cleanEmail of validCandidateEmails) {
      if (existingEmailSet.has(cleanEmail)) {
        alreadySubscribedEmails.push(cleanEmail);
      } else {
        newEmailsToInsert.push(cleanEmail);
      }
    }

    // 4. Insert ONLY new emails into database
    const savedRecords = [];
    for (let newEmail of newEmailsToInsert) {
      try {
        const payload = {
          email: newEmail,
          status: 'active',
          subscribed_at: new Date().toISOString(),
        };
        const saved = await supabaseService.insert('subscribers', payload);
        if (saved) savedRecords.push(saved);
      } catch (insertErr) {
        console.warn(`[Bulk subscriber insert note for ${newEmail}]:`, insertErr.message);
      }
    }

    // 5. Construct user-friendly summary
    let message = 'Subscription request processed.';
    if (newEmailsToInsert.length > 0 && alreadySubscribedEmails.length === 0) {
      message = `Successfully enrolled ${newEmailsToInsert.length} subscriber(s)!`;
    } else if (newEmailsToInsert.length > 0 && alreadySubscribedEmails.length > 0) {
      message = `Enrolled ${newEmailsToInsert.length} new subscriber(s). ${alreadySubscribedEmails.length} email(s) were already subscribed and skipped.`;
    } else if (newEmailsToInsert.length === 0 && alreadySubscribedEmails.length > 0) {
      message = `All ${alreadySubscribedEmails.length} email(s) are already subscribed to Zenemoo Dispatch.`;
    }

    return res.status(200).json({
      success: true,
      message,
      summary: {
        addedCount: savedRecords.length,
        skippedCount: alreadySubscribedEmails.length,
        invalidCount: invalidEmails.length,
        addedEmails: newEmailsToInsert,
        skippedEmails: alreadySubscribedEmails,
        invalidEmails,
      },
      data: savedRecords.length > 0 ? savedRecords[0] : null,
      allSavedData: savedRecords,
    });
  } catch (err) {
    next(err);
  }
};

export const getSubscribers = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('subscribers', 'subscribed_at', false);
    res.json({
      success: true,
      count: data.length,
      data,
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
