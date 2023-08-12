
import request from 'supertest';
import express from 'express';
import router from '../routes/hueRoutes';
import pool from '../db/db';

const app = express();
app.use(express.json());
app.use('/', router);

describe('Hue Routes', () => {
  describe('POST /hueAuth', () => {

    /* 
    * Test Name: Authenticate Hue Bridge
    * Unit Test ID: SUT29
    * Description: Authenticates the user's hue bridge to their account
    */
    it('should authenticate successfully', async () => {
      const res = await request(app)
        .post('/hueAuth')
        .send({ ipAddress: '192.168.1.1', user_id: 1, username: 'user', clientkey: 'key' });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ message: 'Authenticated successfully' });
    });

      /* 
  * Test Name: Missing hue Parameters
  * Unit Test ID: SUT30
  * Description: Tests for missing parameters during hue authentication call
  */
    it('should return 400 if missing parameters', async () => {
      const res = await request(app).post('/hueAuth').send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ message: 'Missing required parameters' });
    });
  });

  describe('GET /getHueCredentials/:userId', () => {
    /* 
    * Test Name: Successful Hue Credentials Retrieval
    * Unit Test ID: SUT31
    * Description: Tests for successful retrieval of Hue credentials
    */
    it('should return Hue credentials', async () => {
      const res = await request(app).get('/getHueCredentials/1');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('ip_address');
      expect(res.body).toHaveProperty('username');
    });
  });

  describe('POST /storeHueData', () => {
    /* 
    * Test Name: Store Hue Data
    * Unit Test ID: SUT32
    * Description: Tests for successful storage of Hue data
    */
    it('should store Hue data successfully', async () => {
      const hueData = { '1': { name: 'Light 1', type: 'Type 1' } };
      const res = await request(app)
        .post('/storeHueData')
        .send({ userId: 1, hueData });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ message: 'Data stored successfully' });
    });

    /* 
    * Test Name: Bad Hue Data Storage
    * Unit Test ID: SUT33
    * Description: Tests for bad Hue data storage with missing parameters
    */
    it('should return 400 if missing parameters', async () => {
      const res = await request(app).post('/storeHueData').send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ message: 'Missing required parameters' });
    });
  });

  describe('GET /getHueDevices/:userId', () => {
    /* 
    * Test Name: Test Hue Device Retrieval
    * Unit Test ID: SUT34
    * Description: Tests for successful retrieval of Hue devices
    */
    it('should return Hue devices', async () => {
      // Assuming there is a user with userId = 1 in the test database
      const res = await request(app).get('/getHueDevices/1');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    /* 
    * Test Name: No user ID for Hue Device Retrieval
    * Unit Test ID: SUT35
    * Description: Tests when there is no user ID for Hue device retrieval
    */
    it('should return 400 if missing user ID', async () => {
      const res = await request(app).get('/getHueDevices/');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({ message: 'Missing user ID' });
    });
  });
});

afterAll(() => {
  pool.end();
});
