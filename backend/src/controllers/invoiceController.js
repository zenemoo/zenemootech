import crypto from 'crypto';
import QRCode from 'qrcode';
import { cashfreeService } from '../services/cashfreeService.js';
import { invoiceD1Service } from '../services/invoiceD1Service.js';
import { generateInvoicePdfBuffer } from '../services/invoicePdfService.js';
import { generateInvoiceDocxBuffer } from '../services/invoiceWordService.js';
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
 * 1b. Diagnostics & Persistence Health Check
 */
export const getInvoiceDiagnostics = async (req, res) => {
  try {
    const diagnostics = invoiceD1Service.getDiagnostics();
    res.json({
      success: true,
      data: diagnostics,
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
    const authenticSigKey = 'signatures/sig_1792217794390_f9e14249.png';
    const settings = await invoiceD1Service.getSettings();
    let sigKey = settings.signature_key || authenticSigKey;

    let buf = await invoiceStorageService.getSignatureImageBuffer(sigKey);
    if (!buf && sigKey !== authenticSigKey) {
      buf = await invoiceStorageService.getSignatureImageBuffer(authenticSigKey);
      if (buf) {
        sigKey = authenticSigKey;
      }
    }

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
          message: 'No signature configured',
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

    // Load QR data URL if payment QR is included
    let qrDataUrl = undefined;
    if (issuedPayload.include_payment_qr && issuedPayload.payment_link_url) {
      try {
        qrDataUrl = await QRCode.toDataURL(issuedPayload.payment_link_url, {
          errorCorrectionLevel: 'H',
          margin: 1,
          scale: 6,
          width: 240,
        });
      } catch (qrErr) {
        console.warn('[invoiceController] QR code generation error:', qrErr.message);
      }
    }

    // Generate authoritative server-side PDF
    const pdfBuffer = generateInvoicePdfBuffer(issuedPayload, { signatureDataUrl, qrDataUrl });
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
 * 8b. Update Invoice Details (Edit Draft or Issued Invoices)
 */
export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};

    const targetInvoice = await invoiceD1Service.getInvoiceById(id);
    if (!targetInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Recompute financial calculations securely
    const totals = calculateInvoiceTotals(b);

    const clientSnapshot = b.client_snapshot || targetInvoice.client_snapshot || {};
    if (!clientSnapshot.company_name) {
      return res.status(400).json({ success: false, message: 'Client / Billed-To company name is required.' });
    }
    if (!totals.line_items || totals.line_items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item is required.' });
    }

    if (b.service_period_start && b.service_period_end) {
      if (b.service_period_end < b.service_period_start) {
        return res.status(400).json({ success: false, message: 'Service period end date cannot be earlier than start date.' });
      }
    }

    const currentSettings = await invoiceD1Service.getSettings();
    const wantsSignature = b.include_signature !== undefined ? Boolean(b.include_signature) : Boolean(targetInvoice.include_signature);

    let companySnapshot = b.company_snapshot || targetInvoice.company_snapshot || currentSettings;
    companySnapshot = {
      ...currentSettings,
      ...companySnapshot,
      display_name: 'Zenemoo', // Strictly "Zenemoo"
      include_signature: wantsSignature,
      signature_key: wantsSignature ? (companySnapshot.signature_key || currentSettings.signature_key || '') : '',
    };

    let bankSnapshot = b.bank_snapshot || targetInvoice.bank_snapshot;
    if (!bankSnapshot || !bankSnapshot.account_number) {
      const bankAccounts = await invoiceD1Service.getBankAccounts();
      bankSnapshot = bankAccounts.find((a) => a.is_default && a.is_active) || bankAccounts[0] || {};
    }

    const updatedData = {
      ...targetInvoice,
      ...b,
      ...totals,
      include_signature: wantsSignature,
      company_snapshot: companySnapshot,
      bank_snapshot: bankSnapshot,
      client_snapshot: clientSnapshot,
      updated_by: req.user?.email || 'admin',
    };

    // If invoice is already issued or paid, regenerate and re-upload the authoritative PDF
    if (targetInvoice.status !== 'draft') {
      try {
        let signatureDataUrl = undefined;
        if (wantsSignature && companySnapshot.signature_key) {
          const sigBuf = await invoiceStorageService.getSignatureImageBuffer(companySnapshot.signature_key);
          if (sigBuf) {
            const isJpeg = companySnapshot.signature_key.endsWith('.jpg') || companySnapshot.signature_key.endsWith('.jpeg');
            const mime = isJpeg ? 'image/jpeg' : 'image/png';
            signatureDataUrl = `data:${mime};base64,${sigBuf.toString('base64')}`;
          }
        }

        let qrDataUrl = undefined;
        if (updatedData.include_payment_qr && updatedData.payment_link_url) {
          try {
            qrDataUrl = await QRCode.toDataURL(updatedData.payment_link_url, {
              errorCorrectionLevel: 'H',
              margin: 1,
              scale: 6,
              width: 240,
            });
          } catch (qrErr) {
            console.warn('[invoiceController] QR code generation error on update:', qrErr.message);
          }
        }

        const pdfBuffer = generateInvoicePdfBuffer(updatedData, { signatureDataUrl, qrDataUrl });
        const storageKey = targetInvoice.pdf_storage_key || `invoices/${targetInvoice.invoice_number}.pdf`;
        const uploadRes = await invoiceStorageService.uploadInvoicePdf(storageKey, pdfBuffer);
        updatedData.pdf_storage_key = uploadRes.key;
        updatedData.pdf_generated_at = new Date().toISOString();
      } catch (pdfErr) {
        console.warn('[updateInvoice] PDF regeneration note:', pdfErr.message);
      }
    }

    const saved = await invoiceD1Service.updateInvoice(id, updatedData, req.user?.email || 'admin');

    res.json({
      success: true,
      data: saved,
      message: 'Invoice updated successfully',
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

      let qrDataUrl = undefined;
      if (targetInvoice.include_payment_qr && targetInvoice.payment_link_url) {
        try {
          qrDataUrl = await QRCode.toDataURL(targetInvoice.payment_link_url, {
            errorCorrectionLevel: 'H',
            margin: 1,
            scale: 6,
            width: 240,
          });
        } catch (qrErr) {
          console.warn('[invoiceController] QR code generation error on fetch:', qrErr.message);
        }
      }

      pdfBuffer = generateInvoicePdfBuffer(targetInvoice, { signatureDataUrl, qrDataUrl });
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

/**
 * 12. Secure Stream or Download Authoritative Invoice Word (.docx) Document
 */
export const getInvoiceDocx = async (req, res) => {
  try {
    const { id } = req.params;

    const targetInvoice = await invoiceD1Service.getInvoiceById(id);
    if (!targetInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const docxBuffer = await generateInvoiceDocxBuffer(targetInvoice);
    const filename = `${targetInvoice.invoice_number || 'Zenemoo-Invoice'}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    res.send(docxBuffer);
  } catch (err) {
    console.error('[invoiceController] getInvoiceDocx error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 13. Delete Invoice from History (Enforces financial guards & cleans associated R2 storage)
 */
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const targetInvoice = await invoiceD1Service.getInvoiceById(id);
    if (!targetInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Server-side financial protection: Do not allow deletion of invoices with recorded payments
    const amountPaid = Number(targetInvoice.amount_paid) || 0;
    const hasPayments = (targetInvoice.payments && targetInvoice.payments.length > 0) || amountPaid > 0;
    if (hasPayments) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice with recorded payments. Please cancel/void the invoice instead to preserve the financial ledger.',
      });
    }

    // Clean up associated PDF storage object if present
    if (targetInvoice.pdf_storage_key) {
      try {
        await invoiceStorageService.deleteInvoicePdf(targetInvoice.pdf_storage_key);
      } catch (storageErr) {
        console.warn(`[invoiceController] Storage deletion warning for ${targetInvoice.pdf_storage_key}:`, storageErr.message);
      }
    }

    // Delete record from database
    await invoiceD1Service.deleteInvoice(id, req.user?.email || 'admin');

    res.json({
      success: true,
      message: `Invoice ${targetInvoice.invoice_number || id} has been successfully deleted.`,
    });
  } catch (err) {
    console.error('[invoiceController] deleteInvoice error:', err);
    const status = err.message?.includes('Cannot permanently delete') ? 400 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

/**
 * 13. Create or Retrieve Cashfree Payment Link for Invoice (Idempotent & Notification-Suppressed)
 */
export const generateInvoicePaymentLink = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_payment_link, include_payment_qr, force_regenerate } = req.body || {};

    const targetInvoice = await invoiceD1Service.getInvoiceById(id);
    if (!targetInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (targetInvoice.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot generate payment link for a cancelled invoice.' });
    }

    if (targetInvoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This invoice has already been fully paid.' });
    }

    // Amount must strictly derive from authoritative invoice calculation on the server
    const total = Number(targetInvoice.total_amount || 0);
    const paid = Number(targetInvoice.amount_paid || 0);
    const payableAmount = targetInvoice.status === 'draft' ? total : Math.max(0, Number(targetInvoice.outstanding_balance ?? (total - paid)));
    if (isNaN(payableAmount) || payableAmount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invoice payable amount must be at least ₹1.00 to generate a payment link.',
      });
    }

    const incLink = include_payment_link !== undefined ? Boolean(include_payment_link) : (targetInvoice.include_payment_link !== undefined ? Boolean(targetInvoice.include_payment_link) : true);
    const incQr = include_payment_qr !== undefined ? Boolean(include_payment_qr) : (targetInvoice.include_payment_qr !== undefined ? Boolean(targetInvoice.include_payment_qr) : true);

    // Idempotency: If an active link already exists for this exact amount, reuse it without duplicate API calls
    const existingLinkId = targetInvoice.payment_link_id;
    const existingUrl = targetInvoice.payment_link_url;
    const existingStatus = targetInvoice.payment_link_status;
    const existingAmount = Number(targetInvoice.payment_link_amount || 0);

    const isExistingAmountMatching = Math.abs(existingAmount - payableAmount) < 0.01;

    if (!force_regenerate && existingLinkId && existingUrl && existingStatus === 'ACTIVE') {
      if (isExistingAmountMatching) {
        // Persist preferences if modified
        if (targetInvoice.include_payment_link !== incLink || targetInvoice.include_payment_qr !== incQr) {
          await invoiceD1Service.updateInvoice(targetInvoice.id, {
            include_payment_link: incLink,
            include_payment_qr: incQr,
          });
        }

        return res.json({
          success: true,
          reused: true,
          message: 'Existing active payment link retrieved successfully.',
          link: {
            link_id: existingLinkId,
            link_url: existingUrl,
            link_amount: existingAmount,
            link_status: 'ACTIVE',
            include_payment_link: incLink,
            include_payment_qr: incQr,
          },
        });
      } else {
        // Amount changed! Return warning or require regeneration
        return res.status(409).json({
          success: false,
          amount_mismatch: true,
          current_invoice_total: payableAmount,
          existing_link_amount: existingAmount,
          message: `The invoice total has changed from ₹${existingAmount.toFixed(2)} to ₹${payableAmount.toFixed(2)}. Please confirm regeneration to update the Cashfree payment link.`,
        });
      }
    }

    // If recreating or amount changed, cancel old link if one was present
    if (existingLinkId && (!isExistingAmountMatching || force_regenerate)) {
      try {
        await cashfreeService.cancelPaymentLink(existingLinkId);
      } catch (cancelErr) {
        console.warn(`[generateInvoicePaymentLink] Could not cancel previous link ${existingLinkId}:`, cancelErr.message);
      }
    }

    // Clean client details
    const client = targetInvoice.client_snapshot || {};
    const cleanName = (client.company_name || client.contact_person || 'Zenemoo Client').trim().slice(0, 50);
    const cleanEmail = (client.billing_email && client.billing_email.includes('@'))
      ? client.billing_email.trim().toLowerCase()
      : 'billing@zenemoo.in';
    const cleanPhone = (client.phone || '').replace(/[^0-9]/g, '').slice(-10) || '9999999999';

    // Format unique deterministic link ID: PL_INV_<invoice_number_cleaned>_<salt>
    const cleanNum = (targetInvoice.invoice_number || 'INV').replace(/[^a-zA-Z0-9]/g, '_');
    const salt = crypto.randomBytes(2).toString('hex').toUpperCase();
    const linkId = `PL_INV_${cleanNum}_${salt}`.slice(0, 45);

    // Call Cashfree PG API with EXPLICIT notification suppression
    const cfLink = await cashfreeService.createPaymentLink({
      linkId,
      amount: payableAmount,
      currency: targetInvoice.currency || 'INR',
      purpose: `Invoice ${targetInvoice.invoice_number} Payment — Zenemoo`,
      customer: {
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
      },
      returnUrl: `https://www.zenemoo.in/pay/invoice-success?invoice_id=${encodeURIComponent(targetInvoice.id)}&order_id={order_id}`,
      notify: {
        sendSms: false,
        sendEmail: false,
      },
    });

    // Update authoritative invoice record in D1 / local store
    await invoiceD1Service.updateInvoice(targetInvoice.id, {
      payment_link_id: cfLink.linkId,
      payment_link_url: cfLink.linkUrl,
      payment_link_status: cfLink.linkStatus || 'ACTIVE',
      payment_link_amount: payableAmount,
      payment_link_expiry: cfLink.linkExpiryTime || null,
      include_payment_link: incLink,
      include_payment_qr: incQr,
    });

    return res.status(201).json({
      success: true,
      reused: false,
      message: 'Cashfree payment link generated successfully without sending notifications.',
      link: {
        link_id: cfLink.linkId,
        link_url: cfLink.linkUrl,
        link_amount: payableAmount,
        link_status: cfLink.linkStatus || 'ACTIVE',
        include_payment_link: incLink,
        include_payment_qr: incQr,
      },
    });
  } catch (err) {
    console.error('[generateInvoicePaymentLink] error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate Cashfree payment link.',
    });
  }
};

/**
 * 14. Cancel / Disable Invoice Payment Link
 */
export const cancelInvoicePaymentLink = async (req, res) => {
  try {
    const { id } = req.params;
    const targetInvoice = await invoiceD1Service.getInvoiceById(id);
    if (!targetInvoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (targetInvoice.payment_link_id) {
      try {
        await cashfreeService.cancelPaymentLink(targetInvoice.payment_link_id);
      } catch (err) {
        console.warn('[cancelInvoicePaymentLink] Cashfree cancel warning:', err.message);
      }
    }

    await invoiceD1Service.updateInvoice(targetInvoice.id, {
      payment_link_status: 'CANCELLED',
      include_payment_link: false,
      include_payment_qr: false,
    });

    res.json({ success: true, message: 'Payment link disabled for this invoice.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
