require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Current time:', result.rows[0].current_time);
    
    client.release();
    await pool.end();
    console.log('✅ Test completed');
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

test();
