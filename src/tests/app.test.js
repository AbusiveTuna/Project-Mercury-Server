const request = require('supertest');
const app = require('../index');

test('root route returns "Hello World!"', async () => {
  const response = await request(app).get('/');
  expect(response.text).toBe('Hello World!');
});
