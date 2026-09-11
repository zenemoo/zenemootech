import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Supabase Auth "Send Email" Hook Edge Function
 * - Primary Email Provider: Resend (zenemoo.in)
 * - Fallback Email Provider: Brevo (v3 API)
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

// Helper to generate world-class, responsive, branded HTML email
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
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload: SupabaseAuthHookPayload = await req.json();

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

    // Build confirmation URL if token_hash is available
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

    // 1. Try Resend Primary
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

    // 2. If Resend failed or is unconfigured, try Brevo fallback
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

    // Return empty JSON 200 to signal success to Supabase Auth Hook
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
