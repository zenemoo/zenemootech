import axios from 'axios';
import crypto from 'crypto';

/**
 * Cashfree Payments Service (PG API 2023-08-01)
 * Handles secure order creation, verification, and webhook signature validation.
 */
class CashfreeService {
  constructor() {
    this.apiVersion = '2023-08-01';
  }

  getConfig() {
    const clientId = (process.env.CASHFREE_CLIENT_ID || '').trim();
    const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || '').trim();
    const env = (process.env.CASHFREE_ENV || 'sandbox').toLowerCase().trim();

    const baseUrl = env === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    return {
      clientId,
      clientSecret,
      env,
      baseUrl,
      isConfigured: Boolean(clientId && clientSecret),
    };
  }

  getHeaders() {
    const { clientId, clientSecret, isConfigured } = this.getConfig();
    if (!isConfigured) {
      throw new Error('Cashfree credentials missing. Please set CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in backend/.env');
    }

    return {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
      'x-api-version': this.apiVersion,
    };
  }

  /**
   * Create an order on Cashfree Payment Gateway
   * @param {Object} params
   * @param {string} params.orderId - Unique merchant order ID
   * @param {number} params.amount - Amount in INR (min 1)
   * @param {string} params.currency - 'INR'
   * @param {Object} params.customer - { customerId, customerName, customerEmail, customerPhone }
   * @param {string} params.returnUrl - URL Cashfree redirects back to
   * @param {string} params.orderNote - Description
   */
  async createOrder({ orderId, amount, currency = 'INR', customer = {}, returnUrl, orderNote }) {
    const { baseUrl, isConfigured, env } = this.getConfig();

    if (!isConfigured) {
      console.warn('⚠️ Cashfree credentials are not configured yet in backend/.env');
      throw new Error('Cashfree credentials not configured. Please add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET to backend/.env');
    }

    // Clean and validate customer info
    const cleanPhone = (customer.customerPhone || '9999999999').replace(/[^0-9]/g, '').slice(-10) || '9999999999';
    const cleanEmail = customer.customerEmail && customer.customerEmail.includes('@')
      ? customer.customerEmail.trim().toLowerCase()
      : 'support@zenemoo.in';
    const cleanName = (customer.customerName || 'Zenemoo Supporter').trim().slice(0, 50);
    const cleanCustomerId = (customer.customerId || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);

    let validReturnUrl = returnUrl || 'https://www.zenemoo.in/support-zenemooindia?order_id={order_id}';
    if (!validReturnUrl.startsWith('https://')) {
      validReturnUrl = 'https://www.zenemoo.in/support-zenemooindia?order_id={order_id}';
    }

    const payload = {
      order_id: orderId,
      order_amount: Number(amount.toFixed(2)),
      order_currency: currency,
      customer_details: {
        customer_id: cleanCustomerId,
        customer_name: cleanName,
        customer_email: cleanEmail,
        customer_phone: cleanPhone,
      },
      order_meta: {
        return_url: validReturnUrl,
      },
      order_note: orderNote || 'Zenemoo Platform Support Contribution',
    };

    try {
      const response = await axios.post(`${baseUrl}/orders`, payload, {
        headers: this.getHeaders(),
        timeout: 20000,
      });

      return {
        success: true,
        data: response.data,
        paymentSessionId: response.data.payment_session_id,
        orderId: response.data.order_id,
        cfOrderId: response.data.cf_order_id,
        orderStatus: response.data.order_status,
        env,
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to create Cashfree order';
      console.error('Cashfree order creation error:', error.response?.data || error.message);
      throw new Error(`Cashfree Order Creation Error: ${errMsg}`);
    }
  }

  /**
   * Get order status directly from Cashfree
   * @param {string} orderId
   */
  async getOrder(orderId) {
    const { baseUrl } = this.getConfig();

    try {
      const response = await axios.get(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
        headers: this.getHeaders(),
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      console.error(`Cashfree getOrder error (${orderId}):`, errMsg);
      throw new Error(`Cashfree fetch order failed: ${errMsg}`);
    }
  }

  /**
   * Get payments for a specific order from Cashfree
   * @param {string} orderId
   */
  async getOrderPayments(orderId) {
    const { baseUrl } = this.getConfig();

    try {
      const response = await axios.get(`${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
        headers: this.getHeaders(),
        timeout: 15000,
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn(`Cashfree getOrderPayments warning (${orderId}):`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Verify Cashfree webhook signature
   * @param {Object} params
   * @param {string} params.signature - From header x-webhook-signature
   * @param {string} params.timestamp - From header x-webhook-timestamp
   * @param {string|Buffer} params.rawBody - Raw request body
   */
  verifyWebhookSignature({ signature, timestamp, rawBody }) {
    const { clientSecret, isConfigured } = this.getConfig();
    if (!isConfigured || !signature || !timestamp || !rawBody) {
      return false;
    }

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const dataToSign = timestamp + bodyStr;
      const expectedSignature = crypto
        .createHmac('sha256', clientSecret)
        .update(dataToSign)
        .digest('base64');

      const sigBuffer = Buffer.from(signature, 'utf8');
      const expBuffer = Buffer.from(expectedSignature, 'utf8');

      if (sigBuffer.length !== expBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expBuffer);
    } catch (err) {
      console.error('Webhook signature verification error:', err);
      return false;
    }
  }
}

export const cashfreeService = new CashfreeService();
