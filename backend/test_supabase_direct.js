import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://wsduykedgwqkcqqazqsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZHV5a2VkZ3dxa2NxcWF6cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjY1MDIsImV4cCI6MjEwMzkwMjUwMn0.eGJpCp_aeK6i3zazyTFjaW3J2VYAaMnkFUHDVoIpqAw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectSupabaseUUID() {
  console.log('--- Testing Direct Supabase Query ---');
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  console.log('Initial Supabase Users Count:', users?.length, 'Users:', users);

  console.log('\n--- Testing Insert UUID User to Supabase ---');
  const testId = crypto.randomUUID();
  console.log('Generated UUID:', testId);

  const { data: insData, error: insErr } = await supabase.from('users').upsert([{
    id: testId,
    name: 'Live Supabase UUID Sync User',
    phone: '9876543210',
    email: `uuid_${Date.now()}@eloquence.com`,
    password: '9876',
    role: 'user',
    status: 'Active',
    quizzes_attempted: 0,
    score: 0,
    created_at: new Date().toISOString()
  }], { onConflict: 'id' }).select();

  if (insErr) {
    console.error('Supabase Direct Insert Error:', insErr);
  } else {
    console.log('✅ Supabase Direct Insert SUCCESS:', insData);
  }

  console.log('\n--- Re-fetching Users from Supabase ---');
  const { data: refreshedUsers } = await supabase.from('users').select('*');
  console.log('Refreshed Supabase Users Count:', refreshedUsers?.length, 'Users:', refreshedUsers);

  console.log('\n--- Cleaning up Direct Test User ---');
  const { error: delErr } = await supabase.from('users').delete().eq('id', testId);
  if (delErr) {
    console.error('Supabase Direct Delete Error:', delErr);
  } else {
    console.log('✅ Supabase Direct Delete SUCCESS for ID:', testId);
  }
}

testDirectSupabaseUUID().catch(err => console.error('Test Error:', err));
