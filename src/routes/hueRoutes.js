const express = require('express');
const router = express.Router();
const pool = require('../db/db');

router.post('/hueAuth', async (req, res) => {
  try {
    const { ipAddress, username, clientkey } = req.body;
    const user_id = req.user.id;
    const url = `https://${ipAddress}/api`;
    const body = {
      devicetype: 'app_name#instance_name',
      generateclientkey: true,
    };
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (data[0].error && data[0].error.type === 101) {
      res.status(400).json({ message: 'Link Button not pressed on bridge' });
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

module.exports = router;
