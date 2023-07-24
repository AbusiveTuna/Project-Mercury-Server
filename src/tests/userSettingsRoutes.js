const request = require('supertest');
const app = require('../index');
const pool = require('../db/db');

let testUser = {
  username: 'testuser1116',
  password: 'Testpassword123!',
  email: 'testuser1116@example.com',
  birthdate: '1990-01-01'
};

beforeAll(async () => {
  await pool.query(
    'INSERT INTO users (username, password, email, birthdate) VALUES ($1, $2, $3, $4)',
    [testUser.username, testUser.password, testUser.email, testUser.birthdate]
  );

  const result = await pool.query('SELECT id FROM users WHERE username = $1', [testUser.username]);
  testUser.id = result.rows[0].id;

  await pool.query(
    'INSERT INTO user_settings (user_id, high_threshold, low_threshold) VALUES ($1, $2, $3)',
    [testUser.id, 180, 70]
  );
});

afterAll(async () => {
  await pool.query('DELETE FROM user_settings WHERE user_id = $1', [testUser.id]);

  await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
});

describe('GET /getUserSettings/:userId', () => {
  test('should return user settings', async () => {
    const response = await request(app).get(`/getUserSettings/${testUser.id}`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('high_threshold', 180);
    expect(response.body).toHaveProperty('low_threshold', 70);
  });

  test('should return 404 if user settings not found', async () => {
    const response = await request(app).get('/getUserSettings/9999');
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('message', 'User settings not found');
  });
});

describe('POST /updateUserSettings/:userId', () => {
  test('should update user settings', async () => {
    const response = await request(app)
      .post(`/updateUserSettings/${testUser.id}`)
      .send({ highThreshold: 200, lowThreshold: 60 });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('high_threshold', 200);
    expect(response.body).toHaveProperty('low_threshold', 60);
  });

  test('should return 404 if user settings not found', async () => {
    const response = await request(app)
      .post('/updateUserSettings/9999')
      .send({ highThreshold: 200, lowThreshold: 60 });
    expect(response.statusCode).toBe(404);
    expect(response.body).toHaveProperty('message', 'User settings not found');
  });
});

