import { Router } from 'express';
import {
  getInvoiceDashboardMetrics,
  getInvoiceSettings,
  updateInvoiceSettings,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getInvoiceClients,
  saveInvoiceClient,
  getInvoices,
  getInvoiceById,
  saveDraftInvoice,
  issueInvoice,
  cancelInvoice,
  recordInvoicePayment,
  getInvoicePdf,
} from '../controllers/invoiceController.js';
import { verifyToken, requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

// Protect ALL invoice endpoints strictly with JWT verification and admin role check
router.use(verifyToken);
router.use(requireRole(['admin']));

// Metrics & Analytics
router.get('/metrics', getInvoiceDashboardMetrics);

// Company Invoice Settings
router.get('/settings', getInvoiceSettings);
router.put('/settings', updateInvoiceSettings);

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
router.post('/draft', saveDraftInvoice);
router.post('/:id/issue', issueInvoice);
router.post('/:id/cancel', cancelInvoice);
router.post('/:id/payments', recordInvoicePayment);
router.get('/:id/pdf', getInvoicePdf);

export default router;
