import request from 'supertest';
import express from 'express';
import router from '../routes/dexcomRoutes';
import pool from '../db/db';

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

  /* 
  * Test Name: Device Data Returned
  * Unit Test ID: SUT20
  * Description: Tests grabbing Device Data from dexcom
  */
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

  /* 
  * Test Name: Refresh Dexcom Tokens
  * Unit Test ID: SUT21
  * Description: Tests refreshing Dexcom Tokens
  */
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

    /* 
    * Test Name: No Dexcom Tokens Found for user
    * Unit Test ID: SUT39
    * Description: Tests when no Dexcom tokens are found for the user
    */
    it('should return 404 if no Dexcom tokens are found', async () => {
      pool.query.mockResolvedValue({ rows: [] });
  
      const res = await request(app).get('/devices/userId');
  
      expect(res.statusCode).toEqual(404);
      expect(res.body).toEqual({ message: 'No Dexcom tokens found for this user' });
    });
  
  /* 
  * Test Name: Refresh token failure
  * Unit Test ID: SUT22
  * Description: Tests failure to refresh token
  */
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

  /* 
  * Test Name: Delete Sensor from User Account
  * Unit Test ID: SUT23
  * Description: Tests successful deletion of sensor from user account
  */
  it('should delete sensor data', async () => {
    pool.query.mockResolvedValue({ rowCount: 1 });

    const res = await request(app).delete('/removeSensor/userId');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ message: 'Dexcom sensor information deleted successfully' });
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM dexcom_tokens WHERE user_id = $1', ['userId']);
  });

  /* 
  * Test Name: No sensor data found
  * Unit Test ID: SUT24
  * Description: Tests failure to find sensor data
  */
  it('should return 404 if no sensor data is found', async () => {
    pool.query.mockResolvedValue({ rowCount: 0 });

    const res = await request(app).delete('/removeSensor/userId');

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'No Dexcom sensor information found for this user' });
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM dexcom_tokens WHERE user_id = $1', ['userId']);
  });

  /* 
  * Test Name: Failure to delete sensor data
  * Unit Test ID: SUT25
  * Description: Tests failure to delete sensor data
  */
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
  
    /* 
    * Test Name: Dexcom Token Return
    * Unit Test ID: SUT26
    * Description: Tests successful return of Dexcom token
    */
    it('should return Dexcom data if tokens are found for the user', async () => {
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({ data: 'data' }),
          status: 200,
        })
      );
  
      const res = await request(app).get('/getDexcomData/userId');
  
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ data: 'data' });
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM dexcom_tokens WHERE user_id = $1', ['userId']);
    });

    /* 
    * Test Name: No Dexcom Tokens Found
    * Unit Test ID: SUT37
    * Description: Tests when no Dexcom tokens are found for the user
    */
  it('should return 404 if no Dexcom tokens are found', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/getDexcomData/userId');

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'No Dexcom tokens found for this user' });
  });

    /* 
    * Test Name: Error Fetching Dexcom Data
    * Unit Test ID: SUT38
    * Description: Tests when an error occurs while fetching Dexcom data
    */
    it('should return 500 if an error occurs while fetching Dexcom data', async () => {
      global.fetch.mockImplementationOnce(() =>
        Promise.reject(new Error('Fetch error'))
      );

      const res = await request(app).get('/getDexcomData/userId');

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({ message: 'Error fetching Dexcom data', error: 'Failed to fetch Dexcom data' });
    });


  });

  describe('POST /exchangeCode', () => {
  
    /* 
    * Test Name: Exchange Code Error
    * Unit Test ID: SUT27
    * Description: Tests failure to exchange code
    */
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
  
    /* 
    * Test Name: Exchange code fetching error
    * Unit Test ID: SUT28
    * Description: Tests failure to fetch code
    */
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

    /* 
  * Test Name: Successful Code Exchange
  * Unit Test ID: SUT36
  * Description: Tests successful code exchange
  */
    it('should exchange code successfully', async () => {
      global.fetch.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({ access_token: 'access_token', refresh_token: 'refresh_token' }),
        })
      );
  
      const res = await request(app)
        .post('/exchangeCode')
        .send({ code: 'code', user_id: 'user_id' });
  
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ message: 'Tokens exchanged and stored successfully' });
    });
  });

