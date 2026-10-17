import { Router } from 'express';
import {
  lookupStaffMember,
  getSavedCards,
  getCardById,
  saveCard,
  deleteCard,
  uploadCardPhoto,
} from '../controllers/staffIdCardController.js';
import { upload } from '../middleware/upload.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Staff Member Lookup (Admin & HR)
router.get('/lookup', verifyToken, requireRole(['admin', 'hr']), lookupStaffMember);

// Staff ID Card Configurations CRUD (Admin only)
router.get('/', verifyToken, requireRole(['admin']), getSavedCards);
router.get('/:id', verifyToken, requireRole(['admin']), getCardById);
router.post('/', verifyToken, requireRole(['admin']), saveCard);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteCard);

// Card Photo Upload with interactive crop payload
router.post('/upload-photo', verifyToken, requireRole(['admin']), upload.single('file'), uploadCardPhoto);

export default router;
