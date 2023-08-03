const pool = require('./db');

const createTables = async () => {
  try {
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        birthdate DATE NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS dexcom_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      access_token TEXT NOT NULL, 
      refresh_token TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);  
    
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          high_threshold INTEGER NOT NULL,
          low_threshold INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hue_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL, 
      clientkey TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  } catch (err) {
    console.error(err);
  }
};

module.exports = createTables;
