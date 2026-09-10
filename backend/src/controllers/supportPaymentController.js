import { cashfreeService } from '../services/cashfreeService.js';
import { supabase } from '../config/supabase.js';
import { supabaseService } from '../services/supabaseService.js';
import { sendMailViaBrevo } from '../services/emailService.js';

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
    const { amount, currency = 'INR', customer_name, customer_email, customer_phone, return_url, purpose } = req.body;

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
      metadata: { purpose: cleanPurpose },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await savePaymentRecord(orderId, initialRecord);

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

/**
 * Dispatch thank you receipt email via Brevo
 */
async function sendPaymentSuccessEmail({ orderId, paymentId, amount, customerName, customerEmail, paymentTime }) {
  if (!customerEmail || !customerEmail.includes('@')) return;

  const formattedDate = new Date(paymentTime || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #050811; color: #ffffff; padding: 30px 20px; border-radius: 16px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px;">❤️</span>
        <h1 style="color: #ffffff; font-size: 24px; margin: 8px 0;">Thank You for Supporting Zenemoo</h1>
        <p style="color: #38bdf8; font-size: 14px; margin: 0;">Your contribution helps us build technology, resources, and more opportunities.</p>
      </div>

      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #e2e8f0; font-size: 16px; margin-top: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 10px;">Support Receipt Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Supporter:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #ffffff;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Amount Received:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #38bdf8; font-size: 18px;">₹${Number(amount).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Status:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #34d399;">Successful ✓</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Order ID:</td>
            <td style="padding: 8px 0; font-family: monospace; text-align: right; color: #ffffff;">${orderId}</td>
          </tr>
          ${paymentId ? `
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Payment Reference:</td>
            <td style="padding: 8px 0; font-family: monospace; text-align: right; color: #ffffff;">${paymentId}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #94a3b8;">Date:</td>
            <td style="padding: 8px 0; text-align: right; color: #cbd5e1;">${formattedDate}</td>
          </tr>
        </table>
      </div>

      <div style="background: rgba(6, 182, 212, 0.1); border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
        <p style="margin: 0;"><strong>Transparency Note:</strong> Support received through this initiative is intended to help Zenemoo develop and operate its technology platform, programs, infrastructure, contributor resources, and related growth initiatives. Zenemoo is a data-solutions and technology business.</p>
      </div>

      <div style="text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px;">
        <p style="margin: 0 0 4px 0;">Zenemoo Data Solutions &bull; UDYAM-OD-11-0124893</p>
        <p style="margin: 0;"><a href="https://www.zenemoo.in" style="color: #38bdf8; text-decoration: none;">www.zenemoo.in</a> &bull; <a href="mailto:info@zenemoo.in" style="color: #38bdf8; text-decoration: none;">info@zenemoo.in</a></p>
      </div>
    </div>
  `;

  await sendMailViaBrevo({
    sender: 'support@zenemoo.in',
    recipients: customerEmail,
    subject: `Support Received: Thank You for Supporting Zenemoo (Order #${orderId})`,
    html,
  });
}

