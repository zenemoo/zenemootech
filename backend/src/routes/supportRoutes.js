import express from 'express';
import jwt from 'jsonwebtoken';
import { createSupportTicket, getSupportTickets, getSupportTicketById, updateTicketStatus } from '../controllers/supportController.js';
import {
  createPaymentOrder,
  verifyPaymentOrder,
  handleCashfreeWebhook,
  getMyContributions,
  getMemberPaymentReceipt,
  getAdminContributions,
  createAdminPaymentLink,
  getAdminPaymentLinks,
  cancelAdminPaymentLink,
  sendAdminPaymentLinkEmail,
  getPublicPaymentLink,
  getReceiptVerificationData,
} from '../controllers/supportPaymentController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

import { supabase } from '../config/supabase.js';

const router = express.Router();

// Optional token extraction middleware (supports both Zenemoo JWT and Supabase Auth tokens)
// Strictly requires cryptographic verification; NEVER trusts unverified jwt.decode claims
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : null;

    let verified = false;

    // 1. Try Zenemoo JWT verification
    if (jwtSecret && token) {
      try {
        req.user = jwt.verify(token, jwtSecret);
        verified = true;
      } catch (_) {
        // Token was not a valid Zenemoo JWT or was expired/tampered
      }
    }

    // 2. If not verified and Supabase is configured, try Supabase Auth token verification
    if (!verified && supabase && token) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user && user.email) {
          req.user = {
            id: user.id,
            email: (user.email || '').trim().toLowerCase(),
            role: user.user_metadata?.role || 'user',
            name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          };
          verified = true;
        }
      } catch (_) {
        // Supabase token verification failed
      }
    }

    // If verification failed, req.user remains undefined (unauthenticated)
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

// 4. Supporter's contribution history (for authenticated Talent Hub members & users)
router.get('/my-contributions', optionalAuth, getMyContributions);
router.get('/support-payments/me', optionalAuth, getMyContributions);
router.get('/support-payments/:orderId/receipt', optionalAuth, getMemberPaymentReceipt);

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
router.get('/tickets/:id', verifyToken, requireRole(['admin', 'super_admin', 'administrator']), getSupportTicketById);
router.get('/ticket/:id', verifyToken, requireRole(['admin', 'super_admin', 'administrator']), getSupportTicketById);
router.put('/ticket/:id/status', verifyToken, requireRole(['admin', 'super_admin', 'administrator']), updateTicketStatus);

export default router;

