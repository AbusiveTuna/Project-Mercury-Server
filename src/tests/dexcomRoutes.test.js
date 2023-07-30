const request = require('supertest');
const express = require('express');
const router = require('../routes/dexcomRoutes');
const pool = require('../db/db');

const app = express();
app.use(express.json());
app.use('/', router);

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ access_token: 'access_token', refresh_token: 'refresh_token' }),
  })
);

jest.mock('../db/db', () => ({
  query: jest.fn(() => Promise.resolve({ rows: [{ access_token: 'access_token', refresh_token: 'refresh_token' }] })),
}));

describe('GET /devices/:userId', () => {
  it('should return device data', async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ records: [] }),
        status: 200,
      })
    );

    const res = await request(app).get('/devices/userId');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
  });

  it('should refresh token and retry if access token expired', async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 401,
      })
    );
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ access_token: 'new_access_token' }),
        status: 200,
      })
    );
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ records: [] }),
        status: 200,
      })
    );
  
    const res = await request(app).get('/devices/userId');
  
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
  });
  

  it('should return 500 if token refresh failed', async () => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        status: 401,
      })
    );
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ error: 'Failed to refresh Dexcom token: No access token received' }),
      })
    );

    const res = await request(app).get('/devices/userId');

    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({ message: 'Failed to refresh Dexcom token', error: 'Failed to refresh Dexcom token: No access token received' });
  });
});

describe('DELETE /removeSensor/:userId', () => {
  it('should delete sensor data', async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });

    const res = await request(app).delete('/removeSensor/userId');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ message: 'Dexcom sensor information deleted successfully' });
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM dexcom_tokens WHERE user_id = $1', ['userId']);
  });

  it('should return 404 if no sensor data is found', async () => {
    pool.query.mockResolvedValue({ rowCount: 0 });

    const res = await request(app).delete('/removeSensor/userId');

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'No Dexcom sensor information found for this user' });
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM dexcom_tokens WHERE user_id = $1', ['userId']);
  });

  it('should return 500 if an error occurs', async () => {
    pool.query.mockImplementationOnce(() =>
      Promise.reject(new Error('Database error'))
    );

    const res = await request(app).delete('/removeSensor/userId');

    expect(res.statusCode).toEqual(500);
    expect(res.text).toEqual('Server error');
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM dexcom_tokens WHERE user_id = $1', ['userId']);
  });

  describe('GET /getDexcomData/:userId', () => {
  
    it('should return Dexcom data if tokens are found for the user', async () => {
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({ data: 'data' }),
          status: 200,
        })
      );
  
      const res = await request(app).get('/getDexcomData/userId');
  
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ data: 'data' });
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM dexcom_tokens WHERE user_id = $1', ['userId']);
    });
  });

  describe('POST /exchangeCode', () => {
  
    it('should return 500 if no access or refresh token is received', async () => {
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({}),
        })
      );
  
      const res = await request(app)
        .post('/exchangeCode')
        .send({ code: 'code', user_id: 'user_id' });
  
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ error: 'Failed to exchange code: No access or refresh token received' });
    });
  
    it('should return 500 if an error occurs during fetching', async () => {
      global.fetch.mockImplementationOnce(() =>
        Promise.reject(new Error('Fetch error'))
      );
  
      const res = await request(app)
        .post('/exchangeCode')
        .send({ code: 'code', user_id: 'user_id' });
  
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ error: 'Failed to exchange code: No access or refresh token received' });
    });
  });

});
