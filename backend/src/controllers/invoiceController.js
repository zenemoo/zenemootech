import crypto from 'crypto';
import { invoiceD1Service } from '../services/invoiceD1Service.js';
import { generateInvoicePdfBuffer } from '../services/invoicePdfService.js';
import { invoiceStorageService } from '../services/invoiceStorageService.js';
import { getAmountInWords } from '../services/currencyWordsService.js';

// ==============================================================================
// Helper: Precision Financial Calculation
// ==============================================================================
export function calculateInvoiceTotals(data) {
  const lineItems = Array.isArray(data.line_items) ? data.line_items : [];

  let subtotal = 0;
  const processedItems = lineItems.map((item, index) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    // Safe rounding to 2 decimal places per line item
    const lineAmount = Math.round(qty * rate * 100) / 100;
    subtotal += lineAmount;

    return {
      id: item.id || `item_${index + 1}`,
      serial_number: index + 1,
      description: String(item.description || '').trim(),
      quantity: qty,
      unit: String(item.unit || '').trim(),
      rate: rate,
      amount: lineAmount,
      notes: String(item.notes || '').trim(),
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;

  // Discount calculation (percentage or fixed amount)
  let discountAmount = 0;
  const discountType = data.discount_type === 'percentage' ? 'percentage' : 'fixed';
  const discountValue = Math.max(0, Number(data.discount_value) || 0);

  if (discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(subtotal, Math.round(discountValue * 100) / 100);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Tax calculation
  let taxAmount = 0;
  const taxEnabled = Boolean(data.tax_enabled);
  const taxRate = taxEnabled ? Math.max(0, Number(data.tax_rate) || 0) : 0;
  const taxLabel = String(data.tax_label || 'GST').trim();

  if (taxEnabled && taxRate > 0) {
    taxAmount = Math.round(((discountedSubtotal * taxRate) / 100) * 100) / 100;
  }

  const totalAmount = Math.round((discountedSubtotal + taxAmount) * 100) / 100;
  const currency = String(data.currency || 'INR').toUpperCase().trim();
  const amountInWords = getAmountInWords(totalAmount, currency);

  return {
    line_items: processedItems,
    subtotal,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: discountAmount,
    tax_enabled: taxEnabled,
    tax_label: taxLabel,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    currency,
    amount_in_words: amountInWords,
  };
}

// ==============================================================================
// Helper: Atomic Sequential Invoice Numbering (Delegates to D1)
// ==============================================================================
export async function getNextInvoiceSequence(year) {
  const yr = Number(year) || new Date().getFullYear();
  return invoiceD1Service.getNextSequence(yr);
}

export function formatInvoiceNumber(year, sequenceNumber) {
  const padded = String(sequenceNumber).padStart(4, '0');
  return `ZEN-INV-${year}-${padded}`;
}

// ==============================================================================
// CONTROLLERS (100% Cloudflare D1 Architecture)
// ==============================================================================

/**
 * 1. Invoice Dashboard Metrics
 */
export const getInvoiceDashboardMetrics = async (req, res) => {
  try {
    const metrics = await invoiceD1Service.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. Company Invoice Settings
 */
export const getInvoiceSettings = async (req, res) => {
  try {
    const settings = await invoiceD1Service.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateInvoiceSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const updated = await invoiceD1Service.updateSettings({
      ...body,
      updated_by: req.user?.email || 'admin',
    });
    res.json({ success: true, data: updated, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2b. Authorized Handwritten Signature Management
 */
export const uploadInvoiceSignature = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No signature file uploaded.' });
    }

    const { mimetype, size, originalname, buffer } = req.file;

    // Strict validation: PNG or JPEG only
    if (mimetype !== 'image/png' && mimetype !== 'image/jpeg') {
      return res.status(400).json({
        success: false,
        message: 'Invalid file format. Genuine signatures must be uploaded in PNG or JPEG format.',
      });
    }

    // Limit to 2MB
    if (size > 2 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Signature image is too large. Maximum file size is 2MB.',
      });
    }

    // Generate versioned key to protect historical invoices
    const ext = mimetype === 'image/jpeg' ? 'jpg' : 'png';
    const versionKey = `signatures/sig_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

    // Upload to R2 and persistent local disk
    await invoiceStorageService.uploadSignatureImage(versionKey, buffer, mimetype);

    // Update settings in D1 / store
    await invoiceD1Service.updateSettings({
      signature_key: versionKey,
      signature_configured: true,
      signature_file_name: originalname,
      signature_updated_at: new Date().toISOString(),
      updated_by: req.user?.email || 'admin',
    });

    const dataUrl = `data:${mimetype};base64,${buffer.toString('base64')}`;

    res.json({
      success: true,
      data: {
        configured: true,
        signature_configured: true,
        storage_key: versionKey,
        signature_key: versionKey,
        file_name: originalname,
        signature_file_name: originalname,
        data_url: dataUrl,
        signature_data_url: dataUrl,
        updated_at: new Date().toISOString(),
        message: 'Genuine signature uploaded and configured successfully.',
      },
    });
  } catch (err) {
    console.error('[invoiceController] uploadInvoiceSignature error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInvoiceSignature = async (req, res) => {
  try {
    const settings = await invoiceD1Service.getSettings();
    const sigKey = settings.signature_key;

    if (!sigKey) {
      return res.json({
        success: true,
        data: {
          configured: false,
          data_url: null,
          signature_data_url: null,
          storage_key: null,
          signature_key: null,
          file_name: null,
          updated_at: null,
          message: 'No signature configured',
        },
      });
    }

    const buf = await invoiceStorageService.getSignatureImageBuffer(sigKey);
    if (!buf) {
      return res.json({
        success: true,
        data: {
          configured: false,
          data_url: null,
          signature_data_url: null,
          storage_key: null,
          signature_key: null,
          file_name: null,
          updated_at: null,
          message: 'Signature file not found in storage',
        },
      });
    }

    const isJpeg = sigKey.endsWith('.jpg') || sigKey.endsWith('.jpeg');
    const mime = isJpeg ? 'image/jpeg' : 'image/png';

    if (req.query.raw === 'true') {
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.send(buf);
    }

    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

    res.json({
      success: true,
      data: {
        configured: true,
        storage_key: sigKey,
        signature_key: sigKey,
        data_url: dataUrl,
        signature_data_url: dataUrl,
        file_name: settings.signature_file_name || 'signature.png',
        updated_at: settings.signature_updated_at,
        byte_size: buf.length,
        metadata: {
          file_name: settings.signature_file_name || 'signature.png',
          updated_at: settings.signature_updated_at,
          byte_size: buf.length,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteInvoiceSignature = async (req, res) => {
  try {
    await invoiceD1Service.updateSettings({
      signature_key: '',
      signature_configured: false,
      signature_file_name: '',
      signature_updated_at: new Date().toISOString(),
      updated_by: req.user?.email || 'admin',
    });

    res.json({
      success: true,
      message: 'Configured signature has been removed. Historical issued invoices remain preserved.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. Bank Accounts Management
 */
export const getBankAccounts = async (req, res) => {
  try {
    const banks = await invoiceD1Service.getBankAccounts();
    res.json({ success: true, data: banks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createBankAccount = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.account_display_name || !b.bank_name || !b.account_number || !b.ifsc_code) {
      return res.status(400).json({
        success: false,
        message: 'Account Display Name, Bank Name, Account Number, and IFSC Code are required.',
      });
    }

    const created = await invoiceD1Service.createBankAccount(b);
    res.json({ success: true, data: created, message: 'Bank account added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const updated = await invoiceD1Service.updateBankAccount(id, b);
    res.json({ success: true, data: updated, message: 'Bank account updated' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

export const deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    await invoiceD1Service.deleteBankAccount(id);
    res.json({ success: true, message: 'Bank account removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. Saved Clients Management
 */
export const getInvoiceClients = async (req, res) => {
  try {
    const clients = await invoiceD1Service.getClients();
    res.json({ success: true, data: clients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const saveInvoiceClient = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.company_name || !b.billing_email) {
      return res.status(400).json({ success: false, message: 'Company Name and Billing Email are required.' });
    }

    const saved = await invoiceD1Service.saveClient(b);
    res.json({ success: true, data: saved, message: 'Client details saved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. Invoices List with Filtering, Search & Pagination
 */
export const getInvoices = async (req, res) => {
  try {
    const result = await invoiceD1Service.getInvoices(req.query);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. Single Invoice Details
 */
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceD1Service.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 7. Save or Update Draft Invoice
 */
export const saveDraftInvoice = async (req, res) => {
  try {
    const b = req.body || {};
    const invoiceDate = b.invoice_date || new Date().toISOString().split('T')[0];

    // Compute totals securely on server
    const totals = calculateInvoiceTotals(b);

    if (b.id) {
      const existing = await invoiceD1Service.getInvoiceById(b.id);
      if (existing && existing.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Only draft invoices can be edited. Issued invoices are immutable.',
        });
      }

      const updatedDraft = await invoiceD1Service.saveDraft({
        ...b,
        ...totals,
        id: b.id,
        invoice_date: invoiceDate,
        updated_by: req.user?.email || 'admin',
      });
      return res.json({ success: true, data: updatedDraft, message: 'Draft saved successfully' });
    }

    // New Draft: Reserve next sequential number in D1
    const defaultSettings = await invoiceD1Service.getSettings();
    const bankAccounts = await invoiceD1Service.getBankAccounts();
    const defaultBank = bankAccounts.find((a) => a.is_default && a.is_active) || bankAccounts[0] || {};

    const newDraft = await invoiceD1Service.saveDraft({
      ...b,
      ...totals,
      invoice_date: invoiceDate,
      due_date: b.due_date || invoiceDate,
      company_snapshot: b.company_snapshot || defaultSettings,
      bank_snapshot: b.bank_snapshot || defaultBank,
      created_by: req.user?.email || 'admin',
    });

    res.json({ success: true, data: newDraft, message: 'Draft invoice created' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 8. Authoritative Invoice Issuance (Locks data, freezes snapshots, generates & stores PDF)
 */
export const issueInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};

    const targetInvoice = await invoiceD1Service.getInvoiceById(id);
    if (!targetInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (targetInvoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Invoice is already in '${targetInvoice.status}' status and cannot be re-issued.`,
      });
    }

    // Merge incoming finalized edits before issuance
    const finalData = { ...targetInvoice, ...b };
    const totals = calculateInvoiceTotals(finalData);

    // Validate mandatory fields
    if (!finalData.client_snapshot?.company_name) {
      return res.status(400).json({ success: false, message: 'Client / Billed-To company name is required to issue.' });
    }
    if (!totals.line_items || totals.line_items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item is required to issue.' });
    }
    if (finalData.service_period_start && finalData.service_period_end) {
      if (finalData.service_period_end < finalData.service_period_start) {
        return res.status(400).json({ success: false, message: 'Service period end date cannot be earlier than start date.' });
      }
    }

    // Check signature requirement
    const currentSettings = await invoiceD1Service.getSettings();
    const wantsSignature = Boolean(finalData.include_signature);
    if (wantsSignature && !currentSettings.signature_key) {
      return res.status(400).json({
        success: false,
        message: 'Cannot include signature: No authorized signature has been configured in Invoice Settings.',
      });
    }

    const frozenCompany = {
      ...currentSettings,
      ...(finalData.company_snapshot || {}),
      display_name: 'Zenemoo', // Never modified. Strictly "Zenemoo"
      include_signature: wantsSignature,
      signature_key: wantsSignature ? currentSettings.signature_key : '',
    };

    let frozenBank = finalData.bank_snapshot;
    if (!frozenBank || !frozenBank.account_number) {
      const bankAccounts = await invoiceD1Service.getBankAccounts();
      frozenBank = bankAccounts.find((a) => a.is_default && a.is_active) || bankAccounts[0] || {};
    }

    const issuedPayload = {
      ...finalData,
      ...totals,
      include_signature: wantsSignature,
      company_snapshot: frozenCompany,
      bank_snapshot: frozenBank,
      status: 'issued',
      amount_paid: 0.0,
      outstanding_balance: totals.total_amount,
      issued_by: req.user?.email || 'admin',
    };

    // Load signature data URL if signature is included
    let signatureDataUrl = undefined;
    if (wantsSignature && frozenCompany.signature_key) {
      const sigBuf = await invoiceStorageService.getSignatureImageBuffer(frozenCompany.signature_key);
      if (sigBuf) {
        const isJpeg = frozenCompany.signature_key.endsWith('.jpg') || frozenCompany.signature_key.endsWith('.jpeg');
        const mime = isJpeg ? 'image/jpeg' : 'image/png';
        signatureDataUrl = `data:${mime};base64,${sigBuf.toString('base64')}`;
      }
    }

    // Generate authoritative server-side PDF
    const pdfBuffer = generateInvoicePdfBuffer(issuedPayload, { signatureDataUrl });
    const storageKey = `invoices/${issuedPayload.invoice_number}.pdf`;

    // Upload to private Cloudflare R2 / durable disk storage
    const uploadRes = await invoiceStorageService.uploadInvoicePdf(storageKey, pdfBuffer);

    // Lock and issue in Cloudflare D1
    const issuedRecord = await invoiceD1Service.issueInvoice(id, issuedPayload, uploadRes.key);

    res.json({
      success: true,
      data: issuedRecord,
      storage: {
        key: uploadRes.key,
        storageType: uploadRes.storageType,
        durable: uploadRes.durable,
      },
      message: 'Invoice issued successfully',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 9. Cancel an Invoice (With Audit Trail)
 */
export const cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body || {};

    if (!cancellation_reason || String(cancellation_reason).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'A valid cancellation reason is required for the financial audit trail.',
      });
    }

    const cancelled = await invoiceD1Service.cancelInvoice(
      id,
      String(cancellation_reason).trim(),
      req.user?.email || 'admin'
    );

    res.json({ success: true, data: cancelled, message: 'Invoice cancelled' });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 10. Record Payment against an Invoice
 */
export const recordInvoicePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};

    const paymentAmount = Number(b.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'A positive payment amount is required.' });
    }

    const result = await invoiceD1Service.recordPayment(id, {
      ...b,
      amount: paymentAmount,
      recorded_by: req.user?.email || 'admin',
    });

    res.json({
      success: true,
      data: result.invoice,
      payment: result.payment,
      message: 'Payment recorded successfully',
    });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 11. Secure Stream or Download Authoritative Invoice PDF
 */
export const getInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;

    const targetInvoice = await invoiceD1Service.getInvoiceById(id);
    if (!targetInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    let pdfBuffer = null;

    // 1. Try to fetch existing stored PDF from Cloudflare R2 / durable storage
    if (targetInvoice.pdf_storage_key) {
      pdfBuffer = await invoiceStorageService.getInvoicePdfBuffer(targetInvoice.pdf_storage_key);
    }

    // 2. If not found in storage, dynamically generate and store
    if (!pdfBuffer) {
      let signatureDataUrl = undefined;
      const wantsSig = Boolean(targetInvoice.include_signature ?? targetInvoice.company_snapshot?.include_signature);
      const sigKey = targetInvoice.company_snapshot?.signature_key;
      if (wantsSig && sigKey) {
        const sigBuf = await invoiceStorageService.getSignatureImageBuffer(sigKey);
        if (sigBuf) {
          const isJpeg = sigKey.endsWith('.jpg') || sigKey.endsWith('.jpeg');
          const mime = isJpeg ? 'image/jpeg' : 'image/png';
          signatureDataUrl = `data:${mime};base64,${sigBuf.toString('base64')}`;
        }
      }

      pdfBuffer = generateInvoicePdfBuffer(targetInvoice, { signatureDataUrl });
      const key = `invoices/${targetInvoice.invoice_number}.pdf`;
      await invoiceStorageService.uploadInvoicePdf(key, pdfBuffer);
    }

    const filename = `${targetInvoice.invoice_number || 'Zenemoo-Invoice'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
