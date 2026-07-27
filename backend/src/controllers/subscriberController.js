import { supabaseService } from '../services/supabaseService.js';

let memorySubscribers = [];

export const subscribeNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const payload = {
      email: email.toLowerCase().trim(),
      subscribed_at: new Date().toISOString(),
    };

    let saved = null;
    try {
      saved = await supabaseService.insert('subscribers', payload);
    } catch (e) {
      console.warn('Supabase subscriber insert warning:', e.message);
    }

    const result = saved || { id: Date.now().toString(), ...payload };
    if (!memorySubscribers.some((s) => s.email === result.email)) {
      memorySubscribers.unshift(result);
    }

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to Zenemoo Dispatch',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const getSubscribers = async (req, res, next) => {
  try {
    const data = await supabaseService.selectAll('subscribers');
    if (data && Array.isArray(data)) {
      return res.json({ success: true, count: data.length, data });
    }
    res.json({ success: true, count: memorySubscribers.length, data: memorySubscribers });
  } catch (err) {
    res.json({ success: true, count: memorySubscribers.length, data: memorySubscribers });
  }
};

export const updateSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }

    const updatedData = { email: email.toLowerCase().trim() };
    let updated = null;
    try {
      updated = await supabaseService.update('subscribers', id, updatedData);
    } catch (e) {}

    const result = updated || { id, ...updatedData };
    memorySubscribers = memorySubscribers.map((s) => (s.id === id ? { ...s, ...result } : s));

    res.json({ success: true, message: 'Subscriber email updated', data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteSubscriber = async (req, res, next) => {
  try {
    const { id } = req.params;
    try {
      await supabaseService.delete('subscribers', id);
    } catch (e) {}

    memorySubscribers = memorySubscribers.filter((s) => s.id !== id);
    res.json({ success: true, message: 'Subscriber deleted' });
  } catch (err) {
    next(err);
  }
};
