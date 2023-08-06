import express from 'express';
const router = express.Router();
import pool from '../db/db.js';
//import fetch from 'node-fetch';

router.post('/hueAuth', async (req, res) => {
  try {
    const { ipAddress, user_id ,username, clientkey} = req.body;
    if (!user_id || !username || !clientkey || !ipAddress) {
      res.status(400).json({ message: 'Missing required parameters' });
      return;
    }
    await pool.query(
      'INSERT INTO hue_tokens (user_id, username, clientkey, ip_address) VALUES ($1, $2, $3, $4)',
      [user_id, username, clientkey, ipAddress]
    );
    res.json({ message: 'Authenticated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/getHueCredentials/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT ip_address, username FROM hue_tokens WHERE user_id = $1',
      [userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/storeHueData', async (req, res) => {
  try {
    const { userId, hueData } = req.body;
    if (!userId || !hueData) {
      res.status(400).json({ message: 'Missing required parameters' });
      return;
    }

    await pool.query('BEGIN');

    // Iterate through the hueData object and insert each light into the database
    for (const lightId in hueData) {
      const light = hueData[lightId];

      // Check if the lightname already exists for the user
      const existingLight = await pool.query(
        'SELECT * FROM hue_lights WHERE user_id = $1 AND lightname = $2',
        [userId, light.name]
      );

      // If the lightname does not exist, insert it into the database
      if (existingLight.rowCount === 0) {
        await pool.query(
          'INSERT INTO hue_lights (user_id, lightname, rid, rtype) VALUES ($1, $2, $3, $4)',
          [userId, light.name, lightId, light.type]
        );
      }
    }

    await pool.query('COMMIT');

    res.json({ message: 'Data stored successfully' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.get('/getHueDevices/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ message: 'Missing user ID' });
      return;
    }

    const result = await pool.query(
      'SELECT lightname FROM hue_lights WHERE user_id = $1',
      [userId]
    );

    const devices = result.rows.map(row => row.lightname);

    res.json(devices);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


export default router;
