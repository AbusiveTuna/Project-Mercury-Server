const request = require('supertest');
const express = require('express');
const app = express();
const router = require('../routes/dexcomRoutes');
app.use(express.json());
app.use(router);

describe('POST /exchangeCode', () => {
  it('should exchange code and store tokens', async () => {
    const res = await request(app)
      .post('/exchangeCode')
      .send({ code: 'mockCode', user_id: 'mockUserId' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ message: 'Tokens exchanged and stored successfully' });
  });

  it('should handle error when exchanging code', async () => {
    const res = await request(app)
      .post('/exchangeCode')
      .send({ code: 'mockCode', user_id: 'mockUserId' });
    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({ error: 'Failed to exchange code' });
  });
});

describe('GET /getDexcomData/:userId', () => {
  it('should get Dexcom data for a user', async () => {
    const res = await request(app)
      .get('/getDexcomData/mockUserId');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ data: 'mockDexcomData' });
  });

  it('should handle error when getting Dexcom data', async () => {
    const res = await request(app)
      .get('/getDexcomData/mockUserId');
    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({ message: 'Error fetching Dexcom data', error: 'mockError' });
  });

  it('should return 404 if no Dexcom tokens found for user', async () => {
    const res = await request(app)
      .get('/getDexcomData/mockUserId');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'No Dexcom tokens found for this user' });
  });
});

