const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const AuthController = require('../../src/controllers/AuthController');
const { generateToken } = require('../../src/middleware/auth');

const User = mongoose.model('User');

// Setup Express app for testing
const app = express();
app.use(express.json());

// Test routes
app.post('/auth/register', AuthController.register);
app.post('/auth/login', AuthController.login);
app.get('/auth/profile', require('../../src/middleware/auth').authenticateToken, AuthController.getProfile);

describe('AuthController', () => {
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not register user with invalid email', async () => {
      const userData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email')
          })
        ])
      );
    });

    it('should not register user with duplicate email', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Try to register second user with same email
      const duplicateUser = {
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password456'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(duplicateUser)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'User already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      await user.save();
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should not login inactive user', async () => {
      // Deactivate user
      await User.findOneAndUpdate(
        { email: 'test@example.com' },
        { isActive: false }
      );

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Account disabled');
    });
  });

  describe('GET /auth/profile', () => {
    let token;
    let user;

    beforeEach(async () => {
      // Create test user and generate token
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      await user.save();
      token = generateToken(user);
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.user.username).toBe(user.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid token');
    });
  });
});