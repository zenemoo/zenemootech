import { supabaseService } from '../services/supabaseService.js';
import { supabase } from '../config/supabase.js';
import { sendMailViaBrevo } from '../services/emailService.js';

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

    // 1. Insert into Supabase table support_tickets with column-fallback resilience
    let insertedRecord = null;
    try {
      insertedRecord = await supabaseService.insert('support_tickets', ticketRecord);
    } catch (err) {
      console.warn('Supabase support_tickets insert warning:', err.message);
      // Fallback: strip optional fields if column cache is missing extra columns
      const fallbackPayload = {
        ticket_id: ticketId,
        user_email: senderEmail,
        user_name: senderName,
        user_id: req.user?.id || req.user?.team_member_id || null,
      };
      if (subject) fallbackPayload.subject = subject;
      if (message) fallbackPayload.message = message;
      if (category) fallbackPayload.category = category;

      try {
        insertedRecord = await supabaseService.insert('support_tickets', fallbackPayload);
      } catch (e2) {
        console.warn('Supabase support_tickets secondary insert warning:', e2.message);
        // Ultra fallback: minimum fields
        try {
          insertedRecord = await supabaseService.insert('support_tickets', {
            ticket_id: ticketId,
            user_email: senderEmail,
            user_name: senderName,
          });
        } catch (_) {}
      }
    }

    if (!insertedRecord) {
      ticketRecord.id = `temp_tkt_${Date.now()}`;
      insertedRecord = ticketRecord;
    }

    memorySupportTickets.unshift(ticketRecord);

    // 2. Insert high-priority Notification into Supabase notifications & user_notifications
    const notifRecord = {
      type: 'support_ticket',
      category: 'system',
      title: `🎫 Support Ticket: ${ticketId}`,
      message: `[${category || 'Technical'}] From ${senderName} (${senderEmail}): "${subject}"`,
      ticket_id: ticketId,
      user_email: senderEmail,
      read: false,
      created_at: new Date().toISOString(),
    };

    try {
      await supabaseService.insert('admin_notifications', notifRecord);
    } catch (e) {
      try {
        await supabaseService.insert('user_notifications', notifRecord);
      } catch (e2) {
        try {
          await supabaseService.insert('notifications', notifRecord);
        } catch (e3) {}
      }
    }

    // 3. Dispatch automated email notification to support team
    try {
      await sendMailViaBrevo({
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

// GET /api/support/tickets - Fetch support tickets with DB pagination & filters (Admin Center)
export const getSupportTickets = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 25, limit = 25, status, category, search } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(pageSize || limit, 10) || 25));
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    // Actual columns in Supabase support_tickets table (Zero non-existent column references!)
    const LIST_COLUMNS = 'id, ticket_id, user_id, user_email, user_name, category, subject, message, status, created_at, updated_at';

    if (supabase) {
      try {
        let query = supabase.from('support_tickets').select(LIST_COLUMNS, { count: 'exact' });

        if (status && status.trim() && status.toLowerCase() !== 'all') {
          query = query.ilike('status', status.trim());
        }

        if (category && category.trim() && category.toLowerCase() !== 'all') {
          query = query.ilike('category', category.trim());
        }

        if (search && search.trim()) {
          const q = search.trim();
          query = query.or(`ticket_id.ilike.%${q}%,user_name.ilike.%${q}%,user_email.ilike.%${q}%,subject.ilike.%${q}%,message.ilike.%${q}%`);
        }

        query = query.order('created_at', { ascending: false }).range(from, to);

        // Fetch paginated records and parallel lightweight head count for unresolved tickets
        const [pageResult, openCountResult] = await Promise.all([
          query,
          supabase.from('support_tickets').select('*', { count: 'exact', head: true }).neq('status', 'Resolved'),
        ]);

        const { data: dbTickets, count: totalCount, error } = pageResult;

        if (!error && Array.isArray(dbTickets)) {
          const total = totalCount || dbTickets.length;
          const openCount = typeof openCountResult.count === 'number'
            ? openCountResult.count
            : dbTickets.filter((t) => (t.status || '').toLowerCase() !== 'resolved').length;

          return res.json({
            success: true,
            count: dbTickets.length,
            total,
            openCount,
            page: pageNum,
            pageSize: limitNum,
            totalPages: Math.max(1, Math.ceil(total / limitNum)),
            data: dbTickets,
            pagination: {
              page: pageNum,
              pageSize: limitNum,
              total,
              openCount,
              totalPages: Math.max(1, Math.ceil(total / limitNum)),
            },
          });
        }
      } catch (dbErr) {
        console.warn('Supabase support_tickets DB pagination query note:', dbErr.message);
      }
    }

    // In-memory fallback
    let filtered = [...memorySupportTickets];
    if (status && status !== 'all') {
      filtered = filtered.filter((t) => (t.status || '').toLowerCase() === status.toLowerCase());
    }
    if (category && category !== 'all') {
      filtered = filtered.filter((t) => (t.category || '').toLowerCase() === category.toLowerCase());
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          (t.user_name || t.name || '').toLowerCase().includes(q) ||
          (t.user_email || t.email || '').toLowerCase().includes(q) ||
          (t.subject || '').toLowerCase().includes(q) ||
          (t.message || '').toLowerCase().includes(q) ||
          (t.ticket_id || '').toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const openCount = filtered.filter((t) => (t.status || '').toLowerCase() !== 'resolved').length;
    const paginated = filtered.slice(from, to + 1);

    return res.json({
      success: true,
      count: paginated.length,
      total,
      openCount,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      data: paginated,
      pagination: {
        page: pageNum,
        pageSize: limitNum,
        total,
        openCount,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/support/ticket/:id or /api/support/tickets/:id - Fetch single complete support ticket detail
export const getSupportTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Ticket ID is required' });
    }

    if (supabase) {
      try {
        let query = supabase.from('support_tickets').select('*');
        if (typeof id === 'string' && id.startsWith('TKT-')) {
          query = query.eq('ticket_id', id);
        } else {
          query = query.eq('id', id);
        }
        const { data: dbTicket, error } = await query.maybeSingle();
        if (!error && dbTicket) {
          return res.json({ success: true, ticket: dbTicket, data: dbTicket });
        }
      } catch (dbErr) {
        console.warn('Supabase targeted single ticket fetch warning:', dbErr.message);
      }
    }

    const memItem = memorySupportTickets.find((t) => t.ticket_id === id || String(t.id) === String(id));
    if (memItem) {
      return res.json({ success: true, ticket: memItem, data: memItem });
    }

    return res.status(404).json({ success: false, message: 'Support ticket not found.' });
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
      if (supabase) {
        if (typeof id === 'string' && id.startsWith('TKT-')) {
          await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('ticket_id', id);
        } else {
          await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
        }
      }
    } catch (e) {
      console.warn('Supabase ticket status update warning:', e.message);
    }

    return res.json({
      success: true,
      message: `Ticket ${id} status updated to ${status}.`,
    });
  } catch (err) {
    next(err);
  }
};
