const express = require('express');
const router = express.Router();
const Joi = require('joi');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().required()
});

// Test endpoint to check environment and database
router.get('/health-check', async (req, res) => {
  try {
    console.log('Health check requested');
    
    // Check environment variables
    const envCheck = {
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    };
    
    // Test database connection
    let dbCheck = 'UNKNOWN';
    try {
      const result = await query('SELECT NOW() as current_time');
      dbCheck = 'CONNECTED';
      console.log('Database connected, current time:', result.rows[0].current_time);
    } catch (dbError) {
      dbCheck = 'ERROR: ' + dbError.message;
      console.error('Database error:', dbError);
    }
    
    // Check if test user exists
    let userCheck = 'UNKNOWN';
    try {
      const userResult = await query('SELECT id, email FROM users WHERE email = $1', ['test@example.com']);
      userCheck = userResult.rows.length > 0 ? 'EXISTS' : 'NOT FOUND';
      console.log('Test user check:', userCheck);
    } catch (userError) {
      userCheck = 'ERROR: ' + userError.message;
      console.error('User check error:', userError);
    }
    
    res.json({
      success: true,
      environment: envCheck,
      database: dbCheck,
      testUser: userCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Test endpoint to create a test user
router.post('/create-test-user', async (req, res) => {
  try {
    console.log('Creating test user...');
    
    const testEmail = 'test@example.com';
    const testPassword = 'Password123';
    const testName = 'Test User';
    
    // Check if test user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [testEmail]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('Test user already exists');
      return res.json({
        success: true,
        message: 'Test user already exists',
        user: { email: testEmail, name: testName }
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    
    // Create test user
    const result = await query(
      'INSERT INTO users (email, password, name, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, email, name',
      [testEmail, hashedPassword, testName]
    );
    
    const user = result.rows[0];
    console.log('Test user created successfully:', user);
    
    res.json({
      success: true,
      message: 'Test user created successfully',
      user
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to create test user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt received:', { email: req.body.email });
    logger.info('Login attempt received:', { email: req.body.email });
    
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      console.log('Validation error:', error.details[0].message);
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { email, password } = value;
    console.log('Validated login data for:', email);

    // Find user
    console.log('Querying database for user:', email);
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    console.log('Database query result:', result.rows.length, 'users found');

    const user = result.rows[0];
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check password
    console.log('Checking password for user:', user.email);
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for user:', user.email);
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Generate token
    console.log('Generating JWT token for user:', user.id);
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set!');
      throw new Error('JWT_SECRET environment variable is not set');
    }
    
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('JWT token generated successfully');

    // Remove password from user object
    delete user.password;

    // Log successful login
    logger.info(`User logged in successfully: ${user.email}`);

    res.json({
      success: true,
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { email, password, name } = value;

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: 'Registration error',
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password, name, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, email, name, created_at`,
      [email, hashedPassword, name]
    );

    const user = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful registration
    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      user,
      token
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to register'
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to get profile'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const schema = Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().min(8).required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.details[0].message
      });
    }

    const { currentPassword, newPassword } = value;

    // Get user with password
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    // Log password change
    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to change password'
    });
  }
});

module.exports = router;