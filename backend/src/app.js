const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const zlib = require('zlib');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const quizRoutes = require('./routes/quizRoutes');
const questionRoutes = require('./routes/questionRoutes');
const participantRoutes = require('./routes/participantRoutes');
const examRoutes = require('./routes/examRoutes');
const resultRoutes = require('./routes/resultRoutes');
const roundRoutes = require('./routes/roundRoutes');
const securityRoutes = require('./routes/securityRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Security and utility middleware
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-exam-session-id']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response Gzip Compression middleware (reduces Render HTTP bandwidth by 70-90% for large payloads)
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) {
    return next();
  }

  const originalSend = res.send;
  res.send = function (body) {
    if (res.headersSent || !body) {
      return originalSend.call(this, body);
    }

    let buf;
    if (Buffer.isBuffer(body)) {
      buf = body;
    } else if (typeof body === 'string') {
      buf = Buffer.from(body);
    } else {
      try {
        buf = Buffer.from(JSON.stringify(body));
      } catch (e) {
        return originalSend.call(this, body);
      }
    }

    // Only compress responses >= 1 KB (1024 bytes)
    if (buf.length < 1024) {
      return originalSend.call(this, body);
    }

    res.setHeader('Content-Encoding', 'gzip');
    res.removeHeader('Content-Length');

    zlib.gzip(buf, (err, compressed) => {
      if (err) {
        res.removeHeader('Content-Encoding');
        return originalSend.call(this, body);
      }
      res.setHeader('Content-Length', compressed.length);
      originalSend.call(this, compressed);
    });
  };

  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    symposium: "Eloquence '26 MCQ Quiz Examination API",
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/rounds', roundRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
