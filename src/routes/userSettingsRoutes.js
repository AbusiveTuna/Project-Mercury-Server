import { Router } from 'express';
import pool from '../db/db.js';
const router = Router();


router.get('/getUserSettings/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // Create new record with default values
      const defaultHighThreshold = 300; // Set default value
      const defaultLowThreshold = 60; // Set default value
      const insertResult = await pool.query(
        'INSERT INTO user_settings (user_id, high_threshold, low_threshold) VALUES ($1, $2, $3) RETURNING *',
        [userId, defaultHighThreshold, defaultLowThreshold]
      );
      res.json(insertResult.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ message: 'An error occurred while retrieving user settings' });
  }
});


router.post('/updateUserSettings/:userId', async (req, res) => {
  const { userId } = req.params;
  const { highThreshold, lowThreshold } = req.body;

  try {
    const result = await pool.query(
      'UPDATE user_settings SET high_threshold = $1, low_threshold = $2 WHERE user_id = $3 RETURNING *',
      [highThreshold, lowThreshold, userId]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      const insertResult = await pool.query(
        'INSERT INTO user_settings (user_id, high_threshold, low_threshold) VALUES ($1, $2, $3) RETURNING *',
        [userId, highThreshold, lowThreshold]
      );
      res.json(insertResult.rows[0]);
    }
  } catch (err) {
    res.status(500).json({ message: 'An error occurred while updating user settings' });
  }
});


export default router;

