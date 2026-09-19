import express from 'express';
import {
  getAvailability,
  createBooking,
  getBookingById,
  getAdminBookings,
  generateMeetingForBooking,
  resendBookingEmail,
  updateAdminBooking,
  deleteAdminBooking,
} from '../controllers/bookingController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';
import { bookingRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Endpoints
router.get('/availability', getAvailability);
router.post('/', bookingRateLimiter, createBooking);
router.get('/:bookingId', getBookingById);

// Admin Protected Endpoints
router.get('/admin/list', verifyToken, requireRole(['admin']), getAdminBookings);
router.get('/admin/bookings', verifyToken, requireRole(['admin']), getAdminBookings);
router.post('/admin/:id/generate-meeting', verifyToken, requireRole(['admin']), generateMeetingForBooking);
router.post('/admin/bookings/:id/generate-meeting', verifyToken, requireRole(['admin']), generateMeetingForBooking);
router.post('/admin/:id/resend-email', verifyToken, requireRole(['admin']), resendBookingEmail);
router.post('/admin/bookings/:id/resend-email', verifyToken, requireRole(['admin']), resendBookingEmail);
router.patch('/admin/:id', verifyToken, requireRole(['admin']), updateAdminBooking);
router.patch('/admin/bookings/:id', verifyToken, requireRole(['admin']), updateAdminBooking);
router.delete('/admin/:id', verifyToken, requireRole(['admin']), deleteAdminBooking);
router.delete('/admin/bookings/:id', verifyToken, requireRole(['admin']), deleteAdminBooking);

export default router;
