import { supabaseService } from './services/supabaseService.js';
import dotenv from 'dotenv';
dotenv.config();

async function testExactEmailInsert() {
  console.log('--- Testing exact email insert for user_accounts ---');
  const team = await supabaseService.selectAll('team');
  const saswati = team.find(m => m.name.toLowerCase().includes('saswati'));
  if (!saswati) {
    console.log('Saswati record not found in DB');
    return;
  }

  const payload = {
    team_member_id: saswati.id,
    email: 'zenemootech@gmail.com', // EXACT REAL EMAIL
    password_hash: '$2b$10$testpasshash',
    role: 'team_member',
    status: 'active',
    email_access: false,
    notification_access: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const inserted = await supabaseService.insert('user_accounts', payload);
    console.log('SUCCESS! Exact email inserted:', inserted);
    if (inserted && inserted.id) {
      await supabaseService.delete('user_accounts', inserted.id);
      console.log('Cleaned test ID:', inserted.id);
    }
  } catch (err) {
    console.error('FAILED EXACT INSERT:', err.message);
  }
}

testExactEmailInsert();
