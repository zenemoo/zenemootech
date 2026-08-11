import { supabase } from '../src/config/supabase.js';
import { sendApplicationConfirmationEmail } from '../src/controllers/opportunityApplicationController.js';
import { sendApplicationNotification } from '../src/services/telegramNotificationService.js';
import { syncApplicationToGoogleSheet } from '../src/services/googleSheetsService.js';

async function debugApplications() {
  console.log('🔍 Debugging Recent Applications & Email Triggers...\n');

  const { data: apps, error } = await supabase
    .from('opportunity_applications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Supabase error:', error.message);
    return;
  }

  console.log(`Found ${apps.length} recent applications:`);
  apps.forEach((a) => {
    console.log(`- ID: ${a.id} | AppID: ${a.applicant_id} | Email: ${a.applicant_email} | OppID: ${a.opportunity_id} | EmailStatus: ${a.email_status} | SyncStatus: ${a.sync_status}`);
  });

  if (apps.length > 0) {
    const latest = apps[0];
    console.log(`\nTesting Confirmation Email Dispatch for latest app (${latest.applicant_id})...`);
    try {
      const emailResult = await sendApplicationConfirmationEmail(latest);
      console.log('Confirmation email result:', emailResult);
    } catch (e) {
      console.error('Confirmation email error:', e.message);
    }

    console.log(`\nTesting Telegram Notification Dispatch for latest app (${latest.applicant_id})...`);
    try {
      const tgResult = await sendApplicationNotification({
        applicant_name: latest.applicant_name,
        applicant_email: latest.applicant_email,
        applicant_phone: latest.applicant_phone,
        opportunity_title: latest.opportunity_title,
        qualification: latest.answers?.qualification || 'N/A',
      });
      console.log('Telegram notification result:', tgResult);
    } catch (e) {
      console.error('Telegram notification error:', e.message);
    }
  }

  process.exit(0);
}

debugApplications();
