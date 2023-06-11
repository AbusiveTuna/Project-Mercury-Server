const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const pool = require('./db');
const bcrypt = require('bcryptjs');
const cors = require('cors');

app.use(cors({
    origin: 'https://projectsmercury.com',
    optionsSuccessStatus: 200
  }));

app.use(express.json());

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(``));

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

app.post('/addUser', async (req, res) => {
  const { username, password, email, birthdate } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await pool.query(
      "INSERT INTO users (username, password, email, birthdate) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, hashedPassword, email, birthdate]
    );
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  
      if (result.rows.length > 0) {
        const user = result.rows[0];
  
        // compare the provided password with the stored hashed password
        const match = await bcrypt.compare(password, user.password);
  
        if (match) {
          // login successful
          res.status(200).json({ message: 'Login successful' });
        } else {
          // password is incorrect
          res.status(401).json({ message: 'Invalid username or password' });
        }
      } else {
        // username not found
        res.status(401).json({ message: 'Invalid username or password' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'An error occurred during login' });
    }
});
