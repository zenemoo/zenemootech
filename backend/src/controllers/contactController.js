import { supabaseService } from '../services/supabaseService.js';

let memoryContacts = [];

export const submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, company, service, language, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const contactPayload = {
      name,
      email,
      phone: phone || '',
      company: company || '',
      service: service || 'Audio Transcription',
      language: language || 'Hindi',
      message,
      status: 'NEW',
    };

    let saved = null;
    try {
      saved = await supabaseService.insert('contacts', contactPayload);
    } catch (e) {
      console.warn('Supabase contact insert warning:', e.message);
    }

    const resultContact = saved || { id: Date.now().toString(), ...contactPayload, created_at: new Date().toISOString() };
    memoryContacts.unshift(resultContact);

    res.status(201).json({
      success: true,
      message: 'Contact inquiry submitted successfully',
      data: resultContact,
    });
  } catch (err) {
    next(err);
  }
};

export const getContacts = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('contacts');
    if (data && Array.isArray(data)) {
      return res.json({ success: true, count: data.length, data });
    }
    res.json({ success: true, count: memoryContacts.length, data: memoryContacts });
  } catch (err) {
    res.json({ success: true, count: memoryContacts.length, data: memoryContacts });
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabaseService.delete('contacts', id);
    } catch (e) {}

    memoryContacts = memoryContacts.filter((c) => c.id !== id);
    res.json({ success: true, message: 'Contact inquiry deleted' });
  } catch (err) {
    next(err);
  }
};
