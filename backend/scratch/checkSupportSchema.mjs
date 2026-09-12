import { supabase } from '../src/config/supabase.js';

async function checkSupportSchema() {
  console.log('🔍 Checking Supabase support_tickets table...');
  if (!supabase) {
    console.error('Supabase client not initialized!');
    process.exit(1);
  }

  // 1. Try select('*').limit(1) to see actual columns
  try {
    const { data, error } = await supabase.from('support_tickets').select('*').limit(5);
    if (error) {
      console.error('❌ select(*) error:', error);
    } else {
      console.log('✅ select(*) success! Row count:', data.length);
      if (data.length > 0) {
        console.log('Sample row columns:', Object.keys(data[0]));
        console.log('Sample row data:', data[0]);
      } else {
        console.log('Table is currently empty, checking column names via single insert attempt or metadata...');
      }
    }
  } catch (err) {
    console.error('Exception querying support_tickets:', err);
  }

  // 2. Try checking with individual column queries to verify existence
  const candidateColumns = [
    'id', 'ticket_id', 'user_id', 'user_email', 'user_name', 'email', 'name',
    'category', 'subject', 'message', 'status', 'priority', 'created_at', 'updated_at'
  ];

  console.log('\n🔍 Testing existence of individual candidate columns:');
  for (const col of candidateColumns) {
    try {
      const { data, error } = await supabase.from('support_tickets').select(col).limit(1);
      if (error) {
        console.log(`  ❌ Column "${col}": NOT FOUND (${error.message})`);
      } else {
        console.log(`  ✅ Column "${col}": EXISTS`);
      }
    } catch (e) {
      console.log(`  ❌ Column "${col}": ERROR (${e.message})`);
    }
  }

  process.exit(0);
}

checkSupportSchema();
