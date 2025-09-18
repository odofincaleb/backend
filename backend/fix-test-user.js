const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function fixTestUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const testEmail = 'test@example.com';
    const testPassword = 'Password123';
    const testName = 'Test User';
    
    console.log('Fixing test user password...');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    
    // Update or insert user
    const result = await pool.query(`
      INSERT INTO users (email, password, name, created_at, updated_at) 
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (email) 
      DO UPDATE SET 
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        updated_at = NOW()
      RETURNING id, email, name
    `, [testEmail, hashedPassword, testName]);
    
    console.log('Test user fixed successfully:', result.rows[0]);
    
  } catch (error) {
    console.error('Error fixing test user:', error.message);
  } finally {
    await pool.end();
  }
}

fixTestUser();
