require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://wsduykedgwqkcqqazqsv.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZHV5a2VkZ3dxa2NxcWF6cXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMjY1MDIsImV4cCI6MjEwMzkwMjUwMn0.eGJpCp_aeK6i3zazyTFjaW3J2VYAaMnkFUHDVoIpqAw',
  JWT_SECRET: process.env.JWT_SECRET || 'eloquence_symposium_jwt_secret_key_2026_super_secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '*'
};
