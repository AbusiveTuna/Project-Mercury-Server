const request = require('supertest');
const express = require('express');
const app = express();
const router = require('../routes/dexcomRoutes');
const pool = require('../db/db');
app.use(express.json());
app.use(router);

jest.mock('node-fetch');
const fetch = require('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('POST /exchangeCode', () => {
  let userId;

  beforeEach(async () => {
    // Create a test user
    const res = await pool.query(
      'INSERT INTO users (username, password, email, birthdate) VALUES ($1, $2, $3, $4) RETURNING id',
      ['testuserx', 'testpassx', 'testx@example.com', '2000-01-01']
    );
    userId = res.rows[0].id;
  });

  afterEach(async () => {
    // Delete the test user and their Dexcom tokens
    await pool.query('DELETE FROM dexcom_tokens WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  // it('should exchange code and store tokens', async () => {
  //   const res = await request(app)
  //     .post('/exchangeCode')
  //     .send({ code: 'mockCode', user_id: userId });
  //   expect(res.statusCode).toEqual(200);
  //   expect(res.body).toEqual({ message: 'Tokens exchanged and stored successfully' });
  // });

  // it('should handle error when exchanging code', async () => {
  //   const res = await request(app)
  //     .post('/exchangeCode')
  //     .send({ code: 'mockCode', user_id: userId });
  //   expect(res.statusCode).toEqual(500);
  //   expect(res.body).toEqual({ error: 'Failed to exchange code' });
  // });

  it('should exchange code and store tokens', async () => {
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'mockAccessToken', refresh_token: 'mockRefreshToken' }))
    );
  
    const res = await request(app)
      .post('/exchangeCode')
      .send({ code: 'mockCode', user_id: userId });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ message: 'Tokens exchanged and stored successfully' });
  });
  
  it('should handle error when exchanging code', async () => {
    fetch.mockRejectedValueOnce(new Error('Fetch error'));
  
    const res = await request(app)
      .post('/exchangeCode')
      .send({ code: 'mockCode', user_id: userId });
    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({ error: 'Failed to exchange code' });
  });

  
});

describe('GET /getDexcomData/:userId', () => {
  let userId;

  beforeEach(async () => {
    const res = await pool.query(
      'INSERT INTO users (username, password, email, birthdate) VALUES ($1, $2, $3, $4) RETURNING id',
      ['testuserx', 'testpassx', 'testx@example.com', '2000-01-01']
    );
    userId = res.rows[0].id;

    await pool.query(
      'INSERT INTO dexcom_tokens (user_id, access_token, refresh_token) VALUES ($1, $2, $3)',
      [userId, 'mockAccessToken', 'mockRefreshToken']
    );
  });

  afterEach(async () => {
    await pool.query('DELETE FROM dexcom_tokens WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  });

  it('should get Dexcom data for a user', async () => {
    const res = await request(app)
      .get(`/getDexcomData/${userId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ data: 'mockDexcomData' });
  });

  it('should handle error when getting Dexcom data', async () => {
    const res = await request(app)
      .get(`/getDexcomData/${userId}`);
    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({ message: 'Error fetching Dexcom data', error: 'mockError' });
  });

  it('should return 404 if no Dexcom tokens found for user', async () => {
    const res = await request(app)
      .get(`/getDexcomData/${userId}`);
    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'No Dexcom tokens found for this user' });
  });
});
