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

pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

const nodemailer = require('nodemailer');
const Email = require('email-templates');

app.post('/requestReset', async (req, res) => {
  const { email } = req.body;

  try {
    // check if email exists in the database
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      //generates a six-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      await pool.query(
        'INSERT INTO password_reset (email, code) VALUES ($1, $2)',
        [email, code]
      );

      //update with EMAILJS stuff
        //npm install @emailjs/browser --save
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const emailTemplate = new Email({
        transport: transporter,
        send: true,
        preview: false,
      });

      await emailTemplate.send({
        template: 'passwordReset',
        message: {
          to: email
        },
        locals: {
          code: code
        }
      });

      res.status(200).json({ message: 'Verification code sent' });
    } else {
      res.status(404).json({ message: 'Email not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred while requesting a password reset' });
  }
});

app.post('/verifyCode', async (req, res) => {
  const { email, code } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM password_reset WHERE email = $1 AND code = $2',
      [email, code]
    );

    if (result.rows.length > 0) {
      const resetRequest = result.rows[0];

      //check if 10 minutes have passed since the code was created
      const createdAt = new Date(resetRequest.created_at);
      const now = new Date();
      const diff = (now - createdAt) / 1000 / 60;

      if (diff <= 10) {
        res.status(200).json({ message: 'Verification successful' });
      } else {
        res.status(400).json({ message: 'Verification code expired' });
      }
    } else {
      res.status(400).json({ message: 'Verification code incorrect' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred during verification' });
  }
});

app.post('/resetPassword', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred while resetting the password' });
  }
});


