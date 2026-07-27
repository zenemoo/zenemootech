import { supabaseService } from '../services/supabaseService.js';

let memoryContacts = [];

export const submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, company, service, language, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const contactPayload = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      company,
      service,
      language,
      message,
      status: 'NEW',
      created_at: new Date().toISOString(),
    };

    try {
      const saved = await supabaseService.insert('contacts', contactPayload);
      if (saved) return res.status(201).json({ success: true, message: 'Inquiry submitted successfully', data: saved });
    } catch (e) {}

    memoryContacts.unshift(contactPayload);
    res.status(201).json({ success: true, message: 'Inquiry submitted successfully', data: contactPayload });
  } catch (err) {
    next(err);
  }
};
