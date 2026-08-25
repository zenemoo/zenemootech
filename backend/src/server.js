import app from './app.js';
import dotenv from 'dotenv';
import { checkAndNotifyAppRelease } from './services/appReleaseNotifier.js';
import { startBookingReminderScheduler } from './services/bookingReminderScheduler.js';
import { checkGoogleMeetConfiguration } from './services/googleMeetService.js';
import { startScheduledEmailWorker } from './services/scheduledEmailWorker.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`
=====================================================
🚀 ZENEMOO Backend API Server Running on Port ${PORT}
🌐 API Base URL: http://localhost:${PORT}/api
⚡ Environment: ${process.env.NODE_ENV || 'development'}
=====================================================
  `);

  // Safe Google Meet Configuration Diagnostic
  try {
    checkGoogleMeetConfiguration();
  } catch (gErr) {
    console.warn('[Google Meet Diagnostic Warning]:', gErr.message);
  }

  // Start Booking 1-Hour Reminder Background Scheduler
  try {
    startBookingReminderScheduler();
  } catch (err) {
    console.warn('[Booking Reminder Scheduler Startup Warning]:', err.message);
  }

  // Cloudflare Cron Scheduled Email Processor Active Notice
  console.log('⚡ [Scheduled Email Processor] Cloudflare Cron Trigger Active (* * * * * → POST /api/emails/scheduled/process)');

  // Automatic App Release Notification Check
  try {
    await checkAndNotifyAppRelease();
  } catch (err) {
    console.warn('[App Release Check Error]:', err.message);
  }
});

