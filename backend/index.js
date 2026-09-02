import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
let PORT = parseInt(process.env.PORT, 10) || 5001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Eloquence 2K26 Quiz API',
    status: 'online',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    supabaseConnected: Boolean(supabase),
    port: PORT
  });
});

// Sample quiz route stub
app.get('/api/quizzes', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({
        error: 'Database connection not configured',
        message: 'Please set SUPABASE_URL and SUPABASE_ANON_KEY in backend/.env'
      });
    }

    const { data, error } = await supabase.from('quizzes').select('*');
    if (error) throw error;

    res.json({ quizzes: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server with fallback port attempt if EADDRINUSE
function startServer(portToTry) {
  const server = app.listen(portToTry, () => {
    PORT = portToTry;
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${portToTry} is in use. Trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('❌ Server listener error:', err);
    }
  });
}

startServer(PORT);
