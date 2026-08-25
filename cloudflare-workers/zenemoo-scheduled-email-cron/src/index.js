/**
 * ZENEMOO Scheduled Email Cloudflare Cron Worker (zenemoo-scheduled-email-cron)
 * 
 * Runs every 1 minute (* * * * *) as the system CLOCK trigger.
 * Sends a secure HTTP POST request to the Render Backend process endpoint.
 * Render Backend performs atomic claim, Brevo delivery, and history logging.
 */
export default {
  async scheduled(event, env, ctx) {
    const backendUrl =
      env.SCHEDULER_BACKEND_URL ||
      'https://zenemootech-api.onrender.com/api/emails/scheduled/process';

    const secret = env.ZENEMOO_SCHEDULER_SECRET || 'zenemoo_cloudflare_cron_secret_2026';

    console.log(`[Scheduled Email Cron] Waking backend at ${new Date().toISOString()} (${backendUrl})...`);

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zenemoo-scheduler-secret': secret,
        },
        body: JSON.stringify({
          source: 'cloudflare-cron',
          timestamp: new Date().toISOString(),
          cron: event.cron || '* * * * *',
        }),
      });

      if (!response.ok) {
        console.error(`[Scheduled Email Cron] Backend HTTP error ${response.status}: ${response.statusText}`);
        return;
      }

      const data = await response.json();
      console.log('[Scheduled Email Cron] Backend processor executed successfully:', JSON.stringify(data));
    } catch (err) {
      console.error(`[Scheduled Email Cron] Network error calling backend: ${err.message}`);
    }
  },

  // Fallback fetch handler for manual health check / diagnostic testing via Cloudflare dashboard or browser
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(
        JSON.stringify({
          service: 'zenemoo-scheduled-email-cron',
          status: 'ONLINE',
          cronSchedule: '* * * * *',
          backendUrl: env.SCHEDULER_BACKEND_URL || 'https://zenemootech-api.onrender.com/api/emails/scheduled/process',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (url.pathname === '/trigger' && request.method === 'POST') {
      const backendUrl =
        env.SCHEDULER_BACKEND_URL ||
        'https://zenemootech-api.onrender.com/api/emails/scheduled/process';
      const secret = env.ZENEMOO_SCHEDULER_SECRET || 'zenemoo_cloudflare_cron_secret_2026';

      const resp = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zenemoo-scheduler-secret': secret,
        },
        body: JSON.stringify({ source: 'manual-trigger', timestamp: new Date().toISOString() }),
      });

      const data = await resp.text();
      return new Response(data, {
        status: resp.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
