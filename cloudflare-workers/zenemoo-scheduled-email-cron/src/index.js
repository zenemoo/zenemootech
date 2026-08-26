export default {
  async fetch(request, env, ctx) {
    return new Response(
      JSON.stringify({
        ok: true,
        service: "zenemoo-scheduled-email-cron",
        message: "Cron worker is active"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  },

  async scheduled(event, env, ctx) {
    const backendUrl =
      env.SCHEDULER_BACKEND_URL ||
      "https://zenemootech-api.onrender.com/api/emails/scheduled/process";
    const secret = env.ZENEMOO_SCHEDULER_SECRET;

    console.log(`[Scheduler] Cron triggered at ${new Date().toISOString()}`);

    if (!secret) {
      console.error("[Scheduler] Error: ZENEMOO_SCHEDULER_SECRET environment variable is missing.");
      return;
    }

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-zenemoo-scheduler-secret": secret
        },
        body: JSON.stringify({
          source: "cloudflare-cron",
          timestamp: new Date().toISOString(),
          cron: event.cron || "* * * * *"
        })
      });

      console.log(`[Scheduler] Backend status: ${response.status}`);
    } catch (err) {
      console.error(`[Scheduler] Execution error: ${err.message}`);
    }
  }
};
