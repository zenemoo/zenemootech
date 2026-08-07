import express from 'express';
import { createSupportTicket, getSupportTickets, updateTicketStatus } from '../controllers/supportController.js';
import { verifyToken, verifyRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();

// Public / Authenticated route to create a support ticket
router.post('/ticket', createSupportTicket);

// Admin-protected routes to view and update tickets
router.get('/tickets', verifyToken, verifyRole('admin', 'super_admin', 'administrator'), getSupportTickets);
router.put('/ticket/:id/status', verifyToken, verifyRole('admin', 'super_admin', 'administrator'), updateTicketStatus);

export default router;
