import { createClient } from '@supabase/supabase-js';

const API_BASE = 'http://localhost:5001';
const supabaseUrl = 'https://wsduykedgwqkcqqazqsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZHV5a2VkZ3dxa2NxcWF6cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjY1MDIsImV4cCI6MjEwMzkwMjUwMn0.eGJpCp_aeK6i3zazyTFjaW3J2VYAaMnkFUHDVoIpqAw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyLiveSync() {
  console.log('--- 1. Fetch Initial Users directly from Supabase DB ---');
  const { data: initialSupabaseUsers } = await supabase.from('users').select('*');
  console.log('Initial Supabase DB Count:', initialSupabaseUsers?.length, 'Users:', initialSupabaseUsers);

  console.log('\n--- 2. Register New User via Frontend/Backend API ---');
  const regRes = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sync Verified User',
      phone: '9876543210',
      email: `sync_${Date.now()}@eloquence.com`,
      password: '9876',
      role: 'user',
      status: 'Active'
    })
  });

  const regData = await regRes.json();
  console.log('API Register Response:', regData);
  const createdUserId = regData.user?.id;

  console.log('\n--- 3. Verify User directly inside Supabase Database Table ---');
  const { data: supabaseUsersAfter } = await supabase.from('users').select('*').eq('id', createdUserId);
  console.log('User found in Supabase DB:', supabaseUsersAfter);

  if (supabaseUsersAfter && supabaseUsersAfter.length === 1) {
    console.log('✅ SUCCESS: User is 100% PERSISTED in Supabase DB live!');
  } else {
    console.error('❌ FAILED: User was NOT found in Supabase DB!');
  }

  console.log('\n--- 4. Verify API GET /api/users count matches Supabase DB count ---');
  const getRes = await fetch(`${API_BASE}/api/users`);
  const getData = await getRes.json();
  const { data: finalSupabaseUsers } = await supabase.from('users').select('*');
  
  console.log('API returned users count:', getData.users?.length);
  console.log('Supabase DB users count:', finalSupabaseUsers?.length);

  if (getData.users?.length === finalSupabaseUsers?.length) {
    console.log('===================================================================');
    console.log('✅ PERFECT SYNC: Frontend API Count and Supabase DB Count match 1:1!');
    console.log('===================================================================');
  } else {
    console.error('❌ COUNT MISMATCH: API and DB counts do not match!');
  }

  console.log('\n--- 5. Clean up test user from Supabase DB ---');
  await supabase.from('users').delete().eq('id', createdUserId);
  console.log('Cleanup completed.');
}

verifyLiveSync().catch(err => console.error('Error:', err));
