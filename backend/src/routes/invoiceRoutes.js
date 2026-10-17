import { Router } from 'express';
import multer from 'multer';
import {
  getInvoiceDashboardMetrics,
  getInvoiceDiagnostics,
  getInvoiceSettings,
  updateInvoiceSettings,
  uploadInvoiceSignature,
  getInvoiceSignature,
  deleteInvoiceSignature,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getInvoiceClients,
  saveInvoiceClient,
  getInvoices,
  getInvoiceById,
  saveDraftInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  recordInvoicePayment,
  getInvoicePdf,
  getInvoiceDocx,
  deleteInvoice,
  generateInvoicePaymentLink,
  cancelInvoicePaymentLink,
} from '../controllers/invoiceController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Strict signature upload multer (PNG or JPEG, max 2MB)
const uploadSignature = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      return cb(null, true);
    }
    cb(new Error('Invalid signature format. Only genuine PNG or JPEG images are accepted.'));
  },
});

// Protect ALL invoice endpoints strictly with JWT verification and admin role check
router.use(verifyToken);
router.use(requireRole(['admin']));

// Metrics & Analytics
router.get('/metrics', getInvoiceDashboardMetrics);
router.get('/diagnostics', getInvoiceDiagnostics);

// Company Invoice Settings & Signature
router.get('/settings', getInvoiceSettings);
router.put('/settings', updateInvoiceSettings);
router.post('/settings/signature', uploadSignature.single('signature'), uploadInvoiceSignature);
router.get('/settings/signature', getInvoiceSignature);
router.delete('/settings/signature', deleteInvoiceSignature);

// Multiple Bank Accounts
router.get('/banks', getBankAccounts);
router.post('/banks', createBankAccount);
router.put('/banks/:id', updateBankAccount);
router.delete('/banks/:id', deleteBankAccount);

// Reusable Clients
router.get('/clients', getInvoiceClients);
router.post('/clients', saveInvoiceClient);

// Invoice CRUD & Lifecycle
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);
router.post('/draft', saveDraftInvoice);
router.post('/:id/issue', issueInvoice);
router.post('/:id/cancel', cancelInvoice);
router.post('/:id/payments', recordInvoicePayment);
router.post('/:id/payment-link', generateInvoicePaymentLink);
router.delete('/:id/payment-link', cancelInvoicePaymentLink);
router.get('/:id/pdf', getInvoicePdf);
router.get('/:id/docx', getInvoiceDocx);
router.delete('/:id', deleteInvoice);

export default router;
