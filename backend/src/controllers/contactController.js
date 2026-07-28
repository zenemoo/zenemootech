import { supabaseService } from '../services/supabaseService.js';

export const submitContact = async (req, res, next) => {
  try {
    const { name, email, phone, company, service, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const contactPayload = {
      name,
      email: email.toLowerCase().trim(),
      phone: phone || '',
      company: company || '',
      service: service || 'Data Solutions',
      message,
      status: 'unread',
      created_at: new Date().toISOString(),
    };

    const savedRecord = await supabaseService.insert('contacts', contactPayload);

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
