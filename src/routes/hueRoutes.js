import express from 'express';
const router = express.Router();
import pool from '../db/db.js';
import fetch from 'node-fetch';

router.post('/hueAuth', async (req, res) => {
  try {
    const { ipAddress, user_id } = req.body;
    const url = `http://${ipAddress}/api`;
    console.log(url);
    const body = {
      devicetype: 'projectmercury#webportal',
      generateclientkey: true,
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    console.log(response);
    const data = await response.json();
    console.log(response);
    console.log(data);
    if (data[0].error && data[0].error.type === 101) {
      res.status(400).json({ message: 'Link Button not pressed on bridge' });
      return;
    }

    const username = data[0].success.username;
    const clientkey = data[0].success.clientkey;

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

router.post('/updateHueDevices/:userId', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM hue_tokens WHERE user_id = $1',
      [user_id]
    );
    if (result.rows.length === 0) {
      res.status(400).json({ message: 'No Hue tokens found for this user' });
      return;
    }
    const { username, ip_address } = result.rows[0];
    const url = `https://${ip_address}/clip/v2/resource/device`;
    const response = await fetch(url, {
      headers: {
        'hue-application-key': username,
      },
    });
    const data = await response.json();
    const devices = data.data.map((device) => ({
      lightname: device.metadata.name,
      rid: device.services[0].rid,
      rtype: device.services[0].rtype,
    }));
    await Promise.all(
      devices.map((device) =>
        pool.query(
          'INSERT INTO hue_lights (user_id, lightname, rid, rtype) VALUES ($1, $2, $3, $4) ON CONFLICT (rid) DO UPDATE SET lightname=$2, rtype=$4',
          [user_id, device.lightname, device.rid, device.rtype]
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
    const { user_id } = req.params;
    const result = await pool.query(
      'SELECT * FROM hue_lights WHERE user_id = $1',
      [user_id]
    );
    if (result.rows.length === 0) {
      res.status(400).json({ message: 'No Hue devices found for this user' });
      return;
    }
    const devices = result.rows.map((device) => device.lightname);
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
    const { rid, rtype } = result.rows[0];
    const tokenResult = await pool.query(
      'SELECT * FROM hue_tokens WHERE user_id = $1',
      [user_id]
    );
    if (tokenResult.rows.length === 0) {
      res.status(400).json({ message: 'No Hue tokens found for this user' });
      return;
    }
    const { ip_address, username: hueUsername } = tokenResult.rows[0];
    const url = `https://${ip_address}/clip/v2/resource/${rtype}/${rid}`;
    const body = {
      on: {
        on,
      },
    };
    await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'hue-application-key': hueUsername,
      },
      body: JSON.stringify(body),
    });
    res.json({ message: `Light ${on ? 'turned on' : 'turned off'} successfully` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;
