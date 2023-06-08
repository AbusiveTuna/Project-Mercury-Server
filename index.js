const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const pool = require('./db');

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));

pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    birthdate DATE NOT NULL
  );
`, (err, res) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Table successfully created');
});


app.get('/users', async (req, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT * FROM users');
      const results = { 'results': (result) ? result.rows : null};
      res.send(results);
      client.release();
    } catch (err) {
      console.error(err);
      res.send("Error " + err);
    }
  })
  