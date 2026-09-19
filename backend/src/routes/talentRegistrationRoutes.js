import express from 'express';
import {
  registerTalent,
  getRegistrationsAdmin,
  getRegistrationByIdAdmin,
  updateRegistrationAdmin,
  addAdminNote,
  exportRegistrationsAdmin,
  deleteRegistrationAdmin,
  getSupportedLanguages,
  addAdminSupportedLanguage,
  updateAdminSupportedLanguage,
  updateAdminCandidateProfile,
} from '../controllers/talentRegistrationController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';
import { talentRegisterRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Anonymous Endpoints
router.post('/register', talentRegisterRateLimiter, registerTalent);
router.post('/', talentRegisterRateLimiter, registerTalent);
router.get('/supported-languages', getSupportedLanguages);

// Protected Admin / HR Talent Review Operations
router.get('/admin/list', verifyToken, requireRole(['admin', 'hr']), getRegistrationsAdmin);
router.get('/admin/detail/:id', verifyToken, requireRole(['admin', 'hr']), getRegistrationByIdAdmin);
router.patch('/admin/status/:id', verifyToken, requireRole(['admin', 'hr']), updateRegistrationAdmin);
router.post('/admin/note/:id', verifyToken, requireRole(['admin', 'hr']), addAdminNote);
router.get('/admin/export', verifyToken, requireRole(['admin', 'hr']), exportRegistrationsAdmin);
router.put('/admin/update-profile/:id', verifyToken, requireRole(['admin', 'hr']), updateAdminCandidateProfile);

// Strictly Admin-Only Destructive & Language Management
router.delete('/admin/delete/:id', verifyToken, requireRole(['admin']), deleteRegistrationAdmin);
router.delete('/admin/:id', verifyToken, requireRole(['admin']), deleteRegistrationAdmin);
router.get('/admin/languages', verifyToken, requireRole(['admin', 'hr']), getSupportedLanguages);
router.post('/admin/languages', verifyToken, requireRole(['admin']), addAdminSupportedLanguage);
router.put('/admin/languages/:id', verifyToken, requireRole(['admin']), updateAdminSupportedLanguage);

export default router;


