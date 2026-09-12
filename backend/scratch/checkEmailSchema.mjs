import { supabase } from '../src/config/supabase.js';

async function checkEmailSchema() {
  if (!supabase) {
    console.log('Supabase client not configured.');
    return;
  }
  const { data, error } = await supabase.from('incoming_email_messages').select('*').limit(1);
  if (error) {
    console.error('Error fetching incoming_email_messages:', error);
  } else {
    console.log('incoming_email_messages columns & sample:', data && data[0] ? Object.keys(data[0]) : 'Empty table or columns');
    if (data && data[0]) {
      console.log('Sample row:', {
        id: data[0].id,
        message_id: data[0].message_id,
        mailbox_email: data[0].mailbox_email,
        sender_email: data[0].sender_email,
        subject: data[0].subject,
        attachments: data[0].attachments,
      });
    }
  }

  const { data: sentData, error: sentErr } = await supabase.from('email_history').select('*').limit(1);
  if (sentErr) {
    console.error('Error fetching email_history:', sentErr);
  } else {
    console.log('email_history columns & sample:', sentData && sentData[0] ? Object.keys(sentData[0]) : 'Empty table');
  }
}

checkEmailSchema().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
