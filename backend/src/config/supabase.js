const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const keyToUse = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(env.SUPABASE_URL, keyToUse, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = supabase;
