import { supabaseService } from '../services/supabaseService.js';

export const subscribeNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists in subscribers table
    const existing = await supabaseService.selectAll('subscribers', 'subscribed_at', false);
    const found = existing.find((s) => s.email === cleanEmail);
    if (found) {
      return res.status(200).json({
        success: true,
        message: 'You are already subscribed to Zenemoo Dispatch',
        data: found,
      });
    }

    const payload = {
      email: cleanEmail,
      status: 'active',
      subscribed_at: new Date().toISOString(),
    };

    const savedRecord = await supabaseService.insert('subscribers', payload);

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to Zenemoo Dispatch',
      data: savedRecord,
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
