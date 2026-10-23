import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { sanitizePostgrestFilter } from '../utils/postgrestSanitizer.js';
import {
  validatePdfBuffer,
  validateVaultFileBuffer,
  computeSha256,
  generatePrivateDocumentFilename,
  getMimeType,
  privateStorageService,
} from '../services/privateStorageService.js';

// In-memory fallback stores for local development / testing without live Supabase
const fallbackPrivateDocs = [];
const fallbackVersions = [];
const fallbackAuditLogs = [];
const fallbackCounters = new Map();

// Concurrency lock chain map to ensure strict serial atomic reference generation
const counterLocks = new Map();

/**
 * Generate Next Concurrency-Safe Document Reference Number:
 * e.g. ZEN-NDA-2026-0001 or ZEN-DOC-2026-0001
 */
async function getNextDocumentReference(documentType, year = new Date().getFullYear()) {
  const isNda = String(documentType).toLowerCase() === 'nda';
  const category = isNda ? 'NDA' : 'DOC';
  const counterKey = `${category}_${year}`;

  // Acquire / chain lock promise for this category + year
  const prevPromise = counterLocks.get(counterKey) || Promise.resolve();
  let release;
  const currentPromise = new Promise((resolve) => {
    release = resolve;
  });
  counterLocks.set(counterKey, currentPromise);

  await prevPromise;
  try {
    const prefix = `ZEN-${category}-${year}-`;
    let nextSeq = 1;

    if (supabase) {
      try {
        const { data: existing, error: selErr } = await supabase
          .from('private_document_counters')
          .select('last_number')
          .eq('category', category)
          .eq('year', year)
          .maybeSingle();

        if (!selErr && existing && typeof existing.last_number === 'number') {
          nextSeq = existing.last_number + 1;
          await supabase
            .from('private_document_counters')
            .update({ last_number: nextSeq })
            .eq('category', category)
            .eq('year', year);
          fallbackCounters.set(counterKey, Math.max(nextSeq, fallbackCounters.get(counterKey) || 0));
          return `${prefix}${String(nextSeq).padStart(4, '0')}`;
        } else if (!selErr && !existing) {
          nextSeq = 1;
          await supabase
            .from('private_document_counters')
            .insert({ category, year, last_number: nextSeq });
          fallbackCounters.set(counterKey, nextSeq);
          return `${prefix}${String(nextSeq).padStart(4, '0')}`;
        }
      } catch (e) {
        console.warn('[Private Counter DB Note]:', e.message);
      }
    }

    // Memory counter fallback
    const curr = fallbackCounters.get(counterKey) || 0;
    nextSeq = curr + 1;
    fallbackCounters.set(counterKey, nextSeq);
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  } finally {
    release();
  }
}


/**
 * Record an audit log event
 */
async function recordAuditLog({
  documentId,
  actorId,
  actorEmail,
  action,
  status = 'success',
  ipAddress = '127.0.0.1',
  userAgent = '',
  details = {},
}) {
  const logEntry = {
    id: crypto.randomUUID(),
    document_id: documentId || null,
    actor_id: actorId || 'admin',
    actor_email: actorEmail || 'admin@zenemoo.in',
    action,
    ip_address: ipAddress,
    user_agent: userAgent,
    status,
    details: details || {},
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from('private_document_audit_logs').insert({
        document_id: logEntry.document_id,
        actor_id: logEntry.actor_id,
        actor_email: logEntry.actor_email,
        action: logEntry.action,
        ip_address: logEntry.ip_address,
        user_agent: logEntry.user_agent,
        status: logEntry.status,
        details: logEntry.details,
      });
      return;
    } catch (e) {
      console.warn('[Audit Log DB Insert Note]:', e.message);
    }
  }

  fallbackAuditLogs.unshift(logEntry);
}

// Columns selected for low-egress listing
const LISTING_COLUMNS =
  'id, document_reference, title, document_type, access_classification, company_name, project_name, effective_date, expiry_date, signed_date, nda_type, signing_status, document_status, current_version, file_size, uploader_email, created_at, updated_at';

/**
 * GET /api/private-documents/stats
 * Dashboard summary statistics
 */
export const getDashboardStats = async (req, res) => {
  try {
    let docs = [];

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('private_documents')
          .select('id, document_status, signing_status, expiry_date');

        if (!error && data) {
          docs = data;
        }
      } catch (e) {
        console.warn('[Dashboard Stats DB Note]:', e.message);
      }
    }

    if (docs.length === 0 && fallbackPrivateDocs.length > 0) {
      docs = fallbackPrivateDocs;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const total = docs.length;
    const active = docs.filter((d) => d.document_status === 'active' || d.document_status === 'signed').length;
    const awaitingSignature = docs.filter(
      (d) => d.signing_status === 'awaiting_signature' || d.document_status === 'awaiting_signature'
    ).length;
    const expiringSoon = docs.filter(
      (d) =>
        d.document_status !== 'archived' &&
        d.expiry_date &&
        d.expiry_date >= todayStr &&
        d.expiry_date <= thirtyDaysFromNow
    ).length;
    const expired = docs.filter(
      (d) =>
        d.document_status !== 'archived' &&
        d.expiry_date &&
        d.expiry_date < todayStr
    ).length;
    const archived = docs.filter((d) => d.document_status === 'archived').length;

    res.json({
      success: true,
      stats: {
        total,
        active,
        awaitingSignature,
        expiringSoon,
        expired,
        archived,
      },
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/private-documents
 * Server-side paginated list with search and filters
 */
export const getPrivateDocuments = async (req, res) => {
  try {
    const {
      search,
      document_type,
      document_status,
      access_classification,
      signing_status,
      expiring_soon,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * pageSize;
    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (supabase) {
      try {
        let query = supabase
          .from('private_documents')
          .select(LISTING_COLUMNS, { count: 'exact' });

        if (document_type && document_type !== 'all') {
          query = query.eq('document_type', document_type);
        }
        if (document_status && document_status !== 'all') {
          query = query.eq('document_status', document_status);
        }
        if (access_classification && access_classification !== 'all') {
          query = query.eq('access_classification', access_classification);
        }
        if (signing_status && signing_status !== 'all') {
          query = query.eq('signing_status', signing_status);
        }
        if (expiring_soon === 'true') {
          query = query
            .gte('expiry_date', todayStr)
            .lte('expiry_date', thirtyDaysFromNow)
            .neq('document_status', 'archived');
        }

        if (search) {
          const q = sanitizePostgrestFilter(search);
          if (q) {
            query = query.or(
              `title.ilike.%${q}%,document_reference.ilike.%${q}%,company_name.ilike.%${q}%,project_name.ilike.%${q}%,contact_person.ilike.%${q}%`
            );
          }
        }

        const validSortFields = ['created_at', 'title', 'company_name', 'expiry_date', 'document_status'];
        const sortCol = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        query = query.order(sortCol, { ascending: sortOrder === 'asc' });
        query = query.range(offset, offset + pageSize - 1);

        const { data, count, error } = await query;

        if (!error && data) {
          return res.json({
            success: true,
            documents: data,
            total: count || data.length,
            page: pageNum,
            pageSize,
            totalPages: Math.ceil((count || data.length) / pageSize),
          });
        }
      } catch (dbErr) {
        console.warn('[Private Docs DB Query Note]:', dbErr.message);
      }
    }

    // In-memory fallback
    let filtered = [...fallbackPrivateDocs];

    if (document_type && document_type !== 'all') {
      filtered = filtered.filter((d) => d.document_type === document_type);
    }
    if (document_status && document_status !== 'all') {
      filtered = filtered.filter((d) => d.document_status === document_status);
    }
    if (access_classification && access_classification !== 'all') {
      filtered = filtered.filter((d) => d.access_classification === access_classification);
    }
    if (signing_status && signing_status !== 'all') {
      filtered = filtered.filter((d) => d.signing_status === signing_status);
    }
    if (expiring_soon === 'true') {
      filtered = filtered.filter(
        (d) =>
          d.document_status !== 'archived' &&
          d.expiry_date &&
          d.expiry_date >= todayStr &&
          d.expiry_date <= thirtyDaysFromNow
      );
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.document_reference.toLowerCase().includes(q) ||
          d.company_name.toLowerCase().includes(q) ||
          (d.project_name || '').toLowerCase().includes(q) ||
          (d.contact_person || '').toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + pageSize);

    res.json({
      success: true,
      documents: paginated,
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('getPrivateDocuments error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/private-documents/:id
 * Full document details, versions, and audit history
 */
export const getPrivateDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;
    let versions = [];
    let auditLogs = [];

    if (supabase) {
      try {
        const { data: dbDoc } = await supabase
          .from('private_documents')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (dbDoc) {
          doc = dbDoc;
          const [versRes, auditRes] = await Promise.all([
            supabase
              .from('private_document_versions')
              .select('*')
              .eq('document_id', id)
              .order('version_number', { ascending: false }),
            supabase
              .from('private_document_audit_logs')
              .select('*')
              .eq('document_id', id)
              .order('created_at', { ascending: false })
              .limit(50),
          ]);
          versions = versRes.data || [];
          auditLogs = auditRes.data || [];
        }
      } catch (dbErr) {
        console.warn('[Private Doc Details DB Note]:', dbErr.message);
      }
    }

    if (!doc) {
      doc = fallbackPrivateDocs.find((d) => d.id === id);
      if (doc) {
        versions = fallbackVersions.filter((v) => v.document_id === id);
        auditLogs = fallbackAuditLogs.filter((a) => a.document_id === id);
      }
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Private document not found' });
    }

    // Record view in audit log
    await recordAuditLog({
      documentId: doc.id,
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@zenemoo.in',
      action: 'view_metadata',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      document: doc,
      versions,
      auditLogs,
    });
  } catch (err) {
    console.error('getPrivateDocumentById error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/private-documents
 * Upload and create a new private document
 */
export const createPrivateDocument = async (req, res) => {
  let uploadedFileDetails = null;

  try {
    const {
      title,
      company_name,
      document_type,
      access_classification = 'confidential',
      nda_type,
      signing_status = 'draft',
      project_name,
      company_ref_number,
      contact_person,
      contact_email,
      contact_phone,
      effective_date,
      expiry_date,
      signed_date,
      renewal_date,
      tags = [],
      internal_notes,
      external_reference_url,
      file_base64,
      pdf_base64,
      original_filename = 'document.pdf',
    } = req.body;

    const rawBase64 = file_base64 || pdf_base64;
    const cleanOriginalFilename = String(original_filename || 'document.pdf').trim();

    // 1. Mandatory Fields Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Document title is required.' });
    }
    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ success: false, message: 'Company or client name is required.' });
    }
    if (!document_type || !document_type.trim()) {
      return res.status(400).json({ success: false, message: 'Document type is required.' });
    }
    if (!rawBase64) {
      return res.status(400).json({ success: false, message: 'Document file is required.' });
    }

    const uploaderId = req.user?.id || req.user?.team_member_id || 'admin';
    const uploaderEmail = req.user?.email || 'admin@zenemoo.in';

    // 2. Decode and Validate File Buffer (PDF, Word, Excel/Sheets, Images)
    let buffer;
    try {
      buffer = Buffer.from(rawBase64, 'base64');
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid Base64 file encoding.' });
    }

    const validation = validateVaultFileBuffer(buffer, cleanOriginalFilename);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const detectedMime = validation.detectedMime || getMimeType(cleanOriginalFilename, 'application/octet-stream');

    // 3. Concurrency-Safe Document Reference Number Generation
    const year = new Date().getFullYear();
    const documentReference = await getNextDocumentReference(document_type, year);

    // 4. Generate Standardized Filename with Preserved Extension
    const storedFilename = generatePrivateDocumentFilename({
      documentReference,
      companyName: company_name.trim(),
      version: 1,
      originalFilename: cleanOriginalFilename,
    });

    // 5. Store File in Dedicated Private Storage
    uploadedFileDetails = await privateStorageService.uploadPrivatePdf({
      buffer,
      storedFilename,
      documentType: document_type,
      documentReference,
      year,
      mimeType: detectedMime,
    });

    const docId = crypto.randomUUID();
    const checksum = uploadedFileDetails.checksumSha256;

    // Determine initial document status
    let initialDocStatus = 'active';
    if (signing_status === 'awaiting_signature') {
      initialDocStatus = 'awaiting_signature';
    } else if (signing_status === 'draft') {
      initialDocStatus = 'draft';
    } else if (signing_status === 'signed') {
      initialDocStatus = 'signed';
    }

    const documentRecord = {
      id: docId,
      document_reference: documentReference,
      title: title.trim(),
      document_type: document_type.trim(),
      access_classification,
      company_name: company_name.trim(),
      company_ref_number: company_ref_number ? company_ref_number.trim() : null,
      project_name: project_name ? project_name.trim() : null,
      contact_person: contact_person ? contact_person.trim() : null,
      contact_email: contact_email ? contact_email.trim() : null,
      contact_phone: contact_phone ? contact_phone.trim() : null,
      original_filename: cleanOriginalFilename,
      stored_filename: storedFilename,
      mime_type: detectedMime,
      file_size: uploadedFileDetails.fileSize,
      checksum_sha256: checksum,
      drive_file_id: uploadedFileDetails.driveFileId,
      drive_folder_id: uploadedFileDetails.driveFolderId,
      storage_path: uploadedFileDetails.storagePath,
      effective_date: effective_date || null,
      expiry_date: expiry_date || null,
      signed_date: signed_date || null,
      renewal_date: renewal_date || null,
      nda_type: nda_type || (document_type === 'nda' ? 'mutual' : 'not_applicable'),
      signing_status: signing_status || 'draft',
      document_status: initialDocStatus,
      current_version: 1,
      tags: Array.isArray(tags) ? tags : [],
      internal_notes: internal_notes ? internal_notes.trim() : null,
      external_reference_url: external_reference_url ? external_reference_url.trim() : null,
      uploader_id: uploaderId,
      uploader_email: uploaderEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
    };

    const versionRecord = {
      id: crypto.randomUUID(),
      document_id: docId,
      version_number: 1,
      stored_filename: storedFilename,
      original_filename: original_filename.trim(),
      file_size: uploadedFileDetails.fileSize,
      checksum_sha256: checksum,
      drive_file_id: uploadedFileDetails.driveFileId,
      drive_folder_id: uploadedFileDetails.driveFolderId,
      storage_path: uploadedFileDetails.storagePath,
      change_note: 'Initial upload',
      uploader_id: uploaderId,
      uploader_email: uploaderEmail,
      created_at: new Date().toISOString(),
    };

    // 6. Persist to Database (Supabase with in-memory fallback)
    let persistedDoc = null;
    if (supabase) {
      try {
        const { data: createdDoc, error: docErr } = await supabase
          .from('private_documents')
          .insert(documentRecord)
          .select()
          .single();

        if (!docErr && createdDoc) {
          persistedDoc = createdDoc;
          versionRecord.document_id = createdDoc.id;
          await supabase.from('private_document_versions').insert(versionRecord);
        } else if (docErr) {
          console.warn('[Private Docs DB Insert Note - Fallback Active]:', docErr.message);
        }
      } catch (dbErr) {
        console.warn('[Private Docs DB Exception - Fallback Active]:', dbErr.message);
      }
    }

    if (!persistedDoc) {
      fallbackPrivateDocs.unshift(documentRecord);
      fallbackVersions.unshift(versionRecord);
      persistedDoc = documentRecord;
    }

    // 7. Audit Logging
    await recordAuditLog({
      documentId: persistedDoc.id,
      actorId: uploaderId,
      actorEmail: uploaderEmail,
      action: 'create',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        documentReference,
        title: persistedDoc.title,
        companyName: persistedDoc.company_name,
        storedFilename,
        fileSize: uploadedFileDetails.fileSize,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Private document created and securely archived.',
      document: persistedDoc,
    });
  } catch (err) {
    console.error('createPrivateDocument error:', err);
    // Cleanup if storage succeeded
    if (uploadedFileDetails?.driveFileId) {
      await privateStorageService.deletePrivatePdf(uploadedFileDetails.driveFileId);
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/private-documents/:id
 * Edit document metadata (title, dates, notes, tags, contacts)
 */
export const updatePrivateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      company_name,
      document_type,
      access_classification,
      nda_type,
      signing_status,
      document_status,
      project_name,
      company_ref_number,
      contact_person,
      contact_email,
      contact_phone,
      effective_date,
      expiry_date,
      signed_date,
      renewal_date,
      tags,
      internal_notes,
      external_reference_url,
    } = req.body;

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (company_name !== undefined) updates.company_name = company_name.trim();
    if (document_type !== undefined) updates.document_type = document_type.trim();
    if (access_classification !== undefined) updates.access_classification = access_classification;
    if (nda_type !== undefined) updates.nda_type = nda_type;
    if (signing_status !== undefined) updates.signing_status = signing_status;
    if (document_status !== undefined) updates.document_status = document_status;
    if (project_name !== undefined) updates.project_name = project_name ? project_name.trim() : null;
    if (company_ref_number !== undefined) updates.company_ref_number = company_ref_number ? company_ref_number.trim() : null;
    if (contact_person !== undefined) updates.contact_person = contact_person ? contact_person.trim() : null;
    if (contact_email !== undefined) updates.contact_email = contact_email ? contact_email.trim() : null;
    if (contact_phone !== undefined) updates.contact_phone = contact_phone ? contact_phone.trim() : null;
    if (effective_date !== undefined) updates.effective_date = effective_date || null;
    if (expiry_date !== undefined) updates.expiry_date = expiry_date || null;
    if (signed_date !== undefined) updates.signed_date = signed_date || null;
    if (renewal_date !== undefined) updates.renewal_date = renewal_date || null;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (internal_notes !== undefined) updates.internal_notes = internal_notes ? internal_notes.trim() : null;
    if (external_reference_url !== undefined) updates.external_reference_url = external_reference_url ? external_reference_url.trim() : null;

    let updatedDoc = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('private_documents')
          .update(updates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          updatedDoc = data;
        }
      } catch (dbErr) {
        console.warn('[Private Doc Update DB Note]:', dbErr.message);
      }
    }

    if (!updatedDoc) {
      const idx = fallbackPrivateDocs.findIndex((d) => d.id === id);
      if (idx !== -1) {
        fallbackPrivateDocs[idx] = { ...fallbackPrivateDocs[idx], ...updates };
        updatedDoc = fallbackPrivateDocs[idx];
      }
    }

    if (!updatedDoc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await recordAuditLog({
      documentId: id,
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@zenemoo.in',
      action: 'update_metadata',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: updates,
    });

    res.json({
      success: true,
      message: 'Document metadata updated successfully.',
      document: updatedDoc,
    });
  } catch (err) {
    console.error('updatePrivateDocument error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/private-documents/:id/versions
 * Upload a replacement version preserving prior history
 */
export const uploadNewVersion = async (req, res) => {
  let uploadedFileDetails = null;

  try {
    const { id } = req.params;
    const { file_base64, pdf_base64, original_filename = 'document_v2.pdf', change_note } = req.body;
    const rawBase64 = file_base64 || pdf_base64;
    const cleanOriginalFilename = String(original_filename || 'document_v2.pdf').trim();

    if (!rawBase64) {
      return res.status(400).json({ success: false, message: 'Document file is required.' });
    }

    // 1. Fetch current document
    let doc = null;
    if (supabase) {
      try {
        const { data } = await supabase.from('private_documents').select('*').eq('id', id).maybeSingle();
        if (data) doc = data;
      } catch (_) {}
    }
    if (!doc) {
      doc = fallbackPrivateDocs.find((d) => d.id === id);
    }
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // 2. Decode and Validate File Buffer (PDF, Word, Excel/Sheets, Images)
    let buffer;
    try {
      buffer = Buffer.from(rawBase64, 'base64');
    } catch (_) {
      return res.status(400).json({ success: false, message: 'Invalid Base64 file encoding.' });
    }

    const validation = validateVaultFileBuffer(buffer, cleanOriginalFilename);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const detectedMime = validation.detectedMime || getMimeType(cleanOriginalFilename, 'application/octet-stream');
    const nextVerNum = (doc.current_version || 1) + 1;
    const uploaderId = req.user?.id || req.user?.team_member_id || 'admin';
    const uploaderEmail = req.user?.email || 'admin@zenemoo.in';

    // 3. Generate Stored Filename for New Version
    const storedFilename = generatePrivateDocumentFilename({
      documentReference: doc.document_reference,
      companyName: doc.company_name,
      version: nextVerNum,
      originalFilename: cleanOriginalFilename,
    });

    // 4. Upload New Version to Private Storage
    uploadedFileDetails = await privateStorageService.uploadPrivatePdf({
      buffer,
      storedFilename,
      documentType: doc.document_type,
      documentReference: doc.document_reference,
      year: new Date().getFullYear(),
      mimeType: detectedMime,
    });

    const versionRecord = {
      id: crypto.randomUUID(),
      document_id: doc.id,
      version_number: nextVerNum,
      stored_filename: storedFilename,
      original_filename: cleanOriginalFilename,
      file_size: uploadedFileDetails.fileSize,
      checksum_sha256: uploadedFileDetails.checksumSha256,
      drive_file_id: uploadedFileDetails.driveFileId,
      drive_folder_id: uploadedFileDetails.driveFolderId,
      storage_path: uploadedFileDetails.storagePath,
      change_note: change_note ? change_note.trim() : `Version ${nextVerNum}`,
      uploader_id: uploaderId,
      uploader_email: uploaderEmail,
      created_at: new Date().toISOString(),
    };

    const docUpdates = {
      current_version: nextVerNum,
      stored_filename: storedFilename,
      original_filename: cleanOriginalFilename,
      mime_type: detectedMime,
      file_size: uploadedFileDetails.fileSize,
      checksum_sha256: uploadedFileDetails.checksumSha256,
      drive_file_id: uploadedFileDetails.driveFileId,
      updated_at: new Date().toISOString(),
    };

    let updatedDoc = null;
    if (supabase) {
      try {
        await supabase.from('private_document_versions').insert(versionRecord);
        const { data, error: updateErr } = await supabase
          .from('private_documents')
          .update(docUpdates)
          .eq('id', doc.id)
          .select()
          .single();
        if (!updateErr && data) {
          updatedDoc = data;
        } else if (updateErr) {
          console.warn('[Private Docs DB Version Note - Fallback Active]:', updateErr.message);
        }
      } catch (dbErr) {
        console.warn('[Private Docs DB Version Exception - Fallback Active]:', dbErr.message);
      }
    }

    if (!updatedDoc) {
      fallbackVersions.unshift(versionRecord);
      const idx = fallbackPrivateDocs.findIndex((d) => d.id === id);
      if (idx !== -1) {
        fallbackPrivateDocs[idx] = { ...fallbackPrivateDocs[idx], ...docUpdates };
        updatedDoc = fallbackPrivateDocs[idx];
      }
    }

    await recordAuditLog({
      documentId: id,
      actorId: uploaderId,
      actorEmail: uploaderEmail,
      action: 'upload_version',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        versionNumber: nextVerNum,
        changeNote: versionRecord.change_note,
        fileSize: uploadedFileDetails.fileSize,
      },
    });

    res.status(201).json({
      success: true,
      message: `Version ${nextVerNum} uploaded successfully.`,
      document: updatedDoc,
      version: versionRecord,
    });
  } catch (err) {
    console.error('uploadNewVersion error:', err);
    if (uploadedFileDetails?.driveFileId) {
      await privateStorageService.deletePrivatePdf(uploadedFileDetails.driveFileId);
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/private-documents/:id/preview
 * Authenticated inline PDF preview stream with strict security headers
 */
export const previewPrivateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;

    let doc = null;
    let targetVersion = null;

    if (supabase) {
      try {
        const { data } = await supabase.from('private_documents').select('*').eq('id', id).maybeSingle();
        if (data) doc = data;

        if (version) {
          const { data: verData } = await supabase
            .from('private_document_versions')
            .select('*')
            .eq('document_id', id)
            .eq('version_number', parseInt(version, 10))
            .maybeSingle();
          if (verData) targetVersion = verData;
        }
      } catch (_) {}
    }

    if (!doc) {
      doc = fallbackPrivateDocs.find((d) => d.id === id);
      if (doc && version) {
        targetVersion = fallbackVersions.find(
          (v) => v.document_id === id && v.version_number === parseInt(version, 10)
        );
      }
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const driveFileId = targetVersion ? targetVersion.drive_file_id : doc.drive_file_id;
    const filename = targetVersion ? targetVersion.stored_filename : doc.stored_filename;

    const buffer = await privateStorageService.getPrivatePdfBuffer(driveFileId, filename);
    if (!buffer) {
      return res.status(404).json({ success: false, message: 'PDF document content is currently unavailable.' });
    }

    await recordAuditLog({
      documentId: id,
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@zenemoo.in',
      action: 'preview',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { version: targetVersion?.version_number || doc.current_version },
    });

    const targetMime = targetVersion?.mime_type || doc.mime_type || getMimeType(filename, 'application/pdf');
    const checksum = targetVersion?.checksum_sha256 || doc.checksum_sha256;

    // Zero-egress HTTP 304 Not Modified validation
    if (checksum) {
      res.setHeader('ETag', `"${checksum}"`);
      if (req.headers['if-none-match'] === `"${checksum}"`) {
        return res.status(304).end();
      }
    }

    res.setHeader('Content-Type', targetMime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600, must-revalidate');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('previewPrivateDocument error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/private-documents/:id/download
 * Authenticated attachment download
 */
export const downloadPrivateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { version } = req.query;

    let doc = null;
    let targetVersion = null;

    if (supabase) {
      try {
        const { data } = await supabase.from('private_documents').select('*').eq('id', id).maybeSingle();
        if (data) doc = data;

        if (version) {
          const { data: verData } = await supabase
            .from('private_document_versions')
            .select('*')
            .eq('document_id', id)
            .eq('version_number', parseInt(version, 10))
            .maybeSingle();
          if (verData) targetVersion = verData;
        }
      } catch (_) {}
    }

    if (!doc) {
      doc = fallbackPrivateDocs.find((d) => d.id === id);
      if (doc && version) {
        targetVersion = fallbackVersions.find(
          (v) => v.document_id === id && v.version_number === parseInt(version, 10)
        );
      }
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const driveFileId = targetVersion ? targetVersion.drive_file_id : doc.drive_file_id;
    const filename = targetVersion ? targetVersion.stored_filename : doc.stored_filename;

    const buffer = await privateStorageService.getPrivatePdfBuffer(driveFileId, filename);
    if (!buffer) {
      return res.status(404).json({ success: false, message: 'Document content is currently unavailable.' });
    }

    await recordAuditLog({
      documentId: id,
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@zenemoo.in',
      action: 'download',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { version: targetVersion?.version_number || doc.current_version },
    });

    const targetMime = targetVersion?.mime_type || doc.mime_type || getMimeType(filename, 'application/octet-stream');
    const checksum = targetVersion?.checksum_sha256 || doc.checksum_sha256;

    // Zero-egress HTTP 304 Not Modified validation
    if (checksum) {
      res.setHeader('ETag', `"${checksum}"`);
      if (req.headers['if-none-match'] === `"${checksum}"`) {
        return res.status(304).end();
      }
    }

    res.setHeader('Content-Type', targetMime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600, must-revalidate');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('downloadPrivateDocument error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PATCH /api/private-documents/:id/archive
 * Toggle archive/active status
 */
export const archivePrivateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { unarchive = false } = req.body;

    const targetStatus = unarchive ? 'active' : 'archived';
    const archivedAt = unarchive ? null : new Date().toISOString();

    let updatedDoc = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('private_documents')
          .update({
            document_status: targetStatus,
            archived_at: archivedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          updatedDoc = data;
        }
      } catch (_) {}
    }

    if (!updatedDoc) {
      const idx = fallbackPrivateDocs.findIndex((d) => d.id === id);
      if (idx !== -1) {
        fallbackPrivateDocs[idx].document_status = targetStatus;
        fallbackPrivateDocs[idx].archived_at = archivedAt;
        fallbackPrivateDocs[idx].updated_at = new Date().toISOString();
        updatedDoc = fallbackPrivateDocs[idx];
      }
    }

    if (!updatedDoc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await recordAuditLog({
      documentId: id,
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@zenemoo.in',
      action: unarchive ? 'unarchive' : 'archive',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: unarchive ? 'Document unarchived.' : 'Document moved to archive.',
      document: updatedDoc,
    });
  } catch (err) {
    console.error('archivePrivateDocument error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/private-documents/:id
 * Delete a private document with confirmation & audit log
 */
export const deletePrivateDocument = async (req, res) => {
  try {
    const { id } = req.params;

    let targetDoc = null;
    let targetVersions = [];

    if (supabase) {
      try {
        const { data } = await supabase.from('private_documents').select('*').eq('id', id).maybeSingle();
        if (data) {
          targetDoc = data;
          const { data: vers } = await supabase
            .from('private_document_versions')
            .select('drive_file_id, stored_filename')
            .eq('document_id', id);
          targetVersions = vers || [];
        }
      } catch (_) {}
    }

    if (!targetDoc) {
      targetDoc = fallbackPrivateDocs.find((d) => d.id === id);
      if (targetDoc) {
        targetVersions = fallbackVersions.filter((v) => v.document_id === id);
      }
    }

    if (!targetDoc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Delete stored files
    if (targetDoc.drive_file_id) {
      await privateStorageService.deletePrivatePdf(targetDoc.drive_file_id, targetDoc.stored_filename);
    }
    for (const v of targetVersions) {
      if (v.drive_file_id && v.drive_file_id !== targetDoc.drive_file_id) {
        await privateStorageService.deletePrivatePdf(v.drive_file_id, v.stored_filename);
      }
    }

    // Delete from Supabase
    if (supabase) {
      try {
        await supabase.from('private_documents').delete().eq('id', id);
      } catch (_) {}
    }

    // Delete from memory fallback
    const idx = fallbackPrivateDocs.findIndex((d) => d.id === id);
    if (idx !== -1) fallbackPrivateDocs.splice(idx, 1);

    await recordAuditLog({
      documentId: null,
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@zenemoo.in',
      action: 'delete',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        deletedDocumentReference: targetDoc.document_reference,
        deletedTitle: targetDoc.title,
        deletedCompany: targetDoc.company_name,
      },
    });

    res.json({
      success: true,
      message: `Document ${targetDoc.document_reference} permanently deleted.`,
    });
  } catch (err) {
    console.error('deletePrivateDocument error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/private-documents/export
 * Safe metadata export (CSV or JSON, strictly excluding file bodies and credentials)
 */
export const exportMetadata = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    let docs = [];
    if (supabase) {
      try {
        const { data } = await supabase
          .from('private_documents')
          .select(
            'document_reference, title, document_type, access_classification, company_name, project_name, effective_date, expiry_date, signed_date, renewal_date, nda_type, signing_status, document_status, current_version, file_size, uploader_email, created_at, updated_at'
          )
          .order('created_at', { ascending: false });
        if (data) docs = data;
      } catch (_) {}
    }

    if (docs.length === 0) {
      docs = fallbackPrivateDocs.map((d) => ({
        document_reference: d.document_reference,
        title: d.title,
        document_type: d.document_type,
        access_classification: d.access_classification,
        company_name: d.company_name,
        project_name: d.project_name,
        effective_date: d.effective_date,
        expiry_date: d.expiry_date,
        signed_date: d.signed_date,
        renewal_date: d.renewal_date,
        nda_type: d.nda_type,
        signing_status: d.signing_status,
        document_status: d.document_status,
        current_version: d.current_version,
        file_size: d.file_size,
        uploader_email: d.uploader_email,
        created_at: d.created_at,
        updated_at: d.updated_at,
      }));
    }

    await recordAuditLog({
      documentId: null,
      actorId: req.user?.id || 'admin',
      actorEmail: req.user?.email || 'admin@zenemoo.in',
      action: 'export_metadata',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { format, count: docs.length },
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="Zenemoo_Private_Vault_Metadata.json"');
      return res.json({ success: true, count: docs.length, data: docs });
    }

    // Format as CSV
    const headers = [
      'Document Reference',
      'Title',
      'Type',
      'Classification',
      'Company Name',
      'Project',
      'Effective Date',
      'Expiry Date',
      'Signed Date',
      'Renewal Date',
      'NDA Type',
      'Signing Status',
      'Document Status',
      'Version',
      'File Size (Bytes)',
      'Uploader Email',
      'Created At',
    ];

    const rows = docs.map((d) => [
      `"${d.document_reference || ''}"`,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${d.document_type || ''}"`,
      `"${d.access_classification || ''}"`,
      `"${(d.company_name || '').replace(/"/g, '""')}"`,
      `"${(d.project_name || '').replace(/"/g, '""')}"`,
      `"${d.effective_date || ''}"`,
      `"${d.expiry_date || ''}"`,
      `"${d.signed_date || ''}"`,
      `"${d.renewal_date || ''}"`,
      `"${d.nda_type || ''}"`,
      `"${d.signing_status || ''}"`,
      `"${d.document_status || ''}"`,
      d.current_version || 1,
      d.file_size || 0,
      `"${d.uploader_email || ''}"`,
      `"${d.created_at || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Zenemoo_Private_Vault_Metadata.csv"');
    res.send(csvContent);
  } catch (err) {
    console.error('exportMetadata error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
