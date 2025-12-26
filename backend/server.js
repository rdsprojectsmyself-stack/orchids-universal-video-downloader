const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');

dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'ADMIN_EMAIL', 'GOOGLE_CLIENT_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render)
const PORT = process.env.PORT || 5000;

// Security Middleware (these are safe to run before/after CORS)
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  validate: { xForwardedForHeader: false } // Fix for Render proxy issue
}));

connectDB();

// CORS configuration - CRITICAL: must be applied before routes
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://rdsvideodownloader.vercel.app',
  'https://rdsvideodownloader.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

const vercelRegex = /https:\/\/.*\.vercel\.app$/;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. server-to-server or same-origin requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || vercelRegex.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Access-Token'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

// Apply preflight handling for all routes
// Respond 204 to OPTIONS preflight to avoid browsers failing with "Failed to fetch"
app.options('*', cors(corsOptions), (req, res) => res.sendStatus(204));
app.use(cors(corsOptions));

// Body parsers, cookies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api/video', require('./routes/video'));
app.use('/api/admin', require('./routes/admin'));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'orchads.ai backend is running',
    database: 'SQLite',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler (must respond with JSON)
app.use((err, req, res, next) => {
  console.error('Server error:', err && err.message ? err.message : err);
  // If CORS error, respond with 403 and friendly message
  if (err && err.message && err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS_ERROR', message: 'Origin not allowed' });
  }
  // Some middlewares may set status on the error
  const status = (err && err.status) || 500;
  const message = (err && err.message) || 'Internal server error';
  res.status(status).json({ error: 'Internal server error', message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: SQLite`);
});

module.exports = app;
