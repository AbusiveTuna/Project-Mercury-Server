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

