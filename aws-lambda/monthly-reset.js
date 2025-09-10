const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/**
 * Monthly reset Lambda handler
 * Resets monthly post counts for all users
 */
exports.handler = async (event, context) => {
  console.log('Monthly reset Lambda started');
  
  try {
    // Reset monthly post counts for all users
    const result = await pool.query(
      'UPDATE users SET posts_published_this_month = 0 WHERE subscription_tier IN ($1, $2)',
      ['hobbyist', 'professional']
    );

    console.log(`Reset monthly post counts for ${result.rowCount} users`);

    // Log the reset
    await pool.query(
      `INSERT INTO logs (event_type, message, severity, metadata)
       VALUES ('monthly_reset', 'Monthly post counts reset', 'info', $1)`,
      [JSON.stringify({ usersReset: result.rowCount, resetDate: new Date().toISOString() })]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Monthly reset completed successfully',
        usersReset: result.rowCount
      })
    };

  } catch (error) {
    console.error('Monthly reset error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

