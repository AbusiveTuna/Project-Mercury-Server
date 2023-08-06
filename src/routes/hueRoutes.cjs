const express = require('express');
const router = express.Router();
const v3 = require('node-hue-api').v3;
const LightState = v3.lightStates.LightState;

let pool;

import('../db/db.js').then(db => {
  pool = db;
});

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

router.get('/getHueTokens/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM hue_tokens WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      res.status(400).json({ message: 'No Hue tokens found for this user' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.post('/updateHueDevices/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tokenResult = await pool.query('SELECT * FROM hue_tokens WHERE user_id = $1', [userId]);
    if (tokenResult.rows.length === 0) {
      res.status(400).json({ message: 'No Hue tokens found for this user' });
      return;
    }
    const { ip_address, username } = tokenResult.rows[0];

    // Create a new API instance
    const api = await v3.api.createLocal(ip_address).connect(username);

    // Get all lights
    const lights = await api.lights.getAll();

    // Update the database with the light details
    await Promise.all(
      lights.map((light) =>
        pool.query(
          'INSERT INTO hue_lights (user_id, lightname, rid, rtype) VALUES ($1, $2, $3, $4) ON CONFLICT (rid) DO UPDATE SET lightname=$2, rtype=$4',
          [userId, light.name, light.id, 'Light']
        )
      )
    );

    res.json({ message: 'Device list updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.get('/getHueDevices/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tokenResult = await pool.query('SELECT * FROM hue_tokens WHERE user_id = $1', [userId]);
    if (tokenResult.rows.length === 0) {
      res.status(400).json({ message: 'No Hue tokens found for this user' });
      return;
    }
    const { ip_address, username } = tokenResult.rows[0];

    // Create a new API instance
    const api = await v3.api.createLocal(ip_address).connect(username);

    // Get all lights
    const lights = await api.lights.getAll();

    // Extract the light names
    const devices = lights.map((light) => light.name);

    res.json(devices);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


router.post('/toggleHueLight', async (req, res) => {
  try {
    const { user_id, lightname, on } = req.body;
    const result = await pool.query(
      'SELECT * FROM hue_lights WHERE lightname = $1 AND user_id = $2',
      [lightname, user_id]
    );
    if (result.rows.length === 0) {
      res.status(400).json({ message: 'No Hue light found for this user' });
      return;
    }
    const { rid } = result.rows[0];
    const tokenResult = await pool.query(
      'SELECT * FROM hue_tokens WHERE user_id = $1',
      [user_id]
    );
    if (tokenResult.rows.length === 0) {
      res.status(400).json({ message: 'No Hue tokens found for this user' });
      return;
    }
    const { ip_address, username } = tokenResult.rows[0];

    // Create a new API instance
    const api = await v3.api.createLocal(ip_address).connect(username);

    // Create a new light state
    const lightState = new LightState().on(on);

    // Set the light state
    await api.lights.setLightState(rid, lightState);

    res.json({ message: `Light ${on ? 'turned on' : 'turned off'} successfully` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


module.exports = router;
