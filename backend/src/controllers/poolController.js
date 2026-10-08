/**
 * ============================================================================
 * Zenemoo Pool Controller — Cloudflare Native Forwarder & Express Bridge
 * Single Source of Truth: Cloudflare Workers + Cloudflare D1
 * Zero Supabase / Zero local disk fallback dependencies.
 * ============================================================================
 */

const CLOUDFLARE_WORKER_BASE = process.env.CLOUDFLARE_POOL_WORKER_URL || 'https://zenemoo-pool-api.zenemootech.workers.dev';

/**
 * Universal dispatcher that sends requests to Cloudflare Pool Worker
 */
async function forwardToCloudflareWorker(req, res, targetPath, method = 'GET', body = null) {
  try {
    const targetUrl = new URL(`${CLOUDFLARE_WORKER_BASE}${targetPath}`);
    
    // Append query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (value !== undefined && value !== null) {
          targetUrl.searchParams.append(key, String(value));
        }
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'cf-connecting-ip': req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    };

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const fetchOptions = {
      method: method || req.method || 'GET',
      headers,
    };

    if (body || (req.body && Object.keys(req.body).length > 0 && method !== 'GET' && method !== 'HEAD')) {
      fetchOptions.body = JSON.stringify(body || req.body);
    }

    const workerRes = await fetch(targetUrl.toString(), fetchOptions);
    const contentType = workerRes.headers.get('content-type') || '';

    if (contentType.includes('text/csv')) {
      const csvText = await workerRes.text();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      const disposition = workerRes.headers.get('content-disposition');
      if (disposition) res.setHeader('Content-Disposition', disposition);
      return res.status(workerRes.status).send(csvText);
    }

    const data = await workerRes.json().catch(() => ({ success: false, message: 'Invalid response from Cloudflare Worker.' }));
    return res.status(workerRes.status).json(data);
  } catch (err) {
    console.error('[Cloudflare Pool Worker Bridge Error]:', err.message);
    return res.status(502).json({
      success: false,
      message: 'Cloudflare Pool Service is temporarily unreachable. Please verify Cloudflare D1 connection.',
      error: err.message,
    });
  }
}

// --- Public Endpoints ---
export const getPublicActivePools = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/pools/public/active', 'GET');
};

export const getPublicPoolByPublicId = async (req, res) => {
  const { publicId } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/pools/public/${publicId}`, 'GET');
};

export const submitPublicPoolResponse = async (req, res) => {
  const { publicId } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/pools/public/${publicId}/submit`, 'POST', req.body);
};

export const requestPublicHistoryOtp = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/pools/public/history/request-otp', 'POST', req.body);
};

export const verifyPublicHistoryOtp = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/pools/public/history/verify', 'POST', req.body);
};

export const getPublicPoolHistory = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/pools/public/history', 'GET');
};

// --- Talent Hub Authenticated Endpoints ---
export const getTalentHubPools = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/pools/talent-hub/list', 'GET');
};

export const getTalentHubPoolHistory = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/pools/talent-hub/history', 'GET');
};

export const submitTalentHubPoolResponse = async (req, res) => {
  const { publicId } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/pools/talent-hub/${publicId}/submit`, 'POST', req.body);
};

// --- Admin Endpoints ---
export const getAdminPools = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/admin/pools', 'GET');
};

export const getAdminPoolSummary = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/admin/pools/summary', 'GET');
};

export const createAdminPool = async (req, res) => {
  return forwardToCloudflareWorker(req, res, '/api/admin/pools', 'POST', req.body);
};

export const updateAdminPool = async (req, res) => {
  const { id } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/admin/pools/${id}`, 'PUT', req.body);
};

export const updateAdminPoolStatus = async (req, res) => {
  const { id } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/admin/pools/${id}/status`, 'PATCH', req.body);
};

export const duplicateAdminPool = async (req, res) => {
  const { id } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/admin/pools/${id}/duplicate`, 'POST', req.body);
};

export const deleteAdminPool = async (req, res) => {
  const { id } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/admin/pools/${id}`, 'DELETE');
};

export const getAdminPoolResponses = async (req, res) => {
  const { id } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/admin/pools/${id}/responses`, 'GET');
};

export const exportAdminPoolResponses = async (req, res) => {
  const { id } = req.params;
  return forwardToCloudflareWorker(req, res, `/api/admin/pools/${id}/export`, 'GET');
};

export const poolController = {
  getPublicActivePools,
  getPublicPoolByPublicId,
  submitPublicPoolResponse,
  requestPublicHistoryOtp,
  verifyPublicHistoryOtp,
  getPublicPoolHistory,
  getTalentHubPools,
  getTalentHubPoolHistory,
  submitTalentHubPoolResponse,
  getAdminPools,
  getAdminPoolSummary,
  createAdminPool,
  updateAdminPool,
  updateAdminPoolStatus,
  duplicateAdminPool,
  deleteAdminPool,
  getAdminPoolResponses,
  exportAdminPoolResponses,
};

export default poolController;
