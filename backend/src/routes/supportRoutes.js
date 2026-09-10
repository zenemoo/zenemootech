import express from 'express';
import jwt from 'jsonwebtoken';
import { createSupportTicket, getSupportTickets, updateTicketStatus } from '../controllers/supportController.js';
import {
  createPaymentOrder,
  verifyPaymentOrder,
  handleCashfreeWebhook,
  getMyContributions,
  getAdminContributions,
  createAdminPaymentLink,
  getAdminPaymentLinks,
  cancelAdminPaymentLink,
  sendAdminPaymentLinkEmail,
  getPublicPaymentLink,
  getReceiptVerificationData,
} from '../controllers/supportPaymentController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'zenemoo_super_secret_jwt_key_2026';

// Optional token extraction middleware (allows both guest and authenticated support)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (_) {}
  }
  next();
};

// --- CASHFREE SUPPORT PAYMENT ROUTES ---
// 1. Create a payment order on Cashfree
router.post('/create-payment', optionalAuth, createPaymentOrder);

// 2. Verify payment status (server-to-server check)
router.get('/verify-payment/:orderId', verifyPaymentOrder);

// 3. Webhook listener for Cashfree events
router.post('/webhook', handleCashfreeWebhook);

// 4. Supporter's contribution history (for authenticated users)
router.get('/my-contributions', optionalAuth, getMyContributions);

// 5. Public route: Retrieve verified payment link details by ID (No PII in URL)
router.get('/public-link/:linkId', getPublicPaymentLink);
router.get('/pay/:linkId', getPublicPaymentLink);
router.get('/payment-links/public/:linkId', getPublicPaymentLink);

// 5b. Public route: Retrieve verified payment receipt data by Receipt No or Order ID (QR Verification)
router.get('/receipt/verify/:receiptNo', getReceiptVerificationData);
router.get('/receipt/:receiptNo', getReceiptVerificationData);

// 6. Admin-protected route: All contributions, summaries, and date-wise collections
router.get(
  '/contributions',
  verifyToken,
  requireRole(['admin', 'super_admin', 'administrator', 'hr']),
  getAdminContributions
);

// 7. Admin-protected routes: Cashfree Payment Links
router.post(
  '/payment-links',
  verifyToken,
  requireRole(['admin', 'super_admin', 'administrator', 'hr']),
  createAdminPaymentLink
);
router.get(
  '/payment-links',
  verifyToken,
  requireRole(['admin', 'super_admin', 'administrator', 'hr']),
  getAdminPaymentLinks
);
router.post(
  '/payment-links/:linkId/cancel',
  verifyToken,
  requireRole(['admin', 'super_admin', 'administrator', 'hr']),
  cancelAdminPaymentLink
);
router.post(
  '/payment-links/:linkId/send-email',
  verifyToken,
  requireRole(['admin', 'super_admin', 'administrator', 'hr']),
  sendAdminPaymentLinkEmail
);

// --- SUPPORT TICKETING ROUTES ---
// Public / Authenticated route to create a support ticket
router.post('/ticket', createSupportTicket);

// Admin-protected routes to view and update tickets
router.get('/tickets', verifyToken, requireRole(['admin', 'super_admin', 'administrator']), getSupportTickets);
router.put('/ticket/:id/status', verifyToken, requireRole(['admin', 'super_admin', 'administrator']), updateTicketStatus);

export default router;

