const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database connection configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Reduced from 20 to prevent resource exhaustion
  idleTimeoutMillis: 10000, // Reduced from 30 seconds
  connectionTimeoutMillis: 5000, // Increased from 2 seconds
  query_timeout: 10000, // 10 second query timeout
  statement_timeout: 10000, // 10 second statement timeout
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    logger.info('🔄 Attempting database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Database connected successfully:', result.rows[0].now);
    return true;
  } catch (err) {
    logger.error('❌ Database connection failed:', err.message);
    logger.error('Database error details:', {
      code: err.code,
      detail: err.detail,
      hint: err.hint
    });
    return false;
  }
};

// Execute query with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    logger.error('Database query error:', { text, error: err.message });
    throw err;
  }
};

// Get a client from the pool for transactions
const getClient = async () => {
  return await pool.connect();
};

// Close all connections
const closePool = async () => {
  await pool.end();
  logger.info('Database pool closed');
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  closePool
};

