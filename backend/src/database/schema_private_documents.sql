-- ==============================================================================
-- ZENEMOO Production Database Schema — Private Documents & NDA Vault
-- Schema: backend/src/database/schema_private_documents.sql
-- ==============================================================================

-- 1. Document Sequence Counters Table
CREATE TABLE IF NOT EXISTS public.private_document_counters (
    category VARCHAR(30) NOT NULL,
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (category, year)
);

-- 2. Private Documents Master Table
CREATE TABLE IF NOT EXISTS public.private_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_reference VARCHAR(60) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (
        document_type IN (
            'nda',
            'master_services_agreement',
            'statement_of_work',
            'service_contract',
            'data_processing_agreement',
            'vendor_agreement',
            'partnership_agreement',
            'compliance_certificate',
            'other'
        )
    ),
    access_classification TEXT NOT NULL DEFAULT 'confidential' CHECK (
        access_classification IN ('strictly_confidential', 'confidential', 'internal_restricted')
    ),
    company_name TEXT NOT NULL,
    company_ref_number TEXT,
    project_name TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    
    -- File Metadata
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    file_size BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 TEXT,
    
    -- Storage Reference
    drive_file_id TEXT NOT NULL,
    drive_folder_id TEXT,
    storage_path TEXT,
    
    -- Dates
    effective_date DATE,
    expiry_date DATE,
    signed_date DATE,
    renewal_date DATE,
    
    -- NDA & Signing Specifics
    nda_type TEXT CHECK (nda_type IN ('mutual', 'one_way_zenemoo', 'one_way_client', 'not_applicable')),
    signing_status TEXT NOT NULL DEFAULT 'draft' CHECK (
        signing_status IN ('draft', 'awaiting_signature', 'signed', 'expired', 'not_applicable')
    ),
    
    -- Lifecycle & Status
    document_status TEXT NOT NULL DEFAULT 'active' CHECK (
        document_status IN ('draft', 'active', 'awaiting_signature', 'signed', 'expiring_soon', 'expired', 'archived')
    ),
    current_version INTEGER NOT NULL DEFAULT 1,
    tags TEXT[] DEFAULT '{}',
    internal_notes TEXT,
    external_reference_url TEXT,
    
    -- Ownership & Audit
    uploader_id TEXT NOT NULL,
    uploader_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

-- 3. Document Versions Table
CREATE TABLE IF NOT EXISTS public.private_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.private_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    stored_filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    checksum_sha256 TEXT,
    drive_file_id TEXT NOT NULL,
    drive_folder_id TEXT,
    storage_path TEXT,
    change_note TEXT,
    uploader_id TEXT NOT NULL,
    uploader_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

-- 4. Document Audit Logs Table (Append-only)
CREATE TABLE IF NOT EXISTS public.private_document_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.private_documents(id) ON DELETE SET NULL,
    actor_id TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL CHECK (
        action IN (
            'create',
            'view_metadata',
            'preview',
            'download',
            'update_metadata',
            'upload_version',
            'archive',
            'unarchive',
            'delete',
            'export_metadata'
        )
    ),
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'denied')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes for Low-Egress Performance & Search
CREATE INDEX IF NOT EXISTS idx_private_docs_ref ON public.private_documents(document_reference);
CREATE INDEX IF NOT EXISTS idx_private_docs_company ON public.private_documents(company_name);
CREATE INDEX IF NOT EXISTS idx_private_docs_project ON public.private_documents(project_name);
CREATE INDEX IF NOT EXISTS idx_private_docs_type ON public.private_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_private_docs_status ON public.private_documents(document_status);
CREATE INDEX IF NOT EXISTS idx_private_docs_expiry ON public.private_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_private_docs_created ON public.private_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_versions_doc_id ON public.private_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_private_audit_doc_id ON public.private_document_audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_private_audit_created ON public.private_document_audit_logs(created_at DESC);
