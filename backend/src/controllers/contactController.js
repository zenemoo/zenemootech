import { supabase } from '../config/supabase.js';
import { supabaseService } from '../services/supabaseService.js';
import { sendContactNotification } from '../services/telegramNotificationService.js';
import { sendMailViaBrevo } from '../services/emailService.js';
import { generateContactConfirmationHtml } from '../services/contactEmailTemplate.js';

/**
 * Asynchronously sends confirmation email to user upon successful Contact Inquiry submission
 */
export const sendContactConfirmationEmail = async (inquiryData) => {
  const { id, inquiry_code, name, email, phone, company, service, language, message, created_at } = inquiryData;

  const sender = process.env.EMAIL_FROM || 'Zenemoo <noreply@zenemoo.in>';
  const ccRecipient = process.env.EMAIL_CC || null;
  const subject = `Zenemoo — Contact Inquiry Received | Ticket #${inquiry_code}`;

  const htmlContent = generateContactConfirmationHtml({
    inquiry_code,
    name,
    email,
    phone,
    company,
    service,
    language,
    message,
    created_at,
  });

  console.log(`📧 Sending confirmation email: to = ${email} | ticket = #${inquiry_code}`);

  try {
    const result = await sendMailViaBrevo({
      sender,
      recipients: email,
      cc: ccRecipient,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Email confirmation status: sent (ticket = #${inquiry_code})`);

    // Update email_status in Supabase if record ID exists (safely ignored if column missing)
    if (id) {
      try {
        await supabaseService.update('contacts', id, { email_status: 'sent' });
      } catch (_) {}
    }

    return result;
  } catch (err) {
    console.error(`❌ Email confirmation status: failed (ticket = #${inquiry_code}) - ${err.message}`);

    if (id) {
      try {
        await supabaseService.update('contacts', id, { email_status: 'failed' });
      } catch (_) {}
    }

    return { success: false, error: err.message };
  }
};

export const submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, company, service, language, lang, inquiry_code, inquiry_id, notes, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required fields.' });
    }

    // Input Validation & XSS/HTML Sanitization
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const cleanName = (name || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 100);
    const cleanMessage = (message || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 3000);
    const cleanPhone = (phone || '').replace(/[^\d+ -]/g, '').trim().substring(0, 20);
    const cleanCompany = (company || '').replace(/<[^>]*>?/gm, '').trim().substring(0, 100);
    const cleanService = (service || 'Audio Transcription').replace(/<[^>]*>?/gm, '').trim().substring(0, 100);

    // CLOUDFLARE TURNSTILE ANTI-BOT SERVER-SIDE VERIFICATION
    const turnstileToken = req.body.turnstileToken || req.body.turnstile_token || req.body['cf-turnstile-response'];
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '0x4AAAAAAEKG_sx7PnsrKH6dRojjixiRQWo';

    if (!turnstileToken) {
      console.warn('[TURNSTILE VERIFICATION FAILED]: Turnstile token is missing from contact submission request.');
      return res.status(400).json({
        success: false,
        message: 'Anti-bot verification required. Please complete the security check before submitting.',
      });
    }

    try {
      const userIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const verifyFormData = new URLSearchParams();
      verifyFormData.append('secret', turnstileSecret);
      verifyFormData.append('response', turnstileToken);
      if (userIp) verifyFormData.append('remoteip', String(userIp).split(',')[0].trim());

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: verifyFormData,
      });

      const verifyData = await verifyRes.json();
      console.log(`[TURNSTILE VERIFICATION]: success = ${verifyData.success} | error-codes = ${JSON.stringify(verifyData['error-codes'] || [])}`);

      if (!verifyData.success) {
        return res.status(400).json({
          success: false,
          message: 'Anti-bot security check failed or token expired. Please complete the verification and try again.',
        });
      }
    } catch (cfErr) {
      console.error('[TURNSTILE API ERROR]:', cfErr.message);
      return res.status(400).json({
        success: false,
        message: 'Anti-bot verification service unavailable. Please try submitting again.',
      });
    }

    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedCode = inquiry_code || inquiry_id || req.body.code || `ZNM-${year}-${randomHex}`;
    const selectedLanguage = language || lang || req.body.languages || 'Odia';

    const contactPayload = {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      company: cleanCompany,
      service: cleanService,
      language: selectedLanguage,
      inquiry_code: generatedCode,
      notes: notes || '',
      message: cleanMessage,
      status: 'unread',
      email_status: 'pending',
      created_at: new Date().toISOString(),
    };

    // 1. Save inquiry to Supabase database (Source of truth)
    const savedRecord = await supabaseService.insert('contacts', contactPayload);

    console.log(`\n====================================================`);
    console.log(`📥 Contact inquiry received: ticket = #${generatedCode}`);
    console.log(`👤 Name: ${cleanName} | Email: ${cleanEmail}`);
    console.log(`====================================================`);

    // 2. Asynchronously dispatch Telegram notification to all active administrators (non-blocking)
    sendContactNotification({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      company: cleanCompany,
      subject: cleanService,
      message: cleanMessage,
    }).catch((err) => console.warn('[Telegram Contact Notification Note]', err.message));

    // 3. Asynchronously dispatch Confirmation Email to applicant + CC to mr.prem2006@gmail.com (non-blocking / fail-safe)
    sendContactConfirmationEmail({
      id: savedRecord?.id,
      inquiry_code: generatedCode,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      company: cleanCompany,
      service: cleanService,
      language: selectedLanguage,
      message: cleanMessage,
      created_at: contactPayload.created_at,
    }).catch((err) => console.warn('[Contact Confirmation Email Dispatch Note]', err.message));

    return res.status(201).json({
      success: true,
      message: 'Contact inquiry submitted successfully',
      data: savedRecord,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/contacts - Database-side pagination & filtering
export const getContacts = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 25, limit = 25, status, search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(pageSize || limit, 10) || 25));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    const LIST_COLUMNS = 'id, inquiry_code, name, email, phone, company, service, language, status, notes, created_at, updated_at';

    if (supabase) {
      try {
        let query = supabase.from('contacts').select(LIST_COLUMNS, { count: 'exact' });

        if (status && status.trim() && status.toLowerCase() !== 'all') {
          query = query.ilike('status', status.trim());
        }

        if (search && search.trim()) {
          const q = search.trim();
          query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,company.ilike.%${q}%,inquiry_code.ilike.%${q}%`);
        }

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: dbData, count: totalCount, error } = await query;

        if (!error && Array.isArray(dbData)) {
          const total = totalCount || dbData.length;
          return res.json({
            success: true,
            count: dbData.length,
            total,
            page: pageNum,
            pageSize: limitNum,
            totalPages: Math.max(1, Math.ceil(total / limitNum)),
            data: dbData,
          });
        }
      } catch (dbErr) {
        console.warn('Supabase contacts DB pagination note:', dbErr.message);
      }
    }

    const data = await supabaseService.selectAll('contacts', 'created_at', false);
    let filtered = Array.isArray(data) ? data : [];
    if (status && status !== 'all') {
      filtered = filtered.filter((c) => (c.status || '').toLowerCase() === status.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.company || '').toLowerCase().includes(q) ||
          (c.inquiry_code || '').toLowerCase().includes(q)
      );
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
      data: paginated,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/contacts/:id - Targeted single inquiry detail fetch
export const getContactById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Contact ID is required' });
    }

    if (supabase) {
      try {
        let query = supabase.from('contacts').select('*');
        if (typeof id === 'string' && id.startsWith('INQ-')) {
          query = query.eq('inquiry_code', id);
        } else {
          query = query.eq('id', id);
        }
        const { data: dbContact, error } = await query.maybeSingle();
        if (!error && dbContact) {
          return res.json({ success: true, data: dbContact });
        }
      } catch (dbErr) {
        console.warn('Supabase targeted single contact fetch warning:', dbErr.message);
      }
    }

    const data = await supabaseService.selectAll('contacts', 'created_at', false);
    const found = (data || []).find((c) => c.id === id || c.inquiry_code === id);
    if (found) {
      return res.json({ success: true, data: found });
    }

    return res.status(404).json({ success: false, message: 'Contact inquiry record not found.' });
  } catch (err) {
    next(err);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const data = await supabaseService.update('contacts', id, updates);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    await supabaseService.delete('contacts', id);
    res.json({ success: true, message: 'Contact inquiry deleted successfully' });
  } catch (err) {
    next(err);
  }
};
