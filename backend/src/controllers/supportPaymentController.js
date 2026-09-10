import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cashfreeService } from '../services/cashfreeService.js';
import { supabase } from '../config/supabase.js';
import { supabaseService } from '../services/supabaseService.js';
import { sendMailViaBrevo } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PAYMENT_LINKS_STORE_PATH = path.join(__dirname, '../database/payment_links_store.json');

// Resilient in-memory payment cache (prevents runtime failure if DB table is not yet migrated)
const memorySupportPayments = new Map();

// Selective columns to minimize Supabase egress and payload overhead
const REQUIRED_CONTRIBUTION_COLUMNS = 'id, order_id, cf_order_id, payment_id, user_id, amount, currency, provider, status, customer_name, customer_email, customer_phone, metadata, payment_method, payment_time, created_at, updated_at';

// Server-side response cache with smart TTL and mutation-based invalidation
let cachedContributionsData = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function invalidateContributionsCache() {
  cachedContributionsData = null;
  lastCacheTimestamp = 0;
}

// Helper to sanitize customer strings
const cleanStr = (val, max = 100) => (val ? String(val).trim().slice(0, max) : '');

/**
 * Save or update payment in Supabase or memory fallback
 */
async function savePaymentRecord(orderId, paymentData) {
  // Invalidate cache immediately on payment state change
  invalidateContributionsCache();

  const existing = memorySupportPayments.get(orderId) || {};
  const merged = {
    ...existing,
    ...paymentData,
    order_id: orderId,
    updated_at: new Date().toISOString(),
  };
  if (!merged.created_at) {
    merged.created_at = new Date().toISOString();
  }
  memorySupportPayments.set(orderId, merged);

  if (supabase) {
    try {
      const { data: found } = await supabase
        .from('support_payments')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (found?.id) {
        await supabase
          .from('support_payments')
          .update(paymentData)
          .eq('order_id', orderId);
      } else {
        await supabase
          .from('support_payments')
          .insert([merged]);
      }
    } catch (err) {
      // Graceful fallback to memory store
      console.warn('Supabase support_payments table not reachable or not yet created. Using memory store:', err.message);
    }
  }

  return merged;
}

/**
 * Find payment record by orderId
 */
async function findPaymentRecord(orderId) {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('support_payments')
        .select(REQUIRED_CONTRIBUTION_COLUMNS)
        .eq('order_id', orderId)
        .maybeSingle();
      if (data) return data;
    } catch (err) {
      console.warn('Supabase support_payments fetch fallback to memory:', err.message);
    }
  }

  return memorySupportPayments.get(orderId) || null;
}

/**
 * POST /api/support/create-payment
 * Validate amount and initiate Cashfree PG Order
 */
export const createPaymentOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', customer_name, customer_email, customer_phone, return_url, purpose, link_id, source } = req.body;

    // 1. Amount validation (strict server-side checks)
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount)) {
      return res.status(400).json({
        success: false,
        message: 'A valid numeric contribution amount is required.',
      });
    }

    const MIN_AMOUNT = 10; // Minimum ₹10
    const MAX_AMOUNT = 500000; // Maximum ₹5,00,000

    if (numericAmount < MIN_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Contribution amount must be at least ₹${MIN_AMOUNT}.`,
      });
    }

    if (numericAmount > MAX_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Contribution amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`,
      });
    }

    if (currency && currency.toUpperCase() !== 'INR') {
      return res.status(400).json({
        success: false,
        message: 'Currently only INR currency is supported.',
      });
    }

    // 2. Identify customer (authenticated user or visitor input)
    const userId = req.user?.id || req.user?.team_member_id || null;
    const userEmail = cleanStr(customer_email || req.user?.email || 'supporter@zenemoo.in', 120);
    const userName = cleanStr(customer_name || req.user?.name || 'Zenemoo Supporter', 80);
    const userPhone = cleanStr(customer_phone || req.user?.phone || '9999999999', 20).replace(/[^0-9]/g, '');
    const cleanPurpose = cleanStr(purpose || 'HELP US BUILD', 60);

    // 3. Generate unique order ID
    // Format: ZNM_SUP_<timestamp>_<random>
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `ZNM_SUP_${timestamp}_${randomSuffix}`;

    // 4. Save initial PENDING payment record
    const initialRecord = {
      order_id: orderId,
      user_id: userId,
      amount: numericAmount,
      currency: 'INR',
      provider: 'cashfree',
      status: 'PENDING',
      customer_name: userName,
      customer_email: userEmail,
      customer_phone: userPhone,
      purpose: cleanPurpose,
      source: source || (link_id ? 'Admin Payment Link' : 'Direct Support Page'),
      metadata: { purpose: cleanPurpose, link_id: link_id || undefined },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await savePaymentRecord(orderId, initialRecord);

    if (link_id) {
      try {
        await savePaymentLinkRecord(link_id, { order_id: orderId });
      } catch (_) {}
    }

    // 5. Call Cashfree to generate payment session
    const cfConfig = cashfreeService.getConfig();
    if (!cfConfig.isConfigured) {
      return res.status(503).json({
        success: false,
        configured: false,
        message: 'Cashfree payment gateway credentials are not yet set in backend/.env. Please configure CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET.',
      });
    }

    const cfOrder = await cashfreeService.createOrder({
      orderId,
      amount: numericAmount,
      currency: 'INR',
      customer: {
        customerId: userId ? `usr_${userId}` : `cust_${timestamp}`,
        customerName: userName,
        customerEmail: userEmail,
        customerPhone: userPhone || '9999999999',
      },
      returnUrl:
        return_url && return_url.startsWith('https://')
          ? return_url
          : `https://www.zenemoo.in/support-zenemooindia?order_id=${orderId}`,
      orderNote: `Zenemoo Support (${cleanPurpose}) - ₹${numericAmount}`,
    });

    // Update with payment session id and cf_order_id
    await savePaymentRecord(orderId, {
      payment_session_id: cfOrder.paymentSessionId,
      cf_order_id: String(cfOrder.cfOrderId || ''),
    });

    return res.status(201).json({
      success: true,
      orderId,
      paymentSessionId: cfOrder.paymentSessionId,
      cfOrderId: cfOrder.cfOrderId,
      amount: numericAmount,
      currency: 'INR',
      env: cfConfig.env,
      customerName: userName,
      customerEmail: userEmail,
      purpose: cleanPurpose,
    });
  } catch (err) {
    console.error('createPaymentOrder error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to initialize secure payment.',
    });
  }
};

/**
 * GET /api/support/verify-payment/:orderId
 * Check order and payment status from Cashfree and database
 */
export const verifyPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required.' });
    }

    const localRecord = await findPaymentRecord(orderId);
    let orderStatus = localRecord?.status || 'PENDING';
    let paymentId = localRecord?.payment_id || null;
    let paymentMethod = localRecord?.payment_method || null;
    let paymentTime = localRecord?.payment_time || null;
    let amount = localRecord?.amount || 0;

    const cfConfig = cashfreeService.getConfig();

    // If Cashfree is configured, query Cashfree API directly for ground truth
    if (cfConfig.isConfigured) {
      try {
        const cfOrder = await cashfreeService.getOrder(orderId);
        const cfPayments = await cashfreeService.getOrderPayments(orderId);

        if (cfOrder) {
          amount = cfOrder.order_amount || amount;

          // Check if any payment was successful
          const successfulPayment = cfPayments.find((p) => p.payment_status === 'SUCCESS');
          const failedPayment = cfPayments.find((p) => p.payment_status === 'FAILED');
          const cancelledPayment = cfPayments.find((p) => p.payment_status === 'USER_DROPPED' || p.payment_status === 'CANCELLED');

          if (cfOrder.order_status === 'PAID' || successfulPayment) {
            orderStatus = 'SUCCESS';
            paymentId = successfulPayment?.cf_payment_id ? String(successfulPayment.cf_payment_id) : paymentId || `CF_${orderId}`;
            paymentTime = successfulPayment?.payment_time || new Date().toISOString();
            if (successfulPayment?.payment_method) {
              const methods = Object.keys(successfulPayment.payment_method);
              paymentMethod = methods[0] || 'Online';
            }
          } else if (cfOrder.order_status === 'EXPIRED') {
            orderStatus = 'FAILED';
          } else if (cancelledPayment && cfOrder.order_status !== 'PAID') {
            orderStatus = 'CANCELLED';
          } else if (failedPayment && cfOrder.order_status !== 'PAID') {
            orderStatus = 'FAILED';
          } else {
            orderStatus = 'PENDING';
          }

          // Update record in database/memory
          await savePaymentRecord(orderId, {
            status: orderStatus,
            payment_id: paymentId,
            payment_method: paymentMethod,
            payment_time: paymentTime,
            cf_order_id: String(cfOrder.cf_order_id || ''),
          });

          // If linked to an admin payment link, update the payment link status to PAID
          const associatedLinkId = localRecord?.link_id || localRecord?.metadata?.link_id || (orderId.startsWith('PL_') ? orderId : null);
          if (orderStatus === 'SUCCESS' && associatedLinkId) {
            try {
              await savePaymentLinkRecord(associatedLinkId, {
                link_status: 'PAID',
                order_id: orderId,
                payment_id: paymentId,
                payment_time: paymentTime,
                updated_at: new Date().toISOString(),
              });
            } catch (linkErr) {
              console.warn('Link status update warning:', linkErr.message);
            }
          }

          // If payment newly succeeded and customer email provided, send receipt email
          if (orderStatus === 'SUCCESS' && localRecord?.status !== 'SUCCESS' && localRecord?.customer_email) {
            try {
              await sendPaymentSuccessEmail({
                orderId,
                paymentId,
                amount,
                customerName: localRecord.customer_name || 'Zenemoo Supporter',
                customerEmail: localRecord.customer_email,
                paymentTime,
              });
            } catch (mailErr) {
              console.warn('Receipt email dispatch warning:', mailErr.message);
            }
          }
        }
      } catch (cfErr) {
        console.warn(`Cashfree verification error for ${orderId}:`, cfErr.message);
      }
    }

    return res.json({
      success: true,
      orderId,
      status: orderStatus,
      paymentId,
      amount,
      currency: 'INR',
      customerName: localRecord?.customer_name || 'Zenemoo Supporter',
      customerEmail: localRecord?.customer_email || '',
      purpose: localRecord?.metadata?.purpose || localRecord?.purpose || 'HELP US BUILD',
      paymentMethod,
      paymentTime: paymentTime || localRecord?.created_at,
      createdAt: localRecord?.created_at,
    });
  } catch (err) {
    console.error('verifyPaymentOrder error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Payment verification failed.',
    });
  }
};

/**
 * POST /api/payments/cashfree/webhook
 * Cashfree Webhook listener for real-time payment status updates
 */
export const handleCashfreeWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const isValid = cashfreeService.verifyWebhookSignature({
      signature,
      timestamp,
      rawBody,
    });

    if (!isValid && process.env.NODE_ENV === 'production') {
      console.warn('❌ Invalid Cashfree webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const payload = req.body || {};
    const orderData = payload.data?.order;
    const paymentData = payload.data?.payment;
    const eventType = payload.type;

    const orderId = orderData?.order_id;
    if (!orderId) {
      return res.status(200).json({ success: true, message: 'Ignored: No order_id' });
    }

    let status = 'PENDING';
    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || paymentData?.payment_status === 'SUCCESS') {
      status = 'SUCCESS';
    } else if (eventType === 'PAYMENT_FAILED_WEBHOOK' || paymentData?.payment_status === 'FAILED') {
      status = 'FAILED';
    } else if (eventType === 'PAYMENT_USER_DROPPED_WEBHOOK' || paymentData?.payment_status === 'USER_DROPPED') {
      status = 'CANCELLED';
    }

    await savePaymentRecord(orderId, {
      status,
      payment_id: paymentData?.cf_payment_id ? String(paymentData.cf_payment_id) : undefined,
      payment_time: paymentData?.payment_time || new Date().toISOString(),
      amount: orderData?.order_amount || paymentData?.payment_amount,
    });

    if (status === 'SUCCESS') {
      const currentRec = await findPaymentRecord(orderId);
      const associatedLinkId = currentRec?.link_id || currentRec?.metadata?.link_id;
      if (associatedLinkId) {
        try {
          await savePaymentLinkRecord(associatedLinkId, {
            link_status: 'PAID',
            order_id: orderId,
            payment_id: paymentData?.cf_payment_id ? String(paymentData.cf_payment_id) : undefined,
          });
        } catch (_) {}
      }
    }

    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('handleCashfreeWebhook error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/support/my-contributions
 * Fetch past contributions for authenticated user
 */
export const getMyContributions = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.team_member_id;
    const userEmail = req.user?.email;

    if (!userId && !userEmail) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    let records = [];
    if (supabase) {
      try {
        let query = supabase
          .from('support_payments')
          .select(REQUIRED_CONTRIBUTION_COLUMNS)
          .order('created_at', { ascending: false });
        if (userId) {
          query = query.or(`user_id.eq.${userId},customer_email.eq.${userEmail}`);
        } else {
          query = query.eq('customer_email', userEmail);
        }
        const { data } = await query;
        if (Array.isArray(data)) records = data;
      } catch (e) {
        console.warn('Supabase fetch my-contributions fallback:', e.message);
      }
    }

    if (records.length === 0) {
      for (const record of memorySupportPayments.values()) {
        if ((userId && record.user_id === userId) || (userEmail && record.customer_email === userEmail)) {
          records.push(record);
        }
      }
    }

    const totalSupported = records
      .filter((r) => r.status === 'SUCCESS')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    return res.json({
      success: true,
      totalSupported,
      contributions: records,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/support/contributions
 * Admin-protected API to retrieve all payment records, statistics, and date-wise collections
 * Optimized for minimum Supabase egress using selective column projections and server-side TTL caching.
 */
export const getAdminContributions = async (req, res) => {
  try {
    const isRefresh = req.query.refresh === 'true';

    // 1. Check server-side memory cache (bypasses Supabase query if recent and not explicitly refreshed)
    if (!isRefresh && cachedContributionsData && (Date.now() - lastCacheTimestamp < CACHE_TTL_MS)) {
      return res.json(cachedContributionsData);
    }

    let records = [];

    // 2. Fetch from Supabase with selective columns only (never select '*')
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('support_payments')
          .select(REQUIRED_CONTRIBUTION_COLUMNS)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          records = data;
        }
      } catch (err) {
        console.warn('Supabase getAdminContributions fallback to memory:', err.message);
      }
    }

    // 3. Merge with memory records to guarantee no data is dropped
    const recordMap = new Map();
    for (const r of records) {
      if (r.order_id) recordMap.set(r.order_id, r);
    }
    for (const r of memorySupportPayments.values()) {
      if (r.order_id && !recordMap.has(r.order_id)) {
        recordMap.set(r.order_id, r);
      }
    }

    const allPayments = Array.from(recordMap.values()).map((item) => {
      const purpose =
        item.metadata?.purpose ||
        item.purpose ||
        (typeof item.metadata === 'string'
          ? (() => {
              try {
                return JSON.parse(item.metadata)?.purpose;
              } catch (_) {
                return 'HELP US BUILD';
              }
            })()
          : 'HELP US BUILD');

      // Normalize status
      let rawStatus = (item.status || 'PENDING').toUpperCase();
      if (rawStatus === 'PAID') rawStatus = 'SUCCESS';
      if (rawStatus === 'USER_DROPPED') rawStatus = 'CANCELLED';

      return {
        id: item.id || item.order_id,
        order_id: item.order_id,
        cf_order_id: item.cf_order_id || '',
        payment_id: item.payment_id || '',
        user_id: item.user_id || null,
        amount: Number(item.amount) || 0,
        currency: item.currency || 'INR',
        provider: item.provider || 'cashfree',
        status: rawStatus,
        customer_name: item.customer_name || 'Anonymous Supporter',
        customer_email: item.customer_email || '',
        customer_phone: item.customer_phone || '',
        purpose: purpose || 'HELP US BUILD',
        payment_method: item.payment_method || 'UPI / Cashfree',
        payment_time: item.payment_time || item.created_at || new Date().toISOString(),
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
      };
    });

    // Sort newest to oldest
    allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 4. Compute Summary Metrics
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let totalCollected = 0;
    let successfulCount = 0;
    let thisMonthCollected = 0;
    let thisMonthCount = 0;

    const statusCounts = {
      SUCCESS: 0,
      PENDING: 0,
      FAILED: 0,
      CANCELLED: 0,
    };

    const statusAmounts = {
      SUCCESS: 0,
      PENDING: 0,
      FAILED: 0,
      CANCELLED: 0,
    };

    // Grouping by Date for successful payments
    const dateGroupsMap = new Map();

    allPayments.forEach((p) => {
      const statusKey = p.status in statusCounts ? p.status : 'PENDING';
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
      statusAmounts[statusKey] = (statusAmounts[statusKey] || 0) + p.amount;

      const pDate = new Date(p.payment_time || p.created_at);

      if (p.status === 'SUCCESS') {
        totalCollected += p.amount;
        successfulCount += 1;

        if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
          thisMonthCollected += p.amount;
          thisMonthCount += 1;
        }

        // Date string key YYYY-MM-DD
        const dateKey = pDate.toISOString().split('T')[0];
        if (!dateGroupsMap.has(dateKey)) {
          dateGroupsMap.set(dateKey, {
            date: dateKey,
            rawDate: pDate,
            count: 0,
            amount: 0,
            payments: [],
          });
        }
        const grp = dateGroupsMap.get(dateKey);
        grp.count += 1;
        grp.amount += p.amount;
        grp.payments.push(p);
      }
    });

    const averageSupport = successfulCount > 0 ? Math.round(totalCollected / successfulCount) : 0;

    // Convert date groups to sorted array
    const collectionByDate = Array.from(dateGroupsMap.values())
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
      .map((g) => ({
        date: g.date,
        formattedDate: g.rawDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        count: g.count,
        amount: g.amount,
      }));

    const responsePayload = {
      success: true,
      summary: {
        totalCollected,
        successfulCount,
        thisMonthCollected,
        thisMonthCount,
        averageSupport,
        currentMonthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        statusCounts,
        statusAmounts,
      },
      collectionByDate,
      payments: allPayments,
      totalCount: allPayments.length,
      cachedAt: new Date().toISOString(),
    };

    // Store in server-side cache
    cachedContributionsData = responsePayload;
    lastCacheTimestamp = Date.now();

    return res.json(responsePayload);
  } catch (err) {
    console.error('getAdminContributions error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to load support contributions.',
    });
  }
};

function loadDiskPaymentLinks() {
  const map = new Map();
  try {
    if (fs.existsSync(PAYMENT_LINKS_STORE_PATH)) {
      const content = fs.readFileSync(PAYMENT_LINKS_STORE_PATH, 'utf-8');
      if (content) {
        const arr = JSON.parse(content);
        if (Array.isArray(arr)) {
          arr.forEach((item) => {
            if (item && item.link_id) {
              map.set(item.link_id, item);
            }
          });
        }
      }
    }
  } catch (e) {
    console.warn('Error reading payment_links_store.json:', e.message);
  }
  return map;
}

function saveDiskPaymentLinks(linksMap) {
  try {
    const dir = path.dirname(PAYMENT_LINKS_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const arr = Array.from(linksMap.values());
    fs.writeFileSync(PAYMENT_LINKS_STORE_PATH, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing payment_links_store.json:', e.message);
  }
}

// Resilient in-memory payment links cache initialized from persistent disk store
const memoryPaymentLinks = loadDiskPaymentLinks();

// Server-side cache for Payment Links
let cachedPaymentLinksData = null;
let lastPaymentLinksCacheTimestamp = 0;
const PAYMENT_LINKS_CACHE_TTL_MS = 60 * 1000; // 60s TTL

/**
 * Save or update payment link in persistent disk store, memory, and Supabase support_payments
 */
async function savePaymentLinkRecord(linkId, linkData) {
  const existing = memoryPaymentLinks.get(linkId) || {};
  const merged = {
    ...existing,
    ...linkData,
    link_id: linkId,
    updated_at: new Date().toISOString(),
  };
  if (!merged.created_at) {
    merged.created_at = new Date().toISOString();
  }
  memoryPaymentLinks.set(linkId, merged);
  saveDiskPaymentLinks(memoryPaymentLinks);

  // Mirror into unified support_payments database table
  if (supabase) {
    try {
      const { data: found } = await supabase
        .from('support_payments')
        .select('id, status, payment_id')
        .eq('order_id', linkId)
        .maybeSingle();

      const payStatus = merged.link_status === 'PAID' ? 'SUCCESS' : (merged.link_status === 'CANCELLED' ? 'CANCELLED' : (found?.status || 'PENDING'));

      const dbPayload = {
        order_id: linkId,
        amount: Number(merged.link_amount || 0),
        currency: merged.link_currency || 'INR',
        provider: 'cashfree',
        status: payStatus,
        customer_name: merged.customer_name || 'Zenemoo Supporter',
        customer_email: merged.customer_email || 'support@zenemoo.in',
        customer_phone: merged.customer_phone || '9999999999',
        metadata: {
          purpose: merged.link_purpose || 'Support Zenemoo — Platform & Technology',
          source: 'Admin Payment Link',
          cf_link_id: merged.cf_link_id,
          link_url: merged.link_url,
          link_status: merged.link_status,
          link_expiry_time: merged.link_expiry_time,
          last_email_sent_at: merged.last_email_sent_at,
          last_email_sent_to: merged.last_email_sent_to,
        },
        updated_at: new Date().toISOString(),
      };

      if (found?.id) {
        await supabase
          .from('support_payments')
          .update(dbPayload)
          .eq('order_id', linkId);
      } else {
        dbPayload.created_at = merged.created_at;
        await supabase
          .from('support_payments')
          .insert([dbPayload]);
      }
    } catch (err) {
      console.warn('Supabase support_payments mirror note:', err.message);
    }
  }

  // Invalidate server cache
  cachedPaymentLinksData = null;
  lastPaymentLinksCacheTimestamp = 0;
  invalidateContributionsCache();

  return merged;
}

/**
 * Find payment link by linkId
 */
async function findPaymentLinkRecord(linkId) {
  if (memoryPaymentLinks.has(linkId)) {
    return memoryPaymentLinks.get(linkId);
  }

  const diskStore = loadDiskPaymentLinks();
  if (diskStore.has(linkId)) {
    const rec = diskStore.get(linkId);
    memoryPaymentLinks.set(linkId, rec);
    return rec;
  }

  if (supabase) {
    try {
      const { data } = await supabase
        .from('support_payments')
        .select('*')
        .eq('order_id', linkId)
        .maybeSingle();

      if (data) {
        let meta = data.metadata;
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta); } catch (_) {}
        }
        const linkRec = {
          link_id: data.order_id,
          cf_link_id: meta?.cf_link_id || '',
          link_url: meta?.link_url || `https://www.zenemoo.in/pay/${data.order_id}`,
          link_amount: Number(data.amount || 0),
          link_currency: data.currency || 'INR',
          link_purpose: meta?.purpose || 'Support Zenemoo — Platform & Technology',
          customer_phone: data.customer_phone || '',
          customer_email: data.customer_email || '',
          customer_name: data.customer_name || 'Zenemoo Supporter',
          link_status: data.status === 'SUCCESS' ? 'PAID' : (data.status === 'CANCELLED' ? 'CANCELLED' : (meta?.link_status || 'ACTIVE')),
          link_expiry_time: meta?.link_expiry_time || null,
          created_by: meta?.created_by || 'admin@zenemoo.in',
          source: meta?.source || 'Admin Payment Link',
          payment_id: data.payment_id || null,
          order_id: data.order_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        memoryPaymentLinks.set(linkId, linkRec);
        saveDiskPaymentLinks(memoryPaymentLinks);
        return linkRec;
      }
    } catch (err) {
      console.warn('Supabase findPaymentLinkRecord fallback:', err.message);
    }
  }

  return null;
}

/**
 * POST /api/support/payment-links
 * Admin endpoint: Create a Cashfree Payment Link
 */
export const createAdminPaymentLink = async (req, res) => {
  try {
    const { amount, purpose, customer_phone, customer_email, customer_name, expiry_days, return_url, send_sms, send_email } = req.body;

    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount < 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid amount of at least ₹10 is required.',
      });
    }

    if (numericAmount > 500000) {
      return res.status(400).json({
        success: false,
        message: 'Amount cannot exceed ₹5,00,000.',
      });
    }

    const cleanPurpose = cleanStr(purpose || 'Support Zenemoo — Platform & Technology', 500);
    const cleanPhone = cleanStr(customer_phone || '', 15).replace(/[^0-9]/g, '');
    const cleanEmail = cleanStr(customer_email || '', 120);
    const cleanName = cleanStr(customer_name || 'Zenemoo Supporter', 80);

    // Generate unique link ID: PL_ZNM_<timestamp>_<rand>
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const linkId = `PL_ZNM_${timestamp}_${rand}`;

    // Compute expiry time if specified (default 30 days)
    let expiryTime = null;
    if (expiry_days && Number(expiry_days) > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + Number(expiry_days));
      expiryTime = expDate.toISOString();
    }

    const cfLink = await cashfreeService.createPaymentLink({
      linkId,
      amount: numericAmount,
      currency: 'INR',
      purpose: cleanPurpose,
      customer: {
        customerPhone: cleanPhone || '9999999999',
        customerEmail: cleanEmail || 'support@zenemoo.in',
        customerName: cleanName,
      },
      expiryTime,
      returnUrl: return_url,
      notify: {
        sendSms: Boolean(send_sms && cleanPhone),
        sendEmail: Boolean(send_email && cleanEmail),
      },
    });

    const linkRecord = {
      link_id: linkId,
      cf_link_id: String(cfLink.cfLinkId || ''),
      link_url: cfLink.linkUrl,
      link_amount: numericAmount,
      link_currency: 'INR',
      link_purpose: cleanPurpose,
      customer_phone: cleanPhone,
      customer_email: cleanEmail,
      customer_name: cleanName,
      link_status: cfLink.linkStatus || 'ACTIVE',
      link_expiry_time: expiryTime || cfLink.linkExpiryTime || null,
      created_by: req.user?.email || 'admin@zenemoo.in',
      source: 'Admin Payment Link',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await savePaymentLinkRecord(linkId, linkRecord);

    let emailSent = false;
    let emailRecipient = null;
    let emailError = null;

    if (send_email && cleanEmail && cleanEmail.includes('@')) {
      try {
        const emailResult = await sendBrandedPaymentLinkEmail(linkRecord, cleanEmail, cleanName);
        emailSent = true;
        emailRecipient = emailResult.targetEmail;
        if (emailResult.updated) {
          Object.assign(linkRecord, emailResult.updated);
        }
      } catch (eErr) {
        console.warn('Auto-dispatch payment link email error:', eErr.message);
        emailError = eErr.message;
      }
    }

    return res.status(201).json({
      success: true,
      link: linkRecord,
      email_sent: emailSent,
      email_recipient: emailRecipient,
      email_error: emailError,
      message: emailSent
        ? `Payment link created and email dispatched to ${emailRecipient}.`
        : 'Payment link created successfully.',
    });
  } catch (err) {
    console.error('createAdminPaymentLink error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to create payment link.',
    });
  }
};

/**
 * GET /api/support/payment-links
 * Admin endpoint: List all payment links with status aggregation
 * Optimized for minimum Supabase egress with server-side TTL cache and column projection
 */
export const getAdminPaymentLinks = async (req, res) => {
  try {
    const isRefresh = req.query.refresh === 'true';

    // 1. Check server-side memory cache
    if (!isRefresh && cachedPaymentLinksData && (Date.now() - lastPaymentLinksCacheTimestamp < PAYMENT_LINKS_CACHE_TTL_MS)) {
      return res.json(cachedPaymentLinksData);
    }

    const recordMap = new Map();

    // Load from disk store first
    const diskStore = loadDiskPaymentLinks();
    for (const [k, v] of diskStore.entries()) {
      recordMap.set(k, v);
      memoryPaymentLinks.set(k, v);
    }

    // Load from memory
    for (const [k, v] of memoryPaymentLinks.entries()) {
      recordMap.set(k, v);
    }

    // Query support_payments from Supabase (the single unified database)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('support_payments')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          for (const item of data) {
            let meta = item.metadata;
            if (typeof meta === 'string') {
              try { meta = JSON.parse(meta); } catch (_) {}
            }

            const isLink = item.order_id?.startsWith('PL_') || meta?.source === 'Admin Payment Link';
            if (isLink) {
              const existing = recordMap.get(item.order_id) || {};
              const linkStatus = item.status === 'SUCCESS' ? 'PAID' : (item.status === 'CANCELLED' ? 'CANCELLED' : (existing.link_status || meta?.link_status || 'ACTIVE'));
              const linkRec = {
                ...existing,
                link_id: item.order_id,
                cf_link_id: existing.cf_link_id || meta?.cf_link_id || '',
                link_url: existing.link_url || meta?.link_url || `https://www.zenemoo.in/pay/${item.order_id}`,
                link_amount: Number(item.amount || existing.link_amount || 0),
                link_currency: item.currency || 'INR',
                link_purpose: meta?.purpose || existing.link_purpose || 'Support Zenemoo — Platform & Technology',
                customer_phone: item.customer_phone || existing.customer_phone || '',
                customer_email: item.customer_email || existing.customer_email || '',
                customer_name: item.customer_name || existing.customer_name || 'Zenemoo Supporter',
                link_status: linkStatus,
                link_expiry_time: meta?.link_expiry_time || existing.link_expiry_time || null,
                created_by: meta?.created_by || existing.created_by || 'admin@zenemoo.in',
                source: 'Admin Payment Link',
                order_id: item.order_id,
                payment_id: item.payment_id || existing.payment_id || null,
                created_at: item.created_at || existing.created_at || new Date().toISOString(),
                updated_at: item.updated_at || existing.updated_at || new Date().toISOString(),
              };
              recordMap.set(item.order_id, linkRec);
              memoryPaymentLinks.set(item.order_id, linkRec);
            }
          }
        }
      } catch (err) {
        console.warn('Supabase getAdminPaymentLinks fallback:', err.message);
      }
    }

    saveDiskPaymentLinks(memoryPaymentLinks);

    const allLinks = Array.from(recordMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Aggregate link metrics
    let totalLinkAmount = 0;
    let paidAmount = 0;
    const statusCounts = {
      ACTIVE: 0,
      PAID: 0,
      EXPIRED: 0,
      CANCELLED: 0,
    };

    allLinks.forEach((l) => {
      totalLinkAmount += Number(l.link_amount || 0);
      const st = (l.link_status || 'ACTIVE').toUpperCase();
      if (st === 'PAID') {
        paidAmount += Number(l.link_amount || 0);
        statusCounts.PAID = (statusCounts.PAID || 0) + 1;
      } else if (st === 'CANCELLED' || st === 'TERMINATED') {
        statusCounts.CANCELLED = (statusCounts.CANCELLED || 0) + 1;
      } else if (st === 'EXPIRED') {
        statusCounts.EXPIRED = (statusCounts.EXPIRED || 0) + 1;
      } else {
        statusCounts.ACTIVE = (statusCounts.ACTIVE || 0) + 1;
      }
    });

    const responsePayload = {
      success: true,
      links: allLinks,
      summary: {
        totalLinks: allLinks.length,
        totalLinkAmount,
        paidAmount,
        statusCounts,
      },
      cachedAt: new Date().toISOString(),
    };

    cachedPaymentLinksData = responsePayload;
    lastPaymentLinksCacheTimestamp = Date.now();

    return res.json(responsePayload);
  } catch (err) {
    console.error('getAdminPaymentLinks error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve payment links.',
    });
  }
};

/**
 * POST /api/support/payment-links/:linkId/cancel
 * Admin endpoint: Cancel / Disable an active payment link
 */
export const cancelAdminPaymentLink = async (req, res) => {
  try {
    const { linkId } = req.params;
    if (!linkId) {
      return res.status(400).json({ success: false, message: 'Link ID is required.' });
    }

    try {
      await cashfreeService.cancelPaymentLink(linkId);
    } catch (cfErr) {
      console.warn(`Cashfree cancel link warning (${linkId}):`, cfErr.message);
    }

    await savePaymentLinkRecord(linkId, {
      link_status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Payment link ${linkId} cancelled successfully.`,
    });
  } catch (err) {
    console.error('cancelAdminPaymentLink error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Reusable helper to send branded payment link email via Brevo
 */
export async function sendBrandedPaymentLinkEmail(link, recipientEmail = null, recipientName = null) {
  const targetEmail = (recipientEmail || link.customer_email || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    throw new Error('A valid recipient email address is required.');
  }

  const customerName = (recipientName || link.customer_name || '').trim();
  const amount = Number(link.link_amount || 0);
  const purpose = link.link_purpose || 'Support Zenemoo — Platform & Technology';
  const payUrl = `https://www.zenemoo.in/pay/${encodeURIComponent(link.link_id)}`;

  // Determine link category wording
  const isSupport = purpose.toLowerCase().includes('support') || (link.source && link.source.toLowerCase().includes('support'));
  const greeting = customerName ? `Dear <strong>${customerName}</strong>,` : 'Hello,';
  const requestIntro = `You have a payment request from <strong>Zenemoo</strong>. Please find the details below and use the secure payment link to complete your payment.`;

  const formattedExpiry = link.link_expiry_time
    ? new Date(link.link_expiry_time).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '30 Days Validity';

  const subject = `Payment Request from Zenemoo — ₹${amount.toLocaleString('en-IN')}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
        <!-- Top Header Banner -->
        <tr>
          <td style="background-color: #030712; padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="52" valign="middle">
                  <img src="https://www.zenemoo.in/assets/logo.png" alt="Zenemoo" width="44" height="44" style="display: block; border-radius: 12px; background-color: #ffffff; padding: 3px;" />
                </td>
                <td valign="middle" style="padding-left: 12px;">
                  <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; line-height: 1.2;">ZENEMOO</div>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">People &bull; Opportunities &bull; Impact</div>
                </td>
                <td align="right" valign="middle">
                  <div style="font-size: 11px; color: #38bdf8; font-family: monospace; letter-spacing: 0.5px;">Building A Brighter Tomorrow<br><span style="color: #94a3b8;">Together</span></div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Content Body -->
        <tr>
          <td style="padding: 32px 28px; background-color: #ffffff; color: #0f172a;">
            <h1 style="margin: 0 0 4px 0; font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1.2;">Payment Request</h1>
            <div style="font-size: 14px; font-weight: 600; color: #0284c7; margin-bottom: 20px;">from Zenemoo</div>

            <p style="margin: 0 0 14px 0; font-size: 14px; color: #334155; line-height: 1.6;">${greeting}</p>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #334155; line-height: 1.6;">${requestIntro}</p>

            <!-- Payment Details Card Box -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px; overflow: hidden;">
              <tr>
                <td style="padding: 16px 18px; border-bottom: 1px solid #f1f5f9;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="120" style="font-size: 13px; color: #64748b; font-weight: 500;">📄 Payment For</td>
                      <td style="font-size: 13px; font-weight: 700; color: #0f172a; text-align: right;">${purpose}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 18px; border-bottom: 1px solid #f1f5f9;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="120" style="font-size: 13px; color: #64748b; font-weight: 500;">₹ Amount</td>
                      <td style="font-size: 18px; font-weight: 800; color: #0f172a; text-align: right;">₹${amount.toLocaleString('en-IN')} <span style="font-size: 11px; color: #64748b; font-weight: 600;">INR</span></td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 18px; border-bottom: 1px solid #f1f5f9;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="120" style="font-size: 13px; color: #64748b; font-weight: 500;">📅 Valid Until</td>
                      <td style="font-size: 13px; font-weight: 700; color: #0f172a; text-align: right;">${formattedExpiry}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 18px; background-color: #f0f9ff;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="120" style="font-size: 13px; color: #0284c7; font-weight: 600;">🔗 Payment Link</td>
                      <td align="right">
                        <a href="${payUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 10px 22px; border-radius: 10px; box-shadow: 0 4px 12px rgba(2,132,199,0.3);">Pay Now Securely &rarr;</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Security Notice -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;">
              <tr>
                <td width="24" valign="top" style="font-size: 16px;">🔒</td>
                <td style="padding-left: 8px; font-size: 12px; color: #166534; line-height: 1.5;">
                  <strong>This is a secure payment link powered by Cashfree.</strong><br>
                  You can pay using UPI, Cards, NetBanking or Wallets.
                </td>
              </tr>
            </table>

            <!-- Help Note -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; margin-bottom: 24px;">
              <tr>
                <td width="24" valign="top" style="font-size: 16px;">ℹ️</td>
                <td style="padding-left: 8px; font-size: 12px; color: #475569; line-height: 1.5;">
                  If you have any questions or need assistance, feel free to contact us at <a href="mailto:support@zenemoo.in" style="color: #0284c7; text-decoration: none;">support@zenemoo.in</a>.
                </td>
              </tr>
            </table>

            <!-- Sign-off -->
            <div style="font-size: 13px; color: #475569; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 18px;">
              Thank you,<br>
              <strong style="color: #0f172a;">Team Zenemoo</strong><br>
              <span style="color: #64748b; font-size: 12px;">Zenemoo AI Data Solutions</span>
            </div>
          </td>
        </tr>

        <!-- Footer Area -->
        <tr>
          <td style="background-color: #030712; padding: 22px 28px; text-align: center; color: #64748b; font-size: 11px; line-height: 1.6;">
            <div style="margin-bottom: 10px;">
              <a href="https://www.zenemoo.in" style="color: #38bdf8; text-decoration: none; margin: 0 8px;">Website</a> &bull;
              <a href="https://www.zenemoo.in/support-zenemooindia" style="color: #38bdf8; text-decoration: none; margin: 0 8px;">Support</a> &bull;
              <a href="https://www.zenemoo.in/privacy" style="color: #38bdf8; text-decoration: none; margin: 0 8px;">Privacy Policy</a> &bull;
              <a href="https://www.zenemoo.in/terms" style="color: #38bdf8; text-decoration: none; margin: 0 8px;">Terms of Service</a>
            </div>
            <div style="color: #94a3b8; font-weight: 500; margin-bottom: 4px;">Building a brighter tomorrow, together.</div>
            <div>&copy; ${new Date().getFullYear()} Zenemoo AI Data Solutions. All rights reserved.</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const sendResult = await sendMailViaBrevo({
    sender: 'support@zenemoo.in',
    recipients: targetEmail,
    subject,
    html,
  });

  if (sendResult?.success === false) {
    throw new Error(sendResult?.error || 'Brevo dispatch failed');
  }

  const updated = await savePaymentLinkRecord(link.link_id, {
    last_email_sent_at: new Date().toISOString(),
    last_email_sent_to: targetEmail,
    email_send_status: 'SENT',
  });

  return { targetEmail, updated };
}

/**
 * POST /api/support/payment-links/:linkId/send-email
 * Admin endpoint: Send branded payment link email to customer via Brevo
 */
export const sendAdminPaymentLinkEmail = async (req, res) => {
  try {
    const { linkId } = req.params;
    const { recipient_email, recipient_name } = req.body || {};

    if (!linkId) {
      return res.status(400).json({ success: false, message: 'Link ID is required.' });
    }

    const link = await findPaymentLinkRecord(linkId);
    if (!link) {
      return res.status(404).json({ success: false, message: 'Payment link not found.' });
    }

    const { targetEmail, updated } = await sendBrandedPaymentLinkEmail(link, recipient_email, recipient_name);

    return res.json({
      success: true,
      message: 'Payment link sent successfully via Brevo.',
      recipient: targetEmail,
      link: updated,
    });
  } catch (err) {
    console.error('sendAdminPaymentLinkEmail error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to dispatch email via Brevo.',
    });
  }
};

/**
 * GET /api/support/public-link/:linkId
 * Public endpoint: Retrieve verified payment link details by ID without exposing PII in URLs
 */
export const getPublicPaymentLink = async (req, res) => {
  try {
    const { linkId } = req.params;
    if (!linkId) {
      return res.status(400).json({
        success: false,
        message: 'Payment link ID is required.',
      });
    }

    const link = await findPaymentLinkRecord(linkId);
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'This payment link does not exist or may have been deleted.',
      });
    }

    // Check expiry
    if (link.link_expiry_time && new Date(link.link_expiry_time).getTime() < Date.now()) {
      if (link.link_status === 'ACTIVE') {
        link.link_status = 'EXPIRED';
        await savePaymentLinkRecord(linkId, { link_status: 'EXPIRED' });
      }
      return res.status(410).json({
        success: false,
        status: 'EXPIRED',
        message: 'This payment link has expired. Please request a new payment link.',
      });
    }

    // Check status
    if (link.link_status === 'PAID') {
      return res.status(400).json({
        success: false,
        status: 'PAID',
        message: 'This payment link has already been completed.',
        orderId: link.order_id || undefined,
        paymentId: link.payment_id || undefined,
      });
    }

    if (link.link_status === 'CANCELLED' || link.link_status === 'TERMINATED') {
      return res.status(400).json({
        success: false,
        status: 'CANCELLED',
        message: 'This payment link has been cancelled or disabled.',
      });
    }

    // Sanitize response to exclude server secrets and internal metadata
    return res.json({
      success: true,
      link: {
        link_id: link.link_id,
        amount: Number(link.link_amount || 0),
        currency: link.link_currency || 'INR',
        purpose: link.link_purpose || 'Support Zenemoo — Platform & Technology',
        customer_name: link.customer_name || '',
        customer_email: link.customer_email || '',
        customer_phone: link.customer_phone || '',
        link_status: link.link_status || 'ACTIVE',
        link_expiry_time: link.link_expiry_time || null,
        source: link.source || 'Admin Payment Link',
        gateway_mode: link.cf_link_id?.startsWith('ZNM_PG_') ? 'ZENEMOO_FALLBACK' : 'CASHFREE',
      },
    });
  } catch (err) {
    console.error('getPublicPaymentLink error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment link details.',
    });
  }
};

/**
 * Deterministic receipt number generator matching frontend specification
 */
export function generateDeterministicReceiptNo(orderId, paymentDate) {
  const d = paymentDate ? (typeof paymentDate === 'string' ? new Date(paymentDate) : paymentDate) : new Date();
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');

  // Extract trailing 4 alphanumeric chars from order ID
  const cleanId = (orderId || '0000').replace(/[^a-zA-Z0-9]/g, '');
  const suffix = (cleanId.slice(-4) || '0001').toUpperCase();

  return `RCPT-ZNM-${yyyy}${mm}${dd}-${suffix}`;
}

/**
 * Dispatch thank you receipt email via Brevo with 100% mobile-responsive layout
 */
async function sendPaymentSuccessEmail({ orderId, paymentId, amount, customerName, customerEmail, paymentTime, purpose }) {
  if (!customerEmail || !customerEmail.includes('@')) return;

  const formattedDate = new Date(paymentTime || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const receiptNo = generateDeterministicReceiptNo(orderId, paymentTime);
  const receiptVerifyUrl = `https://www.zenemoo.in/receipt/verify/${receiptNo}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt - Zenemoo</title>
      <style>
        body { margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .email-wrapper { width: 100%; max-width: 580px; margin: 0 auto; background-color: #080e1a; border-radius: 16px; border: 1px solid rgba(56, 189, 248, 0.25); overflow: hidden; }
        .data-table td { padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .data-label { color: #94a3b8; font-size: 13px; width: 38%; vertical-align: top; }
        .data-value { color: #f8fafc; font-size: 13px; text-align: right; width: 62%; font-weight: 500; word-break: break-all; overflow-wrap: anywhere; }
      </style>
    </head>
    <body style="background-color: #030712; padding: 20px 10px;">
      <div class="email-wrapper" style="max-width: 580px; margin: 0 auto; background-color: #080e1a; border-radius: 16px; border: 1px solid rgba(56, 189, 248, 0.25); overflow: hidden;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(180deg, rgba(6, 182, 212, 0.12) 0%, rgba(8, 14, 26, 0) 100%); padding: 32px 24px 20px; text-align: center;">
          <div style="display: inline-block; margin-bottom: 14px;">
            <img src="https://www.zenemoo.in/logo.png" alt="Zenemoo" width="130" style="max-width: 130px; height: auto; display: block; margin: 0 auto;" />
          </div>
          <div style="font-size: 32px; margin-bottom: 6px;">❤️</div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.3px;">Thank You for Supporting Zenemoo</h1>
          <p style="color: #38bdf8; font-size: 13.5px; margin: 0; font-weight: 500;">Your contribution has been successfully received.</p>
        </div>

        <!-- Receipt Details Box -->
        <div style="padding: 0 20px 24px 20px;">
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 18px 20px; box-sizing: border-box;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; margin-bottom: 8px;">
              <h3 style="color: #e2e8f0; font-size: 15px; margin: 0; font-weight: 600;">Support Receipt Details</h3>
              <span style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">Verified ✓</span>
            </div>

            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; word-break: break-all;">
              <tr>
                <td class="data-label" style="padding: 9px 0; color: #94a3b8; width: 38%; vertical-align: top; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Supporter:</td>
                <td class="data-value" style="padding: 9px 0; font-weight: 700; text-align: right; color: #ffffff; width: 62%; word-break: break-word; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${customerName}</td>
              </tr>
              <tr>
                <td class="data-label" style="padding: 9px 0; color: #94a3b8; width: 38%; vertical-align: middle; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Amount Received:</td>
                <td class="data-value" style="padding: 9px 0; font-weight: 800; text-align: right; color: #38bdf8; font-size: 18px; width: 62%; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">₹${Number(amount).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td class="data-label" style="padding: 9px 0; color: #94a3b8; width: 38%; vertical-align: middle; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Status:</td>
                <td class="data-value" style="padding: 9px 0; font-weight: 700; text-align: right; color: #34d399; width: 62%; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Successful ✓</td>
              </tr>
              <tr>
                <td class="data-label" style="padding: 9px 0; color: #94a3b8; width: 38%; vertical-align: top; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Receipt No:</td>
                <td class="data-value" style="padding: 9px 0; font-family: monospace; font-size: 12px; text-align: right; color: #a5f3fc; width: 62%; word-break: break-all; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${receiptNo}</td>
              </tr>
              <tr>
                <td class="data-label" style="padding: 9px 0; color: #94a3b8; width: 38%; vertical-align: top; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Order ID:</td>
                <td class="data-value" style="padding: 9px 0; font-family: monospace; font-size: 11.5px; text-align: right; color: #e2e8f0; width: 62%; word-break: break-all; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${orderId}</td>
              </tr>
              ${paymentId ? `
              <tr>
                <td class="data-label" style="padding: 9px 0; color: #94a3b8; width: 38%; vertical-align: top; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Payment Ref:</td>
                <td class="data-value" style="padding: 9px 0; font-family: monospace; font-size: 11.5px; text-align: right; color: #e2e8f0; width: 62%; word-break: break-all; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${paymentId}</td>
              </tr>
              ` : ''}
              <tr>
                <td class="data-label" style="padding: 9px 0; color: #94a3b8; width: 38%; vertical-align: top; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">Purpose:</td>
                <td class="data-value" style="padding: 9px 0; text-align: right; color: #38bdf8; width: 62%; word-break: break-word; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${purpose || 'Support Zenemoo — Platform & Technology'}</td>
              </tr>
              <tr>
                <td class="data-label" style="padding: 9px 0; color: #94a3b8; width: 38%; vertical-align: top;">Date:</td>
                <td class="data-value" style="padding: 9px 0; text-align: right; color: #cbd5e1; width: 62%;">${formattedDate}</td>
              </tr>
            </table>

            <!-- Prominent Action Button: Download Official Receipt -->
            <div style="margin-top: 20px; text-align: center;">
              <a href="${receiptVerifyUrl}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; text-align: center; font-size: 14.5px; padding: 13px 18px; border-radius: 9px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35);">
                📄 Download Official Receipt (PDF) &rarr;
              </a>
            </div>
            <p style="text-align: center; font-size: 11px; color: #64748b; margin: 10px 0 0 0; word-break: break-all;">
              Or verify online at: <a href="${receiptVerifyUrl}" style="color: #38bdf8; text-decoration: underline;">${receiptVerifyUrl}</a>
            </p>

          </div>

          <!-- Transparency Notice -->
          <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 10px; padding: 14px 16px; margin-top: 18px; font-size: 12px; color: #94a3b8; line-height: 1.55;">
            <p style="margin: 0;"><strong style="color: #38bdf8;">Transparency Note:</strong> Support received helps Zenemoo build speech technology, contributor resources, and meaningful work opportunities across India. Zenemoo Data Solutions is a recognized enterprise business (UDYAM-OD-11-0124893).</p>
          </div>

          <!-- Footer Area -->
          <div style="text-align: center; font-size: 11.5px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 18px; margin-top: 20px; line-height: 1.6;">
            <p style="margin: 0 0 4px 0; font-weight: 600; color: #94a3b8;">People &bull; Opportunities &bull; A Brighter Tomorrow</p>
            <p style="margin: 0 0 4px 0;">Zenemoo Data Solutions &bull; UDYAM-OD-11-0124893</p>
            <p style="margin: 0;"><a href="https://www.zenemoo.in" style="color: #38bdf8; text-decoration: none;">www.zenemoo.in</a> &bull; <a href="mailto:support@zenemoo.in" style="color: #38bdf8; text-decoration: none;">support@zenemoo.in</a></p>
          </div>

        </div>

      </div>
    </body>
    </html>
  `;

  await sendMailViaBrevo({
    sender: 'support@zenemoo.in',
    recipients: customerEmail,
    subject: `Thank you for supporting Zenemoo (Receipt #${receiptNo})`,
    html,
  });
}

/**
 * GET /api/support/receipt/verify/:receiptNo
 * Public endpoint: Look up verified payment receipt by Receipt No or Order ID
 */
export const getReceiptVerificationData = async (req, res) => {
  try {
    const rawReceiptParam = req.params.receiptNo || req.query.receiptNo || '';
    if (!rawReceiptParam) {
      return res.status(400).json({ success: false, message: 'Receipt number or Order ID is required.' });
    }

    const cleanParam = decodeURIComponent(rawReceiptParam).trim();
    // Normalize OCR / QR variations (e.g. 7NM vs ZNM)
    const normalizedParam = cleanParam.replace(/^RCPT-7NM-/i, 'RCPT-ZNM-');

    // 1. Check direct match by orderId
    let record = await findPaymentRecord(cleanParam);
    if (!record && normalizedParam !== cleanParam) {
      record = await findPaymentRecord(normalizedParam);
    }

    // 2. Check payment links store
    if (!record) {
      const link = await findPaymentLinkRecord(cleanParam);
      if (link) {
        record = {
          order_id: link.order_id || link.link_id,
          payment_id: link.payment_id || null,
          amount: Number(link.link_amount || 0),
          currency: link.link_currency || 'INR',
          customer_name: link.customer_name || 'Zenemoo Supporter',
          customer_email: link.customer_email || '',
          customer_phone: link.customer_phone || '',
          purpose: link.link_purpose || 'Support Zenemoo — Platform & Technology',
          status: link.link_status === 'PAID' ? 'SUCCESS' : (link.link_status || 'SUCCESS'),
          payment_time: link.payment_time || link.created_at,
          created_at: link.created_at,
        };
      }
    }

    // 3. If still not found and param is a receipt number like RCPT-ZNM-YYYYMMDD-XXXX
    if (!record && (normalizedParam.toUpperCase().startsWith('RCPT-') || cleanParam.toUpperCase().startsWith('RCPT-'))) {
      const parts = normalizedParam.split('-');
      const suffix = parts[parts.length - 1]?.trim().toUpperCase();

      // Check Supabase support_payments
      if (supabase) {
        try {
          const { data: matchedRows } = await supabase
            .from('support_payments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

          if (matchedRows && matchedRows.length > 0) {
            const found = matchedRows.find((r) => {
              const rNo = generateDeterministicReceiptNo(r.order_id, r.payment_time || r.created_at);
              if (rNo.toUpperCase() === normalizedParam.toUpperCase() || rNo.toUpperCase() === cleanParam.toUpperCase()) return true;
              if (suffix && (r.order_id || '').toUpperCase().endsWith(suffix)) return true;
              return false;
            });
            if (found) record = found;
          }
        } catch (dbErr) {
          console.warn('Receipt lookup Supabase fallback:', dbErr.message);
        }
      }

      // Check memory store
      if (!record) {
        for (const [key, val] of memorySupportPayments.entries()) {
          const rNo = generateDeterministicReceiptNo(val.order_id || key, val.payment_time || val.created_at);
          if (
            rNo.toUpperCase() === normalizedParam.toUpperCase() ||
            rNo.toUpperCase() === cleanParam.toUpperCase() ||
            (suffix && (val.order_id || key).toUpperCase().endsWith(suffix))
          ) {
            record = val;
            break;
          }
        }
      }

      if (!record) {
        for (const [key, val] of memoryPaymentLinks.entries()) {
          const rNo = generateDeterministicReceiptNo(val.order_id || val.link_id || key, val.payment_time || val.created_at);
          if (
            rNo.toUpperCase() === normalizedParam.toUpperCase() ||
            rNo.toUpperCase() === cleanParam.toUpperCase() ||
            (suffix && ((val.order_id || '').toUpperCase().endsWith(suffix) || (val.link_id || key).toUpperCase().endsWith(suffix)))
          ) {
            record = {
              order_id: val.order_id || val.link_id,
              payment_id: val.payment_id || null,
              amount: Number(val.link_amount || 0),
              currency: val.link_currency || 'INR',
              customer_name: val.customer_name || 'Zenemoo Supporter',
              customer_email: val.customer_email || '',
              customer_phone: val.customer_phone || '',
              purpose: val.link_purpose || 'Support Zenemoo — Platform & Technology',
              status: val.link_status === 'PAID' ? 'SUCCESS' : (val.link_status || 'SUCCESS'),
              payment_time: val.payment_time || val.created_at,
              created_at: val.created_at,
            };
            break;
          }
        }
      }

      // Check payment_links_store.json file
      if (!record) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const filePath = path.resolve('src/database/payment_links_store.json');
          if (fs.existsSync(filePath)) {
            const links = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const foundLink = links.find((l) => {
              const rNo = generateDeterministicReceiptNo(l.order_id || l.link_id, l.payment_time || l.created_at);
              if (rNo.toUpperCase() === normalizedParam.toUpperCase() || rNo.toUpperCase() === cleanParam.toUpperCase()) return true;
              if (suffix && ((l.order_id || '').toUpperCase().endsWith(suffix) || (l.link_id || '').toUpperCase().endsWith(suffix))) return true;
              return false;
            });
            if (foundLink) {
              record = {
                order_id: foundLink.order_id || foundLink.link_id,
                payment_id: foundLink.payment_id || null,
                amount: Number(foundLink.link_amount || 0),
                currency: foundLink.link_currency || 'INR',
                customer_name: foundLink.customer_name || 'Zenemoo Supporter',
                customer_email: foundLink.customer_email || '',
                customer_phone: foundLink.customer_phone || '',
                purpose: foundLink.link_purpose || 'Support Zenemoo — Platform & Technology',
                status: foundLink.link_status === 'PAID' ? 'SUCCESS' : (foundLink.link_status || 'SUCCESS'),
                payment_time: foundLink.payment_time || foundLink.created_at,
                created_at: foundLink.created_at,
              };
            }
          }
        } catch (fsErr) {
          console.warn('payment_links_store read error:', fsErr.message);
        }
      }
    }

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'No verified payment record was found for this receipt number or order reference.',
      });
    }

    // Verify status with Cashfree if needed
    const cfConfig = cashfreeService.getConfig();
    if (cfConfig.isConfigured && record.order_id && (!record.status || record.status === 'PENDING')) {
      try {
        const cfOrder = await cashfreeService.getOrder(record.order_id);
        const cfPayments = await cashfreeService.getOrderPayments(record.order_id);
        if (cfOrder) {
          const successfulPayment = cfPayments.find((p) => p.payment_status === 'SUCCESS');
          if (cfOrder.order_status === 'PAID' || successfulPayment) {
            record.status = 'SUCCESS';
            record.payment_id = successfulPayment?.cf_payment_id ? String(successfulPayment.cf_payment_id) : record.payment_id;
            record.payment_time = successfulPayment?.payment_time || record.payment_time;
          }
        }
      } catch (_) {}
    }

    const calculatedReceiptNo = generateDeterministicReceiptNo(record.order_id, record.payment_time || record.created_at);

    return res.json({
      success: true,
      receipt: {
        receiptNo: calculatedReceiptNo,
        orderId: record.order_id,
        paymentId: record.payment_id || record.cf_payment_id || null,
        transactionId: record.payment_id || record.cf_payment_id || null,
        amount: Number(record.amount || 0),
        currency: record.currency || 'INR',
        customerName: record.customer_name || 'Zenemoo Supporter',
        customerEmail: record.customer_email || '',
        customerPhone: record.customer_phone || '',
        purpose: record.purpose || record.metadata?.purpose || 'Support Zenemoo — Platform & Technology',
        status: (record.status || 'SUCCESS').toUpperCase(),
        paymentMethod: record.payment_method || 'Online / UPI',
        paymentDate: record.payment_time || record.created_at || new Date().toISOString(),
        verified: true,
      },
    });
  } catch (err) {
    console.error('getReceiptVerificationData error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment receipt.',
    });
  }
};

