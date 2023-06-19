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
    console.log('Users table successfully created');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Password reset table successfully created');
  } catch (err) {
    console.error(err);
  }
};

module.exports = createTables;
