const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const ClientController = require('../../src/controllers/ClientController');
const { generateToken } = require('../../src/middleware/auth');
const { sanitizeInput, validateClient } = require('../../src/middleware/sanitizer');

const Client = mongoose.model('Client');
const User = mongoose.model('User');

// Setup Express app for testing
const app = express();
app.use(express.json());

// Test routes
app.get('/client', require('../../src/middleware/auth').authenticateToken, ClientController.index);
app.get('/client/:id', require('../../src/middleware/auth').authenticateToken, ClientController.show);
app.post('/client',
  require('../../src/middleware/auth').authenticateToken,
  sanitizeInput,
  validateClient,
  ClientController.store
);
app.put('/client/:id',
  require('../../src/middleware/auth').authenticateToken,
  sanitizeInput,
  validateClient,
  ClientController.update
);
app.delete('/client/:id',
  require('../../src/middleware/auth').authenticateToken,
  require('../../src/middleware/auth').authorizeRoles('admin'),
  ClientController.destroy
);

describe('ClientController', () => {
  let token;
  let adminToken;
  let user;
  let adminUser;

  beforeEach(async () => {
    // Create test users
    user = new User({
      username: 'testuser',
      email: 'user@example.com',
      password: 'password123',
      role: 'user'
    });
    await user.save();
    token = generateToken(user);

    adminUser = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });
    await adminUser.save();
    adminToken = generateToken(adminUser);
  });

  describe('GET /client', () => {
    beforeEach(async () => {
      // Create test clients
      const clients = [
        {
          code: 1,
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          address: '123 Main St',
          status: 'active',
          birthDate: new Date('1990-01-01')
        },
        {
          code: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '0987654321',
          address: '456 Oak Ave',
          status: 'active',
          birthDate: new Date('1985-05-15')
        }
      ];
      await Client.insertMany(clients);
    });

    it('should get all clients with authentication', async () => {
      const response = await request(app)
        .get('/client')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should not get clients without authentication', async () => {
      const response = await request(app)
        .get('/client')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/client?page=1&limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });
  });

  describe('POST /client', () => {
    it('should create a new client with valid data', async () => {
      const clientData = {
        code: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        address: '123 Main St',
        status: 'active',
        birthDate: '1990-01-01'
      };

      const response = await request(app)
        .post('/client')
        .set('Authorization', `Bearer ${token}`)
        .send(clientData)
        .expect(201);

      expect(response.body).toHaveProperty('name', clientData.name);
      expect(response.body).toHaveProperty('email', clientData.email);
      expect(response.body).toHaveProperty('_id');
    });

    it('should not create client without authentication', async () => {
      const clientData = {
        code: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };

      const response = await request(app)
        .post('/client')
        .send(clientData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });

    it('should not create client with invalid data', async () => {
      const clientData = {
        name: 'John Doe',
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/client')
        .set('Authorization', `Bearer ${token}`)
        .send(clientData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should not create client with duplicate email', async () => {
      const clientData = {
        code: 1,
        name: 'John Doe',
        email: 'john@example.com'
      };

      // Create first client
      await request(app)
        .post('/client')
        .set('Authorization', `Bearer ${token}`)
        .send(clientData)
        .expect(201);

      // Try to create second client with same email
      const duplicateClient = {
        code: 2,
        name: 'Jane Doe',
        email: 'john@example.com'
      };

      const response = await request(app)
        .post('/client')
        .set('Authorization', `Bearer ${token}`)
        .send(duplicateClient)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Client already exists');
    });
  });

  describe('GET /client/:id', () => {
    let clientId;

    beforeEach(async () => {
      const client = new Client({
        code: 1,
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active'
      });
      const savedClient = await client.save();
      clientId = savedClient._id.toString();
    });

    it('should get client by id with authentication', async () => {
      const response = await request(app)
        .get(`/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', clientId);
      expect(response.body).toHaveProperty('name', 'John Doe');
    });

    it('should return 404 for non-existent client', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/client/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Client not found');
    });
  });

  describe('PUT /client/:id', () => {
    let clientId;

    beforeEach(async () => {
      const client = new Client({
        code: 1,
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active'
      });
      const savedClient = await client.save();
      clientId = savedClient._id.toString();
    });

    it('should update client with valid data', async () => {
      const updateData = {
        code: 1,
        name: 'John Updated',
        email: 'john@example.com'
      };

      const response = await request(app)
        .put(`/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'John Updated');
    });

    it('should return 404 for non-existent client', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = {
        code: 1,
        name: 'Updated',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put(`/client/${nonExistentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Client not found');
    });
  });

  describe('DELETE /client/:id', () => {
    let clientId;

    beforeEach(async () => {
      const client = new Client({
        code: 1,
        name: 'John Doe',
        email: 'john@example.com',
        status: 'active'
      });
      const savedClient = await client.save();
      clientId = savedClient._id.toString();
    });

    it('should delete client with admin role', async () => {
      const response = await request(app)
        .delete(`/client/${clientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Client deleted successfully');

      // Verify client is deleted
      const deletedClient = await Client.findById(clientId);
      expect(deletedClient).toBeNull();
    });

    it('should not delete client with user role', async () => {
      const response = await request(app)
        .delete(`/client/${clientId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Forbidden');
    });

    it('should return 404 for non-existent client', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/client/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Client not found');
    });
  });
});