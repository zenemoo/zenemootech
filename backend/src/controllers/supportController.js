import { supabaseService } from '../services/supabaseService.js';
import { sendBrevoEmail } from '../services/emailService.js';

// In-memory fallback array for support tickets
let memorySupportTickets = [];

// POST /api/support/ticket - Create new support ticket
export const createSupportTicket = async (req, res, next) => {
  try {
    const { category, subject, message, user_email, user_name } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required.',
      });
    }

    const senderEmail = (user_email || req.user?.email || 'guest@zenemoo.in').toLowerCase();
    const senderName = user_name || req.user?.name || senderEmail.split('@')[0];
    
    // Generate unique Ticket ID: TKT-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const ticketId = `TKT-${randomDigits}`;

    const ticketRecord = {
      ticket_id: ticketId,
      user_id: req.user?.id || req.user?.team_member_id || null,
      user_email: senderEmail,
      user_name: senderName,
      category: category || 'Technical Issue',
      subject,
      message,
      status: 'Open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Insert into Supabase table support_tickets
    let insertedRecord = null;
    try {
      insertedRecord = await supabaseService.insert('support_tickets', ticketRecord);
    } catch (err) {
      console.warn('Supabase support_tickets insert warning:', err.message);
    }

    if (!insertedRecord) {
      ticketRecord.id = `temp_tkt_${Date.now()}`;
      insertedRecord = ticketRecord;
    }

    memorySupportTickets.unshift(ticketRecord);

    // 2. Insert high-priority Notification into Supabase admin_notifications
    const notifRecord = {
      type: 'support_ticket',
      category: 'system',
      title: `🎫 New Support Ticket: ${ticketId}`,
      message: `[${category}] From ${senderName} (${senderEmail}): "${subject}"`,
      ticket_id: ticketId,
      user_email: senderEmail,
      read: false,
      created_at: new Date().toISOString(),
    };

    try {
      await supabaseService.insert('admin_notifications', notifRecord);
    } catch (e) {
      console.warn('Admin notification insert fallback:', e.message);
    }

    // 3. Dispatch automated email notification to support team
    try {
      await sendBrevoEmail({
        sender: 'support@zenemoo.in',
        recipients: 'support@zenemoo.in, contact@zenemoo.in',
        subject: `[SUPPORT TICKET ${ticketId}] ${category}: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background: #090d16; color: #ffffff; border-radius: 12px;">
            <h2 style="color: #06b6d4; margin-top: 0;">🎫 New Support Ticket Dispatched</h2>
            <p><strong>Ticket Reference ID:</strong> <span style="color: #38bdf8; font-family: monospace; font-size: 16px;">${ticketId}</span></p>
            <p><strong>Sender Email:</strong> ${senderEmail}</p>
            <p><strong>Sender Name:</strong> ${senderName}</p>
            <p><strong>Category:</strong> ${category || 'Technical Issue'}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-top: 10px;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 20px;">Zenemoo Enterprise Support Engine &bull; Automated Dispatch</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn('Support ticket Brevo email dispatch warning:', emailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      ticketId,
      ticket: insertedRecord,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/support/tickets - Fetch all support tickets (Admin Center)
export const getSupportTickets = async (req, res, next) => {
  try {
    let dbTickets = [];
    try {
      dbTickets = await supabaseService.selectAll('support_tickets', 'created_at', false);
    } catch (e) {
      dbTickets = [];
    }

    if (!Array.isArray(dbTickets)) dbTickets = [];

    // Deduplicate DB & memory tickets
    const combined = [...dbTickets, ...memorySupportTickets];
    const seen = new Set();
    const uniqueTickets = [];
    for (const t of combined) {
      const key = t.ticket_id || t.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueTickets.push(t);
      }
    }

    return res.json({
      success: true,
      count: uniqueTickets.length,
      data: uniqueTickets,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/support/ticket/:id/status - Update support ticket status
export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    // Update in memory fallback
    const memItem = memorySupportTickets.find((t) => t.ticket_id === id || String(t.id) === String(id));
    if (memItem) {
      memItem.status = status;
      memItem.updated_at = new Date().toISOString();
    }

    // Update in Supabase
    try {
      await supabaseService.update('support_tickets', { ticket_id: id }, { status, updated_at: new Date().toISOString() });
    } catch (e) {}

    return res.json({
      success: true,
      message: `Ticket ${id} status updated to ${status}.`,
    });
  } catch (err) {
    next(err);
  }
};
