import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
// 100% Direct Supabase PostgreSQL Connected Backend
import dotenv from 'dotenv';
import { supabase } from './config/supabase.js';
import userRoutes from './routes/userRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import adminQuizRoutes from './routes/adminQuizRoutes.js';
import participantQuizRoutes from './routes/participantQuizRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';

dotenv.config();

const app = express();
let PORT = parseInt(process.env.PORT, 10) || 5001;

// Bulletproof CORS Configuration (handles all origins, preflights, and headers)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-user-id']
}));

app.use(morgan('dev'));
app.use(express.json());

// Primary API Routes
app.use('/api/users', userRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/admin', adminQuizRoutes);
app.use('/api/participant', participantQuizRoutes);
app.use('/api/schedule', scheduleRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Eloquence 2K26 Quiz API (Live Supabase DB)',
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

// Start Server with fallback port attempt if EADDRINUSE in development
const HOST = '0.0.0.0';

function startServer(portToTry) {
  const server = app.listen(portToTry, HOST, () => {
    PORT = portToTry;
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
        console.error(`❌ Port ${portToTry} is already in use in production environment. Exiting.`);
        process.exit(1);
      }
      console.warn(`⚠️  Port ${portToTry} is in use. Trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('❌ Server listener error:', err);
    }
  });
}

startServer(PORT);
