import axios from 'axios';

let rawApiUrl = (import.meta as any).env?.VITE_API_URL || 'https://zenemootech-api.onrender.com/api';

// On localhost, default to local backend if running
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  rawApiUrl = 'http://localhost:5000/api';
}

rawApiUrl = rawApiUrl.replace(/\/+$/, '');
if (!rawApiUrl.endsWith('/api')) {
  rawApiUrl = `${rawApiUrl}/api`;
}

export const api = axios.create({
  baseURL: rawApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30-second default timeout
});

// In-flight GET request deduplication cache to prevent duplicate concurrent network calls
const inFlightGetRequests = new Map<string, Promise<any>>();

export const deduplicatedGet = <T = any>(url: string, config?: any): Promise<T> => {
  const key = `${url}::${JSON.stringify(config?.params || {})}`;
  if (inFlightGetRequests.has(key)) {
    return inFlightGetRequests.get(key)!;
  }
  const promise = api.get<T>(url, config)
    .finally(() => {
      // Clear from in-flight cache shortly after resolution
      setTimeout(() => {
        inFlightGetRequests.delete(key);
      }, 500);
    });
  inFlightGetRequests.set(key, promise);
  return promise as unknown as Promise<T>;
};

// Initialize default authorization header from storage if session exists on startup
if (typeof window !== 'undefined') {
  const initialToken = localStorage.getItem('zenemoo_jwt_token');
  if (initialToken) {
    api.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
  }
}

// Request interceptor for JWT authentication header (Zenemoo Admin JWT only)
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('zenemoo_jwt_token') : null;
  if (token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else {
    if (config.headers && typeof config.headers.delete === 'function') {
      config.headers.delete('Authorization');
    } else if (config.headers) {
      delete config.headers['Authorization'];
      delete config.headers.Authorization;
    }
  }
  return config;
});

// Response interceptor to handle renewed claims and broadcast automatic logouts
api.interceptors.response.use(
  (response) => {
    const newToken = response.headers['x-new-token'] || response.headers['X-New-Token'];
    if (newToken && typeof window !== 'undefined') {
      localStorage.setItem('zenemoo_jwt_token', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401 && typeof window !== 'undefined') {
      const reqUrl = error.config?.url || '';
      const currentToken = localStorage.getItem('zenemoo_jwt_token');
      const authHeader = error.config?.headers?.get
        ? error.config.headers.get('Authorization')
        : (error.config?.headers?.Authorization || error.config?.headers?.authorization);

      // Only invalidate Admin session if this was an authenticated Admin request carrying the current Admin JWT
      // and target was a core session verification endpoint (/auth/profile or /auth/me)
      const isAuthAdminRequest =
        currentToken &&
        authHeader &&
        String(authHeader).includes(currentToken) &&
        (reqUrl.includes('/auth/profile') || reqUrl.includes('/auth/me'));

      if (isAuthAdminRequest) {
        console.warn('🔑 401 Unauthorized Admin response received. Session invalidated.');
        localStorage.removeItem('zenemoo_jwt_token');
        localStorage.removeItem('zenemoo_jwt_expiry');
        localStorage.removeItem('zenemoo_session_start');
        delete api.defaults.headers.common['Authorization'];

        // Broadcast session expiration across all open tabs
        try {
          if ('BroadcastChannel' in window) {
            const channel = new BroadcastChannel('zenemoo_admin_session');
            channel.postMessage({ type: 'ADMIN_SESSION_EXPIRED', reason: 'unauthorized_401' });
            channel.close();
          }
        } catch (_) {}
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (passcode: string, email?: string) => api.post('/auth/login', { passcode, email }),
  googleAdminLogin: (supabaseToken: string) => api.post('/auth/google-admin-login', { supabaseToken }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  getAuditLogs: () => deduplicatedGet('/auth/audit-logs'),

  checkEmail: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    return await api.post('/auth/check-email', { email: cleanEmail });
  },

  forgotPassword: async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    return await api.post('/auth/forgot-password', { email: cleanEmail });
  },

  verifyOtp: async (email: string, otp: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    return await api.post('/auth/verify-otp', { email: cleanEmail, otp: cleanOtp });
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    return await api.post('/auth/reset-password', { email: cleanEmail, otp, newPassword });
  },
};


// Team APIs
export const teamApi = {
  getAll: () => api.get('/team'),
  create: (data: any) => api.post('/team', data, { timeout: 30000 }),
  reorder: (id: string, newPosition: number) => api.put('/team/reorder', { id, newPosition }, { timeout: 30000 }),
  generateSummary: (id: string) => api.post(`/team/${id}/generate-summary`, {}, { timeout: 30000 }),
  update: (id: string, data: any) => api.put(`/team/${id}`, data, { timeout: 30000 }),
  delete: (id: string) => api.delete(`/team/${id}`),
};

// Services APIs
export const serviceApi = {
  getAll: () => api.get('/services'),
  create: (data: any) => api.post('/services', data),
  update: (id: string, data: any) => api.put(`/services/${id}`, data),
  delete: (id: string) => api.delete(`/services/${id}`),
};

// Partner Companies APIs
export const partnerApi = {
  getAll: () => api.get('/partners'),
  create: (data: any) => api.post('/partners', data),
  reorder: (id: string, newPosition: number) => api.put('/partners/reorder', { id, newPosition }),
  update: (id: string, data: any) => api.put(`/partners/${id}`, data),
  delete: (id: string) => api.delete(`/partners/${id}`),
};

// Program Opportunities APIs
export const opportunityApi = {
  getAll: () => deduplicatedGet('/opportunities'),
  getAllAdmin: () => api.get('/opportunities/admin/all'),
  create: (data: any) => api.post('/opportunities', data),
  reorder: (id: string, newPosition: number) => api.put(`/opportunities/${id}/reorder`, { newPosition }),
  update: (id: string, data: any) => api.put(`/opportunities/${id}`, data),
  delete: (id: string) => api.delete(`/opportunities/${id}`),
};

// Candidate Opportunity Applications APIs
export interface OpportunityApplicationQueryParams {
  opportunity_id?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  status?: string;
  include_answers?: boolean | string;
}

export const opportunityApplicationApi = {
  getAll: (params?: string | OpportunityApplicationQueryParams) => {
    const queryParams: Record<string, any> = {};
    if (typeof params === 'string') {
      if (params) queryParams.opportunity_id = params;
    } else if (params && typeof params === 'object') {
      if (params.opportunity_id !== undefined && params.opportunity_id !== null) queryParams.opportunity_id = params.opportunity_id;
      if (params.page !== undefined && params.page !== null) queryParams.page = params.page;
      if (params.pageSize !== undefined && params.pageSize !== null) queryParams.pageSize = params.pageSize;
      if (params.limit !== undefined && params.limit !== null) queryParams.limit = params.limit;
      if (params.search !== undefined && params.search !== null && params.search !== '') queryParams.search = params.search;
      if (params.status !== undefined && params.status !== null && params.status !== '') queryParams.status = params.status;
      if (params.include_answers !== undefined && params.include_answers !== null) {
        queryParams.include_answers = String(params.include_answers);
      }
    }
    return api.get('/opportunity-applications', { params: queryParams });
  },
  getById: (id: string) => api.get(`/opportunity-applications/${id}`),
  checkDuplicate: (opportunity_id: string, email: string) =>
    api.get('/opportunity-applications/check-duplicate', { params: { opportunity_id, email } }),
  submit: (data: any) => api.post('/opportunity-applications', data),
  sendConfirmation: (data: any) => api.post('/opportunity-applications/send-confirmation', data),
  resendAcceptance: (id: string) => api.post(`/opportunity-applications/${id}/resend-acceptance`),
  update: (id: string, data: any) => api.put(`/opportunity-applications/${id}`, data),
  delete: (id: string) => api.delete(`/opportunity-applications/${id}`),
  resyncSingle: (id: string) => api.post(`/opportunity-applications/${id}/resync`),
  resyncAll: (opportunityId: string) => api.post(`/opportunity-applications/opportunity/${opportunityId}/resync-all`),
};

// Customer & Candidate Reviews APIs
export const reviewApi = {
  getPublic: (params?: { page?: number; limit?: number }) => api.get('/reviews', { params }),
  submit: (data: any) => api.post('/reviews', data),
  getAllAdmin: () => api.get('/reviews/admin/all'),
  update: (id: string, data: any) => api.put(`/reviews/admin/${id}`, data),
  delete: (id: string) => api.delete(`/reviews/admin/${id}`),
  publishAllPending: () => api.post('/reviews/admin/publish-all-pending'),
  bulkPublish: (ids: string[]) => api.post('/reviews/admin/bulk-publish', { ids }),
  bulkDelete: (ids: string[]) => api.post('/reviews/admin/bulk-delete', { ids }),
};

// Authorized Admin Emails APIs
export const adminEmailApi = {
  getAll: () => api.get('/auth/authorized-emails'),
  upsert: (data: any) => api.post('/auth/authorized-emails', data),
  delete: (idOrEmail: string) => api.delete(`/auth/authorized-emails/${encodeURIComponent(idOrEmail)}`),
};

// Contact APIs
export const contactApi = {
  getAll: () => deduplicatedGet('/contact'),
  submit: (data: any) => api.post('/contact', data),
  update: (id: string, data: any) => api.put(`/contact/${id}`, data),
  delete: (id: string) => api.delete(`/contact/${id}`),
};

// Newsletter Subscriber APIs
export const subscriberApi = {
  getAll: (params?: { page?: number; pageSize?: number; limit?: number; status?: string; search?: string }) =>
    deduplicatedGet('/subscribers', { params }),
  subscribe: (email: string | string[]) => api.post('/subscribers', { email }),
  subscribeBulk: (emails: string | string[]) => api.post('/subscribers/bulk', { emails }),
  unsubscribe: (email: string) => api.post('/subscribers/unsubscribe', { email }),
  update: (id: string, email: string) => api.put(`/subscribers/${id}`, { email }),
  delete: (id: string) => api.delete(`/subscribers/${id}`),
};

// Settings APIs
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
};

// Site Branding & Brand Logo Management APIs
export const brandingApi = {
  getActiveLogo: () => api.get('/branding/active'),
  uploadLogo: (formData: FormData) =>
    api.post('/branding/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  saveLogoUrl: (payload: { url: string; altText?: string; title?: string }) =>
    api.post('/branding/logo', payload),
  deleteLogo: () => api.delete('/branding/logo'),
};

// Cloudinary + Supabase Media APIs
export const mediaApi = {
  getAll: () => api.get('/media'),
  upload: (formData: FormData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: string, formData: FormData) =>
    api.put(`/media/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/media/${encodeURIComponent(id)}`),
};

export const uploadApi = mediaApi;

// Zenemoo AI Assistant APIs
export const aiApi = {
  chat: (
    messages: { role: string; content: string }[],
    language: 'en' | 'hi' | 'or' = 'en',
    lengthPreference: 'auto' | 'short' | 'normal' | 'detailed' = 'auto'
  ) => api.post('/ai/chat', { messages, language, lengthPreference }),
  getAnalytics: () => api.get('/ai/analytics'),
};

// Zenemoo Private Admin & HR AI Communication Assistant APIs
export const adminHrAiApi = {
  generate: (data: {
    category?: string;
    recipientType?: string;
    purpose?: string;
    userPrompt: string;
    tone?: string;
    length?: string;
    language?: string;
    signature?: any;
  }) => api.post('/admin-hr-ai/generate', data),
  modify: (data: {
    existingMessage: string;
    action: string;
  }) => api.post('/admin-hr-ai/modify', data),
};

// Zenemoo Brevo Email Engine APIs
export const emailApi = {
  send: (data: any) => api.post('/email/send', data, { timeout: 30000 }),
  getHistory: (
    params?: {
      page?: number;
      pageSize?: number;
      limit?: number;
      status?: string;
      search?: string;
      dateRange?: string;
      startDate?: string;
      endDate?: string;
    },
    signal?: AbortSignal
  ) => api.get('/email/history', { params, signal, timeout: 15000 }),
  getHistoryById: (id: string, signal?: AbortSignal) =>
    api.get(`/email/history/${encodeURIComponent(id)}`, { signal, timeout: 15000 }),
  deleteHistory: (id: string) => api.delete(`/email/history/${encodeURIComponent(id)}`),
  getDrafts: () => api.get('/email/drafts', { timeout: 15000 }),
  saveDraft: (data: any) => api.post('/email/drafts', data, { timeout: 15000 }),
  deleteDraft: (id: string) => api.delete(`/email/drafts/${encodeURIComponent(id)}`),
};

// Zenemoo Support Portal APIs
export const supportApi = {
  createTicket: (data: { category: string; subject: string; message: string; user_email?: string; user_name?: string }) =>
    api.post('/support/ticket', data),
  getTickets: (params?: { page?: number; pageSize?: number; limit?: number; status?: string; category?: string; search?: string }) =>
    deduplicatedGet('/support/tickets', params ? { params } : undefined),
  updateStatus: (id: string, status: string) => api.put(`/support/ticket/${encodeURIComponent(id)}/status`, { status }),
  getContributions: (refresh?: boolean) =>
    deduplicatedGet('/support/contributions', refresh ? { params: { refresh: 'true' } } : undefined),
  createPayment: (data: {
    amount: number;
    currency?: string;
    purpose?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    return_url?: string;
    link_id?: string;
    source?: string;
  }) => api.post('/support/create-payment', data),
  verifyPayment: (orderId: string) =>
    api.get(`/support/verify-payment/${encodeURIComponent(orderId)}`),
  getMyContributions: (email?: string, refresh?: boolean) =>
    deduplicatedGet('/support/support-payments/me', {
      params: {
        ...(email ? { email } : {}),
        ...(refresh ? { refresh: 'true', _t: Date.now() } : {}),
      },
      headers: {
        ...(email ? { 'x-user-email': email } : {}),
      },
    }),
  getMemberReceipt: (orderId: string, email?: string) =>
    api.get(`/support/support-payments/${encodeURIComponent(orderId)}/receipt`, {
      params: email ? { email } : undefined,
      headers: email ? { 'x-user-email': email } : undefined,
    }),
};

// Cashfree Payment Links APIs
export const paymentLinksApi = {
  createLink: (data: {
    amount: number;
    purpose: string;
    customer_phone?: string;
    customer_email?: string;
    customer_name?: string;
    expiry_days?: number;
    return_url?: string;
    send_sms?: boolean;
    send_email?: boolean;
  }) => api.post('/support/payment-links', data),
  getLinks: (refresh: boolean = false) =>
    deduplicatedGet('/support/payment-links', { params: refresh ? { refresh: 'true' } : undefined }),
  getPublicLink: (linkId: string) =>
    deduplicatedGet(`/support/public-link/${encodeURIComponent(linkId)}`),
  cancelLink: (linkId: string) => api.post(`/support/payment-links/${encodeURIComponent(linkId)}/cancel`),
  sendLinkEmail: (linkId: string, data?: { recipient_email?: string; recipient_name?: string }) =>
    api.post(`/support/payment-links/${encodeURIComponent(linkId)}/send-email`, data),
};

// Data Export System APIs
export const exportApi = {
  exportData: (payload: {
    section: string;
    format: 'csv' | 'xlsx' | 'pdf';
    columns?: string[];
    data?: any[];
    scope?: 'all' | 'filtered';
  }) =>
    api.post('/admin/export', payload, {
      responseType: 'blob',
      timeout: 30000,
    }),
};

// Unified Portal Authentication APIs (Team Member, HR, Admin)
export const portalAuthApi = {
  portalLogin: (email: string, password: string, expectedRole?: string) =>
    api.post('/auth/portal-login', { email, password, expectedRole }),
  getMeProfile: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword?: string; newPassword?: string } | string, newPass?: string) => {
    if (typeof data === 'object') {
      return api.post('/auth/change-password', data);
    }
    return api.post('/auth/change-password', { currentPassword: data, newPassword: newPass });
  },
};

// User Management & RBAC APIs (Admin Only)
export const userManagementApi = {
  searchRoster: (query: string) => api.get('/users/search-roster', { params: { q: query } }),
  grantAccess: (data: {
    team_member_id: string;
    role: string;
    password?: string;
    status?: string;
    email_access?: boolean;
    notification_access?: boolean;
  }) => api.post('/users/grant-access', data),
  getUsers: () => api.get('/users'),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  resetPassword: (id: string, newPassword?: string) => api.post(`/users/${id}/reset-password`, { newPassword }),
  deleteAccess: (id: string) => api.delete(`/users/${id}`),
};

// Notification System APIs
export const notificationApi = {
  getVapidKey: () => api.get('/notifications/vapid-key'),
  getAppVersion: (params?: { platform?: string; app_type?: string }) => api.get('/notifications/app-version', { params }),
  checkSubscriptionStatus: (params: { installation_id: string; platform?: string; app_type?: string }) =>
    deduplicatedGet('/notifications/subscription-status', { params }),
  subscribe: (data: {
    platform: string;
    app_type?: string;
    installation_id: string;
    token?: string | null;
    subscription?: any;
    user_id?: string;
    user_role?: string;
    app_version?: string;
    permission_status?: string;
  }) => api.post('/notifications/subscribe', data),
  getAll: (params?: { installation_id?: string; days?: number; scope?: string }) => deduplicatedGet('/notifications', { params }),
  getAdminNotifications: (params?: {
    category?: string;
    type?: string;
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
    days?: number;
  }) => deduplicatedGet('/notifications/admin', { params }),
  markRead: (id: string, installation_id?: string) => api.put(`/notifications/${id}/read`, { installation_id }),
  markAllRead: (installation_id?: string) => api.put('/notifications/read-all', { installation_id }),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  adminMarkRead: (id: string, isRead: boolean = true) => api.put(`/notifications/admin/${id}/read`, { isRead }),
  adminMarkAllRead: () => api.put('/notifications/admin/read-all'),
  deleteOlder: (retentionDays: 7 | 15 | 30) => api.post('/notifications/admin/delete-older', { retentionDays }),
  adminCreate: (data: {
    title: string;
    message: string;
    notification_type?: string;
    type?: string;
    target_type?: string;
    target_role?: string;
    target_user_id?: string;
    target_id?: string;
    url?: string;
    opportunity_id?: string;
  }) => api.post('/notifications/dispatch', data),
  adminDelete: (id: string) => api.delete(`/notifications/admin/${id}`),
};

// Email Inbox & Address Management APIs
export const emailInboxApi = {
  getEmails: (params?: {
    search?: string;
    mailbox?: string;
    category?: string;
    view?: 'all' | 'unread' | 'starred' | 'archived' | 'trash';
    sortBy?: 'newest' | 'oldest';
    order?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
    limit?: number;
    fromSender?: string;
    toRecipient?: string;
    subjectQuery?: string;
    dateRange?: string;
    hasAttachment?: string;
    starredFilter?: string;
    labelFilter?: string;
  }) => api.get('/emails/inbox', { params }),
  getSentEmails: (params?: {
    search?: string;
    mailbox?: string;
    category?: string;
    status?: string;
    view?: 'all' | 'unread' | 'starred' | 'archived' | 'trash';
    sortBy?: 'newest' | 'oldest';
    order?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
    limit?: number;
  }) => api.get('/emails/sent', { params }),
  sendEmail: async (payload: {
    mode?: 'reply' | 'replyAll' | 'forward' | 'new';
    originalEmailId?: string;
    from?: string;
    sender?: string;
    to?: string[] | string;
    recipients?: string[] | string;
    cc?: string[] | string;
    bcc?: string[] | string;
    subject: string;
    html: string;
    text?: string;
    attachments?: any[];
  }) => {
    const requestData = {
      ...payload,
      sender: payload.from || payload.sender || 'contact@zenemoo.in',
      from: payload.from || payload.sender || 'contact@zenemoo.in',
      recipients: payload.to || payload.recipients,
      to: payload.to || payload.recipients,
    };
    try {
      return await api.post('/emails/send', requestData);
    } catch (err: any) {
      if (err.response && (err.response.status === 404 || err.response.status === 405)) {
        return await api.post('/email/send', requestData);
      }
      throw err;
    }
  },
  getEmailById: (id: string) => api.get(`/emails/inbox/${encodeURIComponent(id)}`),
  updateEmailState: (
    id: string,
    data: {
      is_read?: boolean;
      is_starred?: boolean;
      is_archived?: boolean;
      is_trashed?: boolean;
      category?: string;
    }
  ) => api.patch(`/emails/inbox/${encodeURIComponent(id)}`, data),
  deleteEmail: (id: string) => api.delete(`/emails/inbox/${encodeURIComponent(id)}`),
  getAttachmentUrl: (messageId: string, attachmentId: string) =>
    api.get(`/emails/inbox/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}/url`),
  getAttachmentDownloadUrl: (messageId: string, attachmentId: string, preview = false) => {
    const baseUrl = api.defaults.baseURL || '/api';
    return `${baseUrl}/emails/inbox/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}${preview ? '?preview=1' : ''}`;
  },
  downloadAttachmentBlob: async (
    messageId: string,
    attachmentId: string,
    preview = false,
    signal?: AbortSignal
  ): Promise<{ blob: Blob; filename: string; contentType: string }> => {
    const res = await api.get(
      `/emails/inbox/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
      {
        params: preview ? { preview: '1' } : undefined,
        responseType: 'blob',
        signal,
        timeout: 45000,
      }
    );

    let filename = attachmentId;
    const dispositionHeader = res.headers ? (res.headers['content-disposition'] as string | undefined) : undefined;
    const disposition = typeof dispositionHeader === 'string' ? dispositionHeader : '';
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename\*?=['"]?(?:UTF-8'')?([^'";\r\n]+)['"]?/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim());
      }
    }
    const contentTypeHeader = res.headers ? (res.headers['content-type'] as string | undefined) : undefined;
    const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : 'application/octet-stream';

    return {
      blob: res.data as Blob,
      filename,
      contentType,
    };
  },
  getEmailAddresses: () => api.get('/emails/addresses'),
  getStorageUsage: () => api.get('/emails/storage-usage'),
  addEmailAddress: (data: {
    display_name: string;
    email: string;
    description?: string;
    mailbox_type?: string;
  }) => api.post('/emails/addresses', data),
};

// Team Member & HR Self-Service Profile APIs
export const selfProfileApi = {
  updateProfile: (data: any) => api.put('/team/profile/me', data),
  uploadImage: (payload: string | { image_url: string; phone_number?: string; link_type?: string; notes?: string }) =>
    api.post('/team/profile/upload-image', typeof payload === 'string' ? { image_url: payload } : payload),
};

// Enterprise Secure Self-Service Private Profile System
export const privateProfileApi = {
  getPrivateProfile: () => api.get('/team/private-profile/me'),
  updatePrivateProfile: (data: any) => api.put('/team/private-profile/me', data),
};

// Admin Profile Updates Approval APIs
export const pendingProfileUpdatesApi = {
  getPending: () => api.get('/team/profile-updates/pending'),
  approve: (id: string) => api.post(`/team/profile-updates/${id}/approve`),
  reject: (id: string, notes?: string) => api.post(`/team/profile-updates/${id}/reject`, { admin_notes: notes }),
};

// Enterprise Team Directory API
export const directoryApi = {
  getMembers: () => api.get('/directory/members'),
};

// Zenemoo AI Data Talent & Partner Registration API
export const talentRegistrationApi = {
  register: (data: any) => api.post('/talent-registration/register', data),
  getSupportedLanguages: () => api.get('/talent-registration/supported-languages'),
  getAdminRegistrations: (params?: any, signal?: AbortSignal) =>
    api.get('/talent-registration/admin/list', { params, signal }),
  getAdminRegistrationDetail: (id: string) => api.get(`/talent-registration/admin/detail/${id}`),
  updateAdminStatus: (id: string, data: { status?: string; internal_notes?: string; internal_scoring?: number; is_archived?: boolean }) =>
    api.patch(`/talent-registration/admin/status/${id}`, data),
  addAdminNote: (id: string, note: string) => api.post(`/talent-registration/admin/note/${id}`, { note }),
  exportAdminRegistrations: () =>
    api.get('/talent-registration/admin/export', { responseType: 'blob' }),
  deleteAdminRegistration: (id: string) =>
    api.delete(`/talent-registration/admin/delete/${id}`),

  // Supported Languages & Candidate Profile Editing
  adminGetSupportedLanguages: () => api.get('/talent-registration/admin/languages'),
  adminAddSupportedLanguage: (data: { language: string; code?: string; status?: string }) =>
    api.post('/talent-registration/admin/languages', data),
  adminUpdateSupportedLanguage: (id: string, data: { language?: string; code?: string; status?: string }) =>
    api.put(`/talent-registration/admin/languages/${id}`, data),
  adminUpdateCandidateProfile: (id: string, data: any) =>
    api.put(`/talent-registration/admin/update-profile/${id}`, data),
};



// Zenemoo Scheduled Email Engine API
export const scheduledEmailApi = {
  getScheduled: (params?: { status?: string }) => api.get('/emails/scheduled', { params }),
  getScheduledById: (id: string) => api.get(`/emails/scheduled/${id}`),
  createScheduled: (data: any) => api.post('/emails/scheduled', data),
  updateScheduled: (id: string, data: any) => api.patch(`/emails/scheduled/${id}`, data),
  cancelScheduled: (id: string) => api.post(`/emails/scheduled/${id}/cancel`),
  retryScheduled: (id: string, data?: any) => api.post(`/emails/scheduled/${id}/retry`, data),
};

// AI Data Portfolio & Dataset Management API (Timeout set to 3 minutes for large audio/video file uploads)
export const datasetApi = {
  getDatasets: (params?: { search?: string; category?: string; status?: string }, signal?: AbortSignal) =>
    api.get('/datasets', { params, signal }),
  getDatasetBySlugOrId: (identifier: string) =>
    api.get(`/datasets/${identifier}`),
  createDataset: (data: { name: string; description?: string; language?: string }) =>
    api.post('/datasets', data),
  createFolder: (datasetId: string, data: { folderName: string }) =>
    api.post(`/datasets/${datasetId}/folders`, data),
  uploadFile: (datasetId: string, data: { fileName: string; fileType?: string; mimeType?: string; fileSize?: number; base64Data?: string; driveUrl?: string; driveFolderId?: string }) =>
    api.post(`/datasets/${datasetId}/upload`, data, { timeout: 180000 }),
  uploadChunk: (datasetId: string, data: { uploadId: string; chunkIndex: number; totalChunks: number; fileName: string; fileType?: string; mimeType?: string; fileSize?: number; chunkData: string; driveFolderId?: string }) =>
    api.post(`/datasets/${datasetId}/upload-chunk`, data, { timeout: 60000 }),
  fetchLinkMetadata: (driveUrl: string) =>
    api.post('/datasets/fetch-link-metadata', { driveUrl }),
  deleteFile: (fileId: string) =>
    api.delete(`/datasets/files/${fileId}`),
  deleteDataset: (datasetId: string) =>
    api.delete(`/datasets/${datasetId}`),
};

// ZENEMOO Book a Call System API
export const bookingApi = {
  getAvailability: (date: string, timezone?: string) =>
    api.get('/bookings/availability', { params: { date, timezone } }),
  createBooking: (data: {
    fullName: string;
    email: string;
    phone: string;
    companyName: string;
    notes?: string;
    slot: string;
    turnstileToken: string;
  }) => api.post('/bookings', data),
  getBookingById: (bookingId: string) =>
    api.get(`/bookings/${encodeURIComponent(bookingId)}`),
  getAdminBookings: (params?: { search?: string; status?: string; meetingStatus?: string; emailStatus?: string; timeframe?: string; date?: string }) =>
    deduplicatedGet('/bookings/admin/list', { params }),
  generateMeetingLink: (id: string) =>
    api.post(`/bookings/admin/${encodeURIComponent(id)}/generate-meeting`),
  resendEmail: (id: string, emailType: 'customer_confirmation' | 'admin_confirmation' | 'customer_reminder' | 'admin_reminder') =>
    api.post(`/bookings/admin/${encodeURIComponent(id)}/resend-email`, { emailType }),
  updateAdminBooking: (id: string, data: { status?: string; adminNotes?: string }) =>
    api.patch(`/bookings/admin/${encodeURIComponent(id)}`, data),
  deleteAdminBooking: (id: string) =>
    api.delete(`/bookings/admin/${encodeURIComponent(id)}`),
};

// ZENEMOO Google Group Management API
export const googleGroupApi = {
  getOverview: (params?: { forceRefresh?: boolean }) =>
    api.get('/admin/google-group/overview', { params }),
  getPendingMembers: (params?: { page?: number; pageSize?: number; search?: string; forceRefresh?: boolean }, signal?: AbortSignal) =>
    api.get('/admin/google-group/pending', { params, signal }),
  getMembers: (params?: { page?: number; pageSize?: number; search?: string; originFilter?: string; forceRefresh?: boolean }, signal?: AbortSignal) =>
    api.get('/admin/google-group/members', { params, signal }),
  getExclusions: () =>
    deduplicatedGet('/admin/google-group/exclusions'),
  restoreExclusion: (email: string) =>
    api.delete(`/admin/google-group/exclusions/${encodeURIComponent(email)}`),
  triggerSync: (data?: { limit?: number; emails?: string[] }) =>
    api.post('/admin/google-group/sync', data),
  getSyncStatus: () =>
    api.get('/admin/google-group/sync-status'),
  removeMember: (email: string) =>
    api.delete(`/admin/google-group/members/${encodeURIComponent(email)}`),
};



