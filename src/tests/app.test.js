const request = require('supertest');
const app = require('../index');
const pool = require('../db/db');
const emailjs = require('@emailjs/nodejs');
const bcrypt = require('bcryptjs');

let testUser = {
    username: 'testuser',
    password: 'Testpassword123!',
    email: 'testuser@example.com',
    birthdate: '1990-01-01'
};

beforeEach(async () => {
    await request(app)
        .post('/addUser')
        .send(testUser);
});

afterEach(async () => {
    // Delete user after each test
    await pool.query('DELETE FROM users WHERE username = $1', [testUser.username]);
});

//used as a basic test to ensure things are running.
test('root route returns "Hello World!"', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Hello World!');
});

/* 
* Test Name: Valid User Registration
* Unit Test ID: SUT1
* Description: Tests when a user submits a valid user forum
*/

test('Valid Add User Test', async () => {
    const response = await request(app)
        .post('/addUser')
        .send({
            username: 'testuser2222',
            password: 'Testpassword123!',
            email: 'testuser2222@example.com',
            birthdate: '1990-01-01'
        });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('username', 'testuser2222');

    //need to ensure that test user is deleted
    await pool.query('DELETE FROM users WHERE username = $1', ['testuser2222']);
});

/* 
* Test Name: Invalid User Registration
* Unit Test ID: SUT2
* Description: Tests when a user submits an invalid user forum
*/

test('Invalid Add User Test', async () => {
    const response = await request(app)
        .post('/addUser')
        .send({
            username: 'tu',
            password: 'tp',
            email: 'invalidemail',
            birthdate: 'notadate'
        });
    expect(response.statusCode).toBe(500);
});

/* 
* Test Name: Valid Login
* Unit Test ID: SUT3
* Description: Tests a valid username/password in login requests
*/

test('Valid Login Test', async () => {
    const response = await request(app)
        .post('/login')
        .send({
            username: 'testuser',
            password: 'Testpassword123!'
        });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Login successful');
});

/* 
* Test Name: Invalid Login
* Unit Test ID: SUT4
* Description: Tests an incorrect username/password in login requests
*/

test('Invalid Login Test', async () => {
    const response = await request(app)
        .post('/login')
        .send({
            username: 'testuser',
            password: 'badLogin123!'
        });
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('message', 'Invalid username or password');
});

/* 
* Test Name: Username Available
* Unit Test ID: SUT5
* Description: Tests a non-existent name during username lookup
*/

test('Username Is Available', async () => {
    const username = 'availableTest';
    const response = await request(app).get(`/checkUsernameAvailability/${username}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.isAvailable).toBe(true);
});

/* 
* Test Name: Unavailable username
* Unit Test ID: SUT6
* Description: Tests an already used username in username lookup
*/

test('Username Is Unavailable', async () => {
    const username = 'testuser';
    const response = await request(app).get(`/checkUsernameAvailability/${username}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.isAvailable).toBe(false);
});

/* 
* Test Name: Username Lookup Error Handling
* Unit Test ID: SUT7
* Description: Tests for errors during username lookup
*/

test('Username Availability error handling', async () => {
    const username = 'in';
    const response = await request(app).get(`/checkUsernameAvailability/${username}`);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('An error occurred while checking username availability');
});

// Mock emailjs.send function
jest.mock('@emailjs/nodejs', () => ({
    send: jest.fn().mockImplementation(() => Promise.resolve()),
}));

describe('Request Reset Routes', () => {
    beforeAll(async () => {
        await pool.query("INSERT INTO users (username, password, email, birthdate) VALUES ('test', 'password', 'test@example.com', '2000-01-01')");
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE username = 'test'");
    });

    /* 
    * Test Name: Valid Email In Password Request
    * Unit Test ID: SUT8
    * Description: Tests a valid email while requesting password reset
    */

    it('Valid Sent Email', async () => {
        const res = await request(app)
            .post('/requestReset')
            .send({ email: 'test@example.com' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ message: 'Email Sent' });
        expect(emailjs.send).toHaveBeenCalled();
    });

    /* 
    * Test Name: Invalid Email In Password Request
    * Unit Test ID: SUT9
    * Description: Tests an invalid email while requesting password reset
    */

    it('Email doesnt exist test', async () => {
        const res = await request(app)
            .post('/requestReset')
            .send({ email: 'nonexistent@example.com' });
        expect(res.statusCode).toEqual(404);
        expect(res.body).toEqual({ message: 'Email not found' });
    });

    /* 
    * Test Name: EmailJS Error handling
    * Unit Test ID: SUT10
    * Description: Tests for when EmailJS is unable to respond
    */

    it('emailJS server error test', async () => {
        const res = await request(app)
            .post('/requestReset')
            .send({ email: 'invalid-email' });
        expect(res.statusCode).toEqual(500);
        expect(res.body).toEqual({ message: 'An error occurred while requesting a password reset' });
    });
});

describe('Verify Code Routes', () => {
    const code = '123456';

    beforeAll(async () => {
        await pool.query("INSERT INTO users (username, password, email, birthdate) VALUES ('test', 'password', 'test@example.com', '2000-01-01')");
        await pool.query(`INSERT INTO password_reset (email, code) VALUES ('test@example.com', '${code}')`);
    });

    afterAll(async () => {
        await pool.query("DELETE FROM password_reset WHERE email = 'test@example.com'");
        await pool.query("DELETE FROM users WHERE username = 'test'");
    });

    /* 
    * Test Name: Valid Verification Code
    * Unit Test ID: SUT11
    * Description: Tests a valid verification code against the server
    */

    it('Valid Verification Code', async () => {
        const res = await request(app)
            .post('/verifyCode')
            .send({ email: 'test@example.com', code });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ message: 'Verification successful' });
    });

    /* 
    * Test Name: Incorrect Verification Code
    * Unit Test ID: SUT12
    * Description: Tests for response from server with an invalid code
    */

    it('Incorrect Verification Code', async () => {
        const res = await request(app)
            .post('/verifyCode')
            .send({ email: 'test@example.com', code: 'wrongcode' });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toEqual({ message: 'Verification code incorrect' });
    });

    /* 
    * Test Name: Verify Code Error Handling
    * Unit Test ID: SUT13
    * Description: Tests errors during verification code processing
    */

    it('Verification Code Server Error', async () => {
        const res = await request(app)
            .post('/verifyCode')
            .send({ email: 'invalid-email', code });
        expect(res.statusCode).toEqual(500);
        expect(res.body).toEqual({ message: 'An error occurred during verification' });
    });
});

describe('POST /resetPassword', () => {
    const password = 'password';

    beforeAll(async () => {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query("INSERT INTO users (username, password, email, birthdate) VALUES ('test', $1, 'test@example.com', '2000-01-01')", [hashedPassword]);
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE username = 'test'");
    });

    /* 
    * Test Name: Successful password reset
    * Unit Test ID: SUT14
    * Description: Tests for successful password reset in /resetPassword
    */

    it('should return 200 and reset the password if the email is correct', async () => {
        const res = await request(app)
            .post('/resetPassword')
            .send({ email: 'test@example.com', newPassword: 'newpassword' });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toEqual({ message: 'Password reset successful' });

        const result = await pool.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
        const user = result.rows[0];
        const match = await bcrypt.compare('newpassword', user.password);
        expect(match).toBe(true);
    });

    /* 
    * Test Name: Reset Password Error handling
    * Unit Test ID: SUT15
    * Description: Tests errors during reset password processing
    */

    it('should return 500 if there is a server error', async () => {
        const res = await request(app)
            .post('/resetPassword')
            .send({ email: 'invalid-email', newPassword: 'newpassword' });
        expect(res.statusCode).toEqual(500);
        expect(res.body).toEqual({ message: 'An error occurred while resetting the password' });
    });
});
