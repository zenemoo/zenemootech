import express from 'express';
import { createSupportTicket, getSupportTickets, updateTicketStatus } from '../controllers/supportController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public / Authenticated route to create a support ticket
router.post('/ticket', createSupportTicket);

// Admin-protected routes to view and update tickets
router.get('/tickets', verifyToken, requireRole(['admin', 'super_admin', 'administrator']), getSupportTickets);
router.put('/ticket/:id/status', verifyToken, requireRole(['admin', 'super_admin', 'administrator']), updateTicketStatus);

export default router;
