import { Router } from 'express';
import { query } from '../db/db.js';
const router = Router();


router.get('/getUserSettings/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'User settings not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred while retrieving user settings' });
  }
});

router.post('/updateUserSettings/:userId', async (req, res) => {
  const { userId } = req.params;
  const { highThreshold, lowThreshold } = req.body;

  try {
    const result = await query(
      'UPDATE user_settings SET high_threshold = $1, low_threshold = $2 WHERE user_id = $3 RETURNING *',
      [highThreshold, lowThreshold, userId]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: 'User settings not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'An error occurred while updating user settings' });
  }
});

export default router;

