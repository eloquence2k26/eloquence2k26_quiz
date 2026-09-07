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

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

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

// Start server (Render provides PORT)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/api/health`);
});
