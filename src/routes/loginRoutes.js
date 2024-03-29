import express from 'express';
const router = express.Router();
import bcryptjs from 'bcryptjs';
const { hash, compare } = bcryptjs;
import pool from '../db/db.js';
import emailjs from '@emailjs/nodejs';
const { send } = emailjs;
import validator from 'validator';
const { isEmail, normalizeEmail, isLength, escape } = validator;


router.get('/', (req, res) => res.send('Hello World!'));

/*
 * validateUserInput
 * Validates and Sanitizes user input
 * Usernames must be at least 3 characters, Passwords must be at least 8
 * Returns: Sanitized User Input
*/
function validateUserInput(username, password, email, birthdate) {

  if (!isEmail(email)) {
    throw new Error('Invalid email address');
  }

  const sanitizedEmail = normalizeEmail(email);

  if (!isLength(username, { min: 3 })) {
    throw new Error('Username must be at least 3 characters long');
  }

  if (!isLength(password, { min: 8 })) {
    throw new Error('Password must be at least 8 characters long');
  }

  const sanitizedUsername = escape(username);
  const sanitizedPassword = escape(password);
  const sanitizedBirthdate = escape(birthdate);

  return {
    username: sanitizedUsername,
    password: sanitizedPassword,
    email: sanitizedEmail,
    birthdate: sanitizedBirthdate
  };
}

/*
 * Route: addUser
 * Creates a new user account in the database
 * Returns: 200 on a successfully created account
*/
router.post('/addUser', async (req, res) => {
  let { username, password, email, birthdate } = req.body;

  try {
    const validatedInput = validateUserInput(username, password, email, birthdate);
    username = validatedInput.username;
    password = validatedInput.password;
    email = validatedInput.email;
    birthdate = validatedInput.birthdate;

    const hashedPassword = await hash(password, 10);
    const user = await pool.query(
      "INSERT INTO users (username, password, email, birthdate) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, hashedPassword, email, birthdate]
    );
    res.json(user.rows[0]);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

/*
 * Route: login
 * Handles user authentication for logging in
 * Returns: 200 on valid credientials
*/
router.post('/login', async (req, res) => {
  let { username, password } = req.body;

  try {
    const validatedInput = validateUserInput(username, password, "None@gmail.com", "1990-01-01");
    username = validatedInput.username;
    password = validatedInput.password;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      const match = await compare(password, user.password);

      if (match) {
        res.status(200).json({ message: 'Login successful', user_id: user.id });
      } else {
        res.status(401).json({ message: 'Invalid username or password' });
      }
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (err) {
    res.status(500).json({ message: 'An error occurred during login' });
  }
});


/*
 * Route: checkUsernameAvailability
 * Queries the database to see if the username is already taken. 
 * Returns: a message letting the user know if the username is available or not. 
*/
router.get('/checkUsernameAvailability/:username', async (req, res) => {
  let { username } = req.params;
  try {
    const validatedInput = validateUserInput(username, "None1234!", "None@gmail.com", "1990-01-01");
    username = validatedInput.username;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
      res.json({ isAvailable: false });
    } else {
      res.json({ isAvailable: true });
    }
  } catch (err) {
    res.status(500).json({ message: 'An error occurred while checking username availability' });
  }
});

/*
 * Route: requestReset
 * Process to handle user's resetting their password.
 * Checks the users email exists, and sends them an email with a 6 digit verification code
 * Returns: A 200 indicting to go to the next page. 
*/
router.post('/requestReset', async (req, res) => {
  let { email } = req.body;

  try {
    const validatedInput = validateUserInput("none1234", "None1234!", email, "1990-01-01");
    email = validatedInput.email;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      //generates a six-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      await pool.query(
        'INSERT INTO password_reset (email, code) VALUES ($1, $2)',
        [email, code]
      );
      const emailParams = {
        user_email: email,
        user_name: email,
        user_code: code
      };

      await send(
        process.env.EMAILJS_SERVICE_KEY,
        process.env.EMAILJS_TEMPLATE_KEY,
        emailParams,
        {
          publicKey: process.env.EMAILJS_PUBLIC_KEY,
          privateKey: process.env.EMAILJS_PRIVATE_KEY,
        },
      );

      res.status(200).json({ message: 'Email Sent' });

    } else {
      res.status(404).json({ message: 'Email not found' });
    }
  } catch (err) {
    res.status(500).json({ message: 'An error occurred while requesting a password reset' });
  }
});

/*
 * Route: requestReset
 * Process to check user successfully enter correct verification code
 * Looks to see if the code is correct, and that 10 minutes have not past. 
 * Returns: A 200 indicting to go to the next page. 
*/
router.post('/verifyCode', async (req, res) => {
  let { email, code } = req.body;
  try {
    const validatedInput = validateUserInput(code, "None1234!", email, "1990-01-01");
    email = validatedInput.email;
    code = validatedInput.username; //Code is being sent as username in validateUserInput
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
    res.status(500).json({ message: 'An error occurred during verification' });
  }
});

/*
 * Route: resetPassword
 * Changes User's passwords after successful verification
*/
router.post('/resetPassword', async (req, res) => {
  let { email, newPassword } = req.body;

  try {
    const validatedInput = validateUserInput("None1234", newPassword, email, "1990-01-01");
    email = validatedInput.email;
    newPassword = validatedInput.password;
    const hashedPassword = await hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'An error occurred while resetting the password' });
  }
});


export default router;
