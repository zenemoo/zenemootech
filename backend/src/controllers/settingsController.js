import { supabaseService } from '../services/supabaseService.js';

let memorySettings = {
  site_name: 'ZENEMOO',
  tagline: 'Professional Language & AI Data Services',
  daily_output: 500,
  monthly_output: 10000,
  accuracy_rate: 99.9,
  active_specialists: 50,
  contact_email: 'contact@zenemoo.in',
  contact_phone: '+91 9827775230',
  location: 'K. Barida, Main Road, Odisha, India – 761031',
};

export const getSettings = async (req, res, next) => {
  try {
    const data = await supabaseService.selectById('settings', 1);
    if (data) return res.json({ success: true, data });
    res.json({ success: true, data: memorySettings });
  } catch (err) {
    res.json({ success: true, data: memorySettings });
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const updatedData = { ...req.body };
    try {
      const updated = await supabaseService.update('settings', 1, updatedData);
      if (updated) return res.json({ success: true, data: updated });
    } catch (e) {}

    memorySettings = { ...memorySettings, ...updatedData };
    res.json({ success: true, data: memorySettings });
  } catch (err) {
    next(err);
  }
};
