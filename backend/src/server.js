require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');

const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const campaignRoutes = require('./routes/campaigns');
const wordpressRoutes = require('./routes/wordpress');
const licenseRoutes = require('./routes/license');
const adminRoutes = require('./routes/admin');
const titleQueueRoutes = require('./routes/titleQueue');

const app = express();
const PORT = process.env.PORT || 5000;

// Basic health check (before any middleware)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', port: PORT });
});

// Test endpoint to check if routes are working
app.get('/test-routes', (req, res) => {
  res.status(200).json({ 
    message: 'Routes are working',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

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
  allowedHeaders: ['Content-Type', 'Authorization', 'Keep-Alive', 'Connection'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Keep-Alive', 'Connection'],
  maxAge: 86400 // 24 hours
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

// Health check endpoint is already defined above

// Simple test login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Simple login attempt:', req.body);
    res.json({
      success: true,
      message: 'Simple login endpoint working',
      user: { email: req.body.email, name: 'Test User' },
      token: 'test-token'
    });
  } catch (error) {
    console.error('Simple login error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to login'
    });
  }
});

// API routes (temporarily disabled for debugging)
// console.log('Loading API routes...');
// try {
//   app.use('/api/auth', authRoutes);
//   console.log('✅ Auth routes loaded');
// } catch (error) {
//   console.error('❌ Error loading auth routes:', error);
// }

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

// Create HTTP server with custom settings
const server = http.createServer({
  keepAlive: true,
  keepAliveTimeout: 60000, // 60 seconds
  headersTimeout: 30000, // must be <= requestTimeout
  requestTimeout: 30000, // 30 seconds
  timeout: 30000 // 30 seconds
}, app);

// Add error handlers
server.on('error', (error) => {
  logger.error('Server error:', error);
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      logger.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
      break;
    default:
      throw error;
  }
});

server.on('connection', (socket) => {
  // Enable keep-alive on all sockets
  socket.setKeepAlive(true, 30000); // 30 seconds
});

// Start server
const startServer = () => {
  try {
    console.log('Starting to listen on port:', PORT);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server successfully listening on port ${PORT}`);
      logger.info(`🚀 Fiddy AutoPublisher API server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM. Starting graceful shutdown...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.warn('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT. Starting graceful shutdown...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.warn('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    });
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
try {
  console.log('Starting server...');
  console.log('PORT:', PORT);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  const serverInstance = startServer();
  console.log('Server startup initiated successfully');
  logger.info('Server startup initiated');
} catch (error) {
  console.error('Failed to start server:', error);
  logger.error('Failed to start server:', error);
  process.exit(1);
}

module.exports = app;