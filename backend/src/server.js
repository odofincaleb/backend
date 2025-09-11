require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { testConnection } = require('./database/connection');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const campaignRoutes = require('./routes/campaigns');
const wordpressRoutes = require('./routes/wordpress');
const licenseRoutes = require('./routes/license');
const adminRoutes = require('./routes/admin');
const titleQueueRoutes = require('./routes/titleQueue');

// Import services
const campaignScheduler = require('./services/campaignScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false // Allow embedding in iframes
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://fiddy-autopublisher.vercel.app',
      'https://backend-production-8c02.up.railway.app'
    ];

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Apply rate limiter to all routes
app.use(limiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (before all other routes)
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    res.status(200).json({
      status: dbConnected ? 'OK' : 'Database Error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbConnected ? 'Connected' : 'Disconnected'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'Error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/wordpress', wordpressRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/title-queue', titleQueueRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Global error handler:', err);
  
  // Handle specific error types
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  try {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop campaign scheduler
    if (campaignScheduler) {
      campaignScheduler.stop();
      logger.info('Campaign scheduler stopped');
    }

    // Close database connections
    try {
      const { pool } = require('./database/connection');
      await pool.end();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections:', error);
    }

    // Close server
    if (server) {
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.warn('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Fiddy AutoPublisher API server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Start campaign scheduler (with delay to ensure database is ready)
    setTimeout(() => {
      try {
        campaignScheduler.start();
        logger.info('🤖 Campaign scheduler started');
      } catch (error) {
        logger.error('Failed to start campaign scheduler:', error);
      }
    }, 5000); // 5 second delay

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
const server = startServer();

module.exports = app;