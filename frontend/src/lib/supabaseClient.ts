import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://wkbkomwjuywdeaxgchxw.supabase.co';
const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrYmtvbXdqdXl3ZGVheGdjaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjk2OTIsImV4cCI6MjEwMDc0NTY5Mn0.A9O0I0nzdWLrsULZEdL6GxUp4Ok3Y_QRbqCMJesXbM4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
