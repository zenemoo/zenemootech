import { supabaseService } from '../services/supabaseService.js';
import { sendContactNotification } from '../services/telegramNotificationService.js';

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
    const cleanService = (service || 'Data Solutions').replace(/<[^>]*>?/gm, '').trim().substring(0, 100);

    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedCode = inquiry_code || inquiry_id || req.body.code || `ZNM-${year}-${randomHex}`;
    const selectedLanguage = language || lang || req.body.languages || 'Hindi';

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
      created_at: new Date().toISOString(),
    };

    const savedRecord = await supabaseService.insert('contacts', contactPayload);

    // Asynchronously dispatch Telegram notification to all active administrators (non-blocking)
    sendContactNotification({
      name,
      email,
      phone,
      company,
      subject: service || 'Data Solutions Inquiry',
      message,
    }).catch((err) => console.warn('[Telegram Contact Notification Note]', err.message));

    res.status(201).json({
      success: true,
      message: 'Contact inquiry submitted successfully',
      data: savedRecord,
    });
  } catch (err) {
    next(err);
  }
};

export const getContacts = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('contacts', 'created_at', false);
    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Inquiry ID is required' });
    }

    const updatePayload = {};
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;

    const updated = await supabaseService.update('contacts', id, updatePayload);

    res.json({
      success: true,
      message: 'Contact inquiry updated successfully',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Inquiry ID is required' });
    }
    await supabaseService.delete('contacts', id);
    res.json({
      success: true,
      message: 'Contact inquiry deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
