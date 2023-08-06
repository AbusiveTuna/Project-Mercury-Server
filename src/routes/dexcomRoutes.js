import { Router } from 'express';
import { query } from '../db/db';
const router = Router();

router.post('/exchangeCode', async (req, res) => {
  const { code, user_id } = req.body;

  const body = {
    client_id: process.env.DEXCOM_CLIENT_ID,
    client_secret: process.env.DEXCOM_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: 'Https://ProjectsMercury.com/dexcomRedirect',
  };
  try {
    const response = await fetch('https://sandbox-api.dexcom.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
    });

    const data = await response.json();

    const { access_token, refresh_token } = data;
    if (access_token && refresh_token) {
      await query(
        'INSERT INTO dexcom_tokens (user_id, access_token, refresh_token) VALUES ($1, $2, $3)',
        [user_id, access_token, refresh_token]
      );
      res.status(200).json({ message: 'Tokens exchanged and stored successfully' });
    } else {
      res.status(500).json({ error: 'Failed to exchange code: No access or refresh token received' });
    }    
  } catch (error) {
    res.status(500).json({ error: 'Failed to exchange code' });
  }
});

router.get('/getDexcomData/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Get the user's access and refresh tokens from the database
    const result = await query('SELECT * FROM dexcom_tokens WHERE user_id = $1', [userId]);

    if (result.rows.length > 0) {
      const { access_token, refresh_token } = result.rows[0];
      const dexcomData = await getDexcomData(access_token, refresh_token, userId);

      if (dexcomData.error) {
        res.status(500).json({ message: 'Error fetching Dexcom data', error: dexcomData.error });
      } else {
        res.json(dexcomData);
      }
    } else {
      res.status(404).json({ message: 'No Dexcom tokens found for this user' });
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});

async function getDexcomData(accessToken, refreshToken, userId) {

  let currentTime = new Date();

  //for testing we need to use earlier data.
  currentTime.setDate(currentTime.getDate() - 14);

  // Get date and time for 3 hours earlier
  const startTime = new Date(currentTime.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Convert them to the required string format
  const formattedCurrentTime = currentTime.toISOString().split('.')[0];
  const formattedStartTime = startTime.toISOString().split('.')[0];


  try {
    const response = await fetch(`https://sandbox-api.dexcom.com/v3/users/self/egvs?startDate=${formattedStartTime}&endDate=${formattedCurrentTime}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (response.status === 401) {
      // Access token expired, refresh it
      const refreshedToken = await refreshDexcomToken(refreshToken, userId);

      if (refreshedToken.error) {
        return { error: 'Failed to refresh Dexcom token' };
      } else {
        // Retry the Dexcom API call with the new access token
        return await getDexcomData(refreshedToken, refreshToken, userId);
      }
    } else {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    return { error: 'Failed to fetch Dexcom data' };
  }
}


async function refreshDexcomToken(refreshToken, userId) {
  const body = {
    client_id: process.env.DEXCOM_CLIENT_ID,
    client_secret: process.env.DEXCOM_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    redirect_uri: 'Https://ProjectsMercury.com/dexcomRedirect',
  };

  try {
    const response = await fetch('https://sandbox-api.dexcom.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
    });

    const data = await response.json();

    const { access_token } = data;
    if (access_token) {
      // Store the new access token in the database
      await query(
        'UPDATE dexcom_tokens SET access_token = $1 WHERE user_id = $2',
        [access_token, userId]
      );

      return access_token;
    } else {
      return { error: 'Failed to refresh Dexcom token: No access token received' };
    }
  } catch (error) {
    return { error: 'Failed to refresh Dexcom token' };
  }
}

router.get('/devices/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Get the user's access and refresh tokens from the database
    const result = await query('SELECT * FROM dexcom_tokens WHERE user_id = $1', [userId]);

    if (result.rows.length > 0) {
      const { access_token, refresh_token } = result.rows[0];

      const response = await fetch('https://sandbox-api.dexcom.com/v3/users/self/devices', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });

      if (response.status === 401) {
        // Access token expired, refresh it
        const refreshedToken = await refreshDexcomToken(refresh_token, userId);

        if (refreshedToken.error) {
          res.status(500).json({ message: 'Failed to refresh Dexcom token', error: refreshedToken.error });
        } else {
          // Retry the Dexcom API call with the new access token
          const retryResponse = await fetch('https://sandbox-api.dexcom.com/v3/users/self/devices', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${refreshedToken}`
            }
          });
          const data = await retryResponse.json();
          const parsedData = data.records.map(record => ({
            transmitterGeneration: record.transmitterGeneration,
            displayDevice: record.displayDevice,
            lastUploadDate: record.lastUploadDate
          }));
          res.json(parsedData);
        }
      } else {
        const data = await response.json();
        const parsedData = data.records.map(record => ({
          transmitterGeneration: record.transmitterGeneration,
          displayDevice: record.displayDevice,
          lastUploadDate: record.lastUploadDate
        }));
        res.json(parsedData);
      }
    } else {
      res.status(404).json({ message: 'No Dexcom tokens found for this user' });
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.delete('/removeSensor/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await query('DELETE FROM dexcom_tokens WHERE user_id = $1', [userId]);

    if (result.rowCount > 0) {
      res.status(200).json({ message: 'Dexcom sensor information deleted successfully' });
    } else {
      res.status(404).json({ message: 'No Dexcom sensor information found for this user' });
    }
  } catch (err) {
    res.status(500).send('Server error');
  }
});




export default router;

