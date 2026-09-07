import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_URL = 'https://wsduykedgwqkcqqazqsv.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZHV5a2VkZ3dxa2NxcWF6cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjY1MDIsImV4cCI6MjEwMzkwMjUwMn0.eGJpCp_aeK6i3zazyTFjaW3J2VYAaMnkFUHDVoIpqAw';

const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
