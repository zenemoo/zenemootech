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
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public Endpoints
router.get('/availability', getAvailability);
router.post('/', createBooking);
router.get('/:bookingId', getBookingById);

// Admin Protected Endpoints
router.get('/admin/list', authMiddleware, getAdminBookings);
router.get('/admin/bookings', authMiddleware, getAdminBookings);
router.post('/admin/:id/generate-meeting', authMiddleware, generateMeetingForBooking);
router.post('/admin/bookings/:id/generate-meeting', authMiddleware, generateMeetingForBooking);
router.post('/admin/:id/resend-email', authMiddleware, resendBookingEmail);
router.post('/admin/bookings/:id/resend-email', authMiddleware, resendBookingEmail);
router.patch('/admin/:id', authMiddleware, updateAdminBooking);
router.patch('/admin/bookings/:id', authMiddleware, updateAdminBooking);
router.delete('/admin/:id', authMiddleware, deleteAdminBooking);
router.delete('/admin/bookings/:id', authMiddleware, deleteAdminBooking);

export default router;
