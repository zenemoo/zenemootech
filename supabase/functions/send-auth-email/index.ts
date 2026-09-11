import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Supabase Auth "Send Email" Hook Edge Function
 * - Verified with: SEND_EMAIL_HOOK_SECRET (Svix / Standard Webhooks)
 * - Primary Provider: Resend API (zenemoo.in)
 * - Fallback Provider: Brevo v3 API
 * - Sender: Zenemoo <no-reply@zenemoo.in>
 * - Never logs OTPs, tokens, or private secrets.
 */

interface SupabaseAuthHookPayload {
  user: {
    id?: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
    site_url?: string;
    token_new?: string;
  };
}

const RESEND_API_URL = "https://api.resend.com/emails";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER_EMAIL = "no-reply@zenemoo.in";
const SENDER_NAME = "Zenemoo";

/**
 * Verifies Supabase Auth Hook Webhook Signature (Svix / Standard Webhook)
 */
async function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  headers: Headers
): Promise<boolean> {
  const msgId = headers.get("webhook-id") || headers.get("svix-id");
  const msgTimestamp = headers.get("webhook-timestamp") || headers.get("svix-timestamp");
  const msgSignature = headers.get("webhook-signature") || headers.get("svix-signature");

  if (!msgId || !msgTimestamp || !msgSignature) {
    return false;
  }

  // Prevent replay attacks (tolerance: 5 minutes)
  const timestampSec = parseInt(msgTimestamp, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (isNaN(timestampSec) || Math.abs(nowSec - timestampSec) > 300) {
    console.warn("[Auth Hook Security] Webhook timestamp outside allowed 5-minute window");
    return false;
  }

  const toSign = `${msgId}.${msgTimestamp}.${rawBody}`;
  const encoder = new TextEncoder();

  let keyBytes: Uint8Array;
  if (secret.startsWith("whsec_")) {
    const base64Part = secret.slice(6);
    const binaryStr = atob(base64Part);
    keyBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      keyBytes[i] = binaryStr.charCodeAt(i);
    }
  } else {
    keyBytes = encoder.encode(secret);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(toSign)
  );

  const computedSigBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  // Signature header may contain multiple signatures: "v1,signature1 v1,signature2"
  const signatures = msgSignature.split(" ").map((s) => s.trim());
  for (const sig of signatures) {
    const parts = sig.split(",");
    if (parts.length === 2 && parts[0] === "v1") {
      if (parts[1] === computedSigBase64) {
        return true;
      }
    } else if (sig === computedSigBase64) {
      return true;
    }
  }

  return false;
}

// Builds high-conversion, responsive branded HTML email
function buildAuthEmailHtml(params: {
  actionType: string;
  otpToken?: string;
  confirmationUrl?: string;
  siteUrl?: string;
}): { subject: string; html: string } {
  const { actionType, otpToken, confirmationUrl, siteUrl = "https://www.zenemoo.in" } = params;
  const logoUrl = "https://www.zenemoo.in/assets/logo.png";

  let title = "Your Verification Code";
  let subject = "Your Zenemoo Verification Code";
  let description = "Use the 6-digit verification code below to securely sign in to your Zenemoo account.";
  let buttonLabel = "Sign in directly";

  if (actionType === "signup" || actionType === "invite") {
    title = "Confirm Your Zenemoo Account";
    subject = "Verify Your Email — Zenemoo";
    description = "Welcome to Zenemoo! Use the 6-digit code below to confirm your account and get started.";
    buttonLabel = "Confirm Account";
  } else if (actionType === "recovery") {
    title = "Reset Your Password";
    subject = "Reset Your Zenemoo Password";
    description = "We received a request to reset your password. Use the 6-digit code below to proceed.";
    buttonLabel = "Reset Password";
  } else if (actionType === "email_change" || actionType === "email_change_new") {
    title = "Confirm Email Change";
    subject = "Confirm Your New Email — Zenemoo";
    description = "Use the 6-digit code below to confirm updating your email address on Zenemoo.";
    buttonLabel = "Verify Email Change";
  }

  const tokenHtml = otpToken
    ? `
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="background: #f1f5f9; border: 2px dashed #00D084; border-radius: 12px; padding: 18px 24px; display: inline-block; min-width: 240px;">
            <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #00875A; display: block;">
              ${otpToken}
            </span>
          </div>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 20px 0; font-size: 13px; color: #64748b; text-align: center;">
      ⏱ This code is valid for <strong>10 minutes</strong> and can only be used once.
    </p>
  `
    : "";

  const buttonHtml = confirmationUrl
    ? `
    <div style="height: 1px; background-color: #e2e8f0; margin: 24px 0;"></div>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; text-align: center;">
      Prefer to sign in with one tap?
    </p>
    <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 12px auto;">
      <tr>
        <td align="center" style="border-radius: 8px; background: #0b132b;">
          <a href="${confirmationUrl}" target="_blank" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; display: inline-block; background-color: #0b132b;">
            ${buttonLabel} &rarr;
          </a>
        </td>
      </tr>
    </table>
  `
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; width: 100%; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
          
          <!-- Header with Zenemoo Logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; background: #0b132b; border-bottom: 1px solid #1e293b;">
              <a href="${siteUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${logoUrl}" alt="Zenemoo" width="160" style="display: block; max-height: 48px; width: auto; margin: 0 auto; outline: none; border: none;" />
              </a>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a; text-align: center; letter-spacing: -0.02em;">
                ${title}
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #475569; text-align: center;">
                ${description}
              </p>

              ${tokenHtml}
              ${buttonHtml}

              <!-- Security Warning -->
              <p style="margin: 28px 0 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                🔒 If you did not request this verification code, you can safely ignore this email. Never share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #334155;">
                Zenemoo Technologies
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                <a href="${siteUrl}" style="color: #64748b; text-decoration: underline;">www.zenemoo.in</a> &bull; Opportunities Through Technology
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

// Resend Email Sender
async function sendWithResend(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Resend Error Status ${res.status}]: ${errText}`);
    return false;
  }

  return true;
}

// Brevo Fallback Sender
async function sendWithBrevo(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
  let normalizedKey = apiKey.trim();
  if (!normalizedKey.startsWith("xsmtpsib-") && !normalizedKey.startsWith("xkeysib-")) {
    normalizedKey = `xsmtpsib-${normalizedKey}`;
  }

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": normalizedKey,
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Brevo Fallback Error Status ${res.status}]: ${errText}`);
    return false;
  }

  return true;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();

    // 1. Verify Webhook Secret if configured
    const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (hookSecret) {
      const isValid = await verifyWebhookSignature(hookSecret, rawBody, req.headers);
      if (!isValid) {
        console.warn("[Auth Hook Security] Webhook signature verification failed. Request rejected.");
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid webhook signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const payload: SupabaseAuthHookPayload = JSON.parse(rawBody);

    const recipientEmail = payload?.user?.email;
    if (!recipientEmail || typeof recipientEmail !== "string") {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const actionType = payload?.email_data?.email_action_type || "magiclink";
    const otpToken = payload?.email_data?.token;
    const tokenHash = payload?.email_data?.token_hash;
    const redirectTo = payload?.email_data?.redirect_to;
    const siteUrl = payload?.email_data?.site_url || "https://www.zenemoo.in";

    // Build verification URL if token_hash is available
    let confirmationUrl: string | undefined = undefined;
    if (tokenHash) {
      const supabaseProjectUrl = Deno.env.get("SUPABASE_URL") || siteUrl;
      const url = new URL("/auth/v1/verify", supabaseProjectUrl);
      url.searchParams.set("token", tokenHash);
      url.searchParams.set("type", actionType);
      if (redirectTo) {
        url.searchParams.set("redirect_to", redirectTo);
      }
      confirmationUrl = url.toString();
    }

    const { subject, html } = buildAuthEmailHtml({
      actionType,
      otpToken,
      confirmationUrl,
      siteUrl,
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY") || Deno.env.get("BREVO_SMTP_KEY");

    let sent = false;

    // Primary: Resend
    if (resendApiKey) {
      try {
        sent = await sendWithResend(resendApiKey, recipientEmail, subject, html);
      } catch (err: any) {
        console.error("[Resend Exception]:", err?.message || "Send failed");
        sent = false;
      }
    } else {
      console.warn("[Send Auth Email] RESEND_API_KEY secret not found. Attempting fallback...");
    }

    // Fallback: Brevo
    if (!sent && brevoApiKey) {
      console.log("[Send Auth Email] Triggering Brevo fallback delivery...");
      try {
        sent = await sendWithBrevo(brevoApiKey, recipientEmail, subject, html);
      } catch (err: any) {
        console.error("[Brevo Exception]:", err?.message || "Fallback send failed");
        sent = false;
      }
    }

    if (!sent) {
      console.error("[Send Auth Email Fatal]: All email delivery providers failed.");
      return new Response(JSON.stringify({ error: "Failed to send email via available providers" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return empty JSON 200 for Supabase Auth Hook
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Auth Hook Error]:", error?.message || "Unexpected exception");
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
