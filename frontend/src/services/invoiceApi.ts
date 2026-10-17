import { api, deduplicatedGet } from './api';

export interface InvoiceSettings {
  id?: string;
  legal_name: string;
  display_name: string;
  registered_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  official_email: string;
  contact_number: string;
  pan_number?: string;
  udyam_registration?: string;
  gstin?: string;
  company_logo_url?: string;
  authorized_signatory_name?: string;
  signature_image_url?: string;
  signature_configured?: boolean;
  signature_key?: string | null;
  signature_file_name?: string | null;
  signature_updated_at?: string | null;
  signature_data_url?: string | null;
  include_signature?: boolean;
  default_currency: string;
  default_payment_terms: string;
  default_invoice_notes?: string;
  default_tax_enabled: boolean;
  default_tax_label: string;
  default_tax_rate: number;
  updated_at?: string;
}

export interface InvoiceSignatureData {
  configured: boolean;
  data_url: string | null;
  file_name?: string | null;
  storage_key?: string | null;
  updated_at?: string | null;
}

export interface InvoiceDiagnostics {
  persistenceMode: 'd1' | 'local';
  isD1Configured: boolean;
  environment: string;
  cloudflareAccountIdConfigured: boolean;
  cloudflareDatabaseIdConfigured: boolean;
  cloudflareApiTokenConfigured: boolean;
  localStoreFile: string;
  recordsSummary: {
    settingsConfigured: boolean;
    bankAccountsCount: number;
    invoicesCount: number;
  };
  status: string;
}

export interface BankAccount {
  id: string;
  account_display_name: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  ifsc_code: string;
  branch_name: string;
  branch_address?: string;
  swift_bic_code?: string;
  payment_instructions?: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
}

export interface InvoiceClient {
  id: string;
  company_name: string;
  contact_person: string;
  billing_email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  pan_number?: string;
  gstin?: string;
  notes?: string;
}

export interface InvoiceLineItem {
  id: string;
  serial_number: number;
  description: string;
  quantity: number;
  unit?: string;
  rate: number;
  amount: number;
  notes?: string;
}

export interface InvoicePaymentRecord {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  sequence_year: number;
  sequence_number: number;
  status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'cancelled';
  invoice_date: string;
  due_date: string;
  service_period_start?: string | null;
  service_period_end?: string | null;
  invoice_period?: string;
  po_reference?: string;
  currency: string;
  subtotal: number;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  discount_amount?: number;
  tax_enabled?: boolean;
  tax_label?: string;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  amount_in_words?: string;
  amount_paid?: number;
  outstanding_balance?: number;
  project_name: string;
  project_description?: string;
  line_items: InvoiceLineItem[];
  client_id?: string;
  client_snapshot: Partial<InvoiceClient>;
  company_snapshot: Partial<InvoiceSettings>;
  bank_account_id?: string;
  bank_snapshot: Partial<BankAccount>;
  payment_terms?: string;
  invoice_notes?: string;
  payment_instructions?: string;
  include_signature?: boolean;
  signature_key?: string | null;
  signature_data_url?: string | null;
  pdf_storage_key?: string;
  pdf_generated_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  issued_at?: string;
  issued_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  paid_at?: string;
  paid_by?: string;
  payments?: InvoicePaymentRecord[];
}

export interface InvoiceDashboardMetrics {
  totalInvoices: number;
  drafts: number;
  issued: number;
  paid: number;
  cancelled: number;
  overdue: number;
  totalRevenue: number;
  totalOutstanding: number;
}

export const invoiceApi = {
  // Metrics
  async getMetrics(): Promise<InvoiceDashboardMetrics> {
    const res = await api.get<{ success: boolean; data: InvoiceDashboardMetrics }>('/admin/invoices/metrics');
    return res.data.data;
  },

  // Company Settings
  async getSettings(): Promise<InvoiceSettings> {
    const res = await api.get<{ success: boolean; data: InvoiceSettings }>('/admin/invoices/settings');
    return res.data.data;
  },

  async updateSettings(data: Partial<InvoiceSettings>): Promise<InvoiceSettings> {
    const res = await api.put<{ success: boolean; data: InvoiceSettings }>('/admin/invoices/settings', data);
    return res.data.data;
  },

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    const res = await api.get<{ success: boolean; data: BankAccount[] }>('/admin/invoices/banks');
    return res.data.data;
  },

  async createBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    const res = await api.post<{ success: boolean; data: BankAccount }>('/admin/invoices/banks', data);
    return res.data.data;
  },

  async updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    const res = await api.put<{ success: boolean; data: BankAccount }>(`/admin/invoices/banks/${id}`, data);
    return res.data.data;
  },

  async deleteBankAccount(id: string): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/admin/invoices/banks/${id}`);
    return res.data.success;
  },

  // Clients
  async getClients(): Promise<InvoiceClient[]> {
    const res = await api.get<{ success: boolean; data: InvoiceClient[] }>('/admin/invoices/clients');
    return res.data.data;
  },

  async saveClient(data: Partial<InvoiceClient>): Promise<InvoiceClient> {
    const res = await api.post<{ success: boolean; data: InvoiceClient }>('/admin/invoices/clients', data);
    return res.data.data;
  },

  // Invoices
  async getInvoices(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: Invoice[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const res = await api.get('/admin/invoices', { params });
    return res.data;
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const res = await api.get<{ success: boolean; data: Invoice }>(`/admin/invoices/${id}`);
    return res.data.data;
  },

  async saveDraft(data: Partial<Invoice>): Promise<Invoice> {
    const res = await api.post<{ success: boolean; data: Invoice }>('/admin/invoices/draft', data);
    return res.data.data;
  },

  async issueInvoice(id: string, data?: Partial<Invoice>): Promise<Invoice> {
    const res = await api.post<{ success: boolean; data: Invoice }>(`/admin/invoices/${id}/issue`, data || {});
    return res.data.data;
  },

  async cancelInvoice(id: string, cancellation_reason: string): Promise<Invoice> {
    const res = await api.post<{ success: boolean; data: Invoice }>(`/admin/invoices/${id}/cancel`, {
      cancellation_reason,
    });
    return res.data.data;
  },

  async recordPayment(
    id: string,
    data: { amount: number; payment_date?: string; payment_method?: string; reference_number?: string; notes?: string }
  ): Promise<{ data: Invoice; payment: InvoicePaymentRecord }> {
    const res = await api.post<{ success: boolean; data: Invoice; payment: InvoicePaymentRecord }>(
      `/admin/invoices/${id}/payments`,
      data
    );
    return res.data;
  },

  // Download PDF Blob
  async downloadPdf(id: string, invoiceNumber: string): Promise<void> {
    const res = await api.get(`/admin/invoices/${id}/pdf`, { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber || 'Zenemoo-Invoice'}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Download Word (.docx) Document
  async downloadDocx(id: string, invoiceNumber: string): Promise<void> {
    const res = await api.get(`/admin/invoices/${id}/docx`, { responseType: 'blob' });
    const blob = new Blob([res.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${invoiceNumber || 'Zenemoo-Invoice'}.docx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Delete Invoice from History (Enforces financial guards & cleans associated R2 storage)
  async deleteInvoice(id: string): Promise<boolean> {
    const res = await api.delete<{ success: boolean; message: string }>(`/admin/invoices/${id}`);
    return res.data.success;
  },

  // Handwritten Original Signature Management
  async getSignature(): Promise<InvoiceSignatureData> {
    const res = await api.get<{ success: boolean; data: InvoiceSignatureData }>('/admin/invoices/settings/signature');
    return res.data.data;
  },

  async uploadSignature(file: File): Promise<InvoiceSignatureData> {
    const formData = new FormData();
    formData.append('signature', file);
    const res = await api.post<{ success: boolean; data: InvoiceSignatureData; message: string }>(
      '/admin/invoices/settings/signature',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },

  async deleteSignature(): Promise<boolean> {
    const res = await api.delete<{ success: boolean; message: string }>('/admin/invoices/settings/signature');
    return res.data.success;
  },

  // Observability & Persistence Diagnostics
  async getDiagnostics(): Promise<InvoiceDiagnostics> {
    const res = await api.get<{ success: boolean; data: InvoiceDiagnostics }>('/admin/invoices/diagnostics');
    return res.data.data;
  },
};
