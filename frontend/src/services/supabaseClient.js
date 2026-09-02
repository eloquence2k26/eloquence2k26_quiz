import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wsduykedgwqkcqqazqsv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZHV5a2VkZ3dxa2NxcWF6cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjY1MDIsImV4cCI6MjEwMzkwMjUwMn0.eGJpCp_aeK6i3zazyTFjaW3J2VYAaMnkFUHDVoIpqAw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
