# API Documentation

**Angular-Node.js CRUD Application Backend API**

Version: 1.0.0
Base URL: `http://localhost:3001/api`
Environment: Development

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Data Models](#data-models)
5. [API Endpoints](#api-endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Client Management Endpoints](#client-management-endpoints)
   - [Health Check Endpoint](#health-check-endpoint)
6. [Error Responses](#error-responses)
7. [Example Requests](#example-requests)

---

## Overview

This API provides a complete backend solution for managing clients and user authentication. It's built with Express.js, MongoDB, and includes comprehensive security features like JWT authentication, input validation, rate limiting, and XSS protection.

### Key Features
- JWT-based authentication with role-based access control
- Input validation and sanitization
- Rate limiting with different limits for auth endpoints
- Pagination support for client listings
- Comprehensive error handling
- Security headers via Helmet
- CORS configuration
- Request logging

---

## Authentication

The API uses **JWT (JSON Web Tokens)** for authentication. Most endpoints require authentication except for registration, login, and health check.

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

### Token Expiration
- Default: 24 hours
- Configurable via `JWT_EXPIRES_IN` environment variable

### User Roles
- `user`: Standard user role (default)
- `admin`: Administrative role with additional permissions

### Development Mode
When `NODE_ENV=development` and `DISABLE_AUTH=true`, authentication is bypassed for easier development.

---

## Rate Limiting

The API implements multiple layers of rate limiting:

### General API Limits
- **Window**: 15 minutes
- **Max Requests**: 100 per IP
- **Headers**: `RateLimit-*` headers included in responses

### Authentication Endpoints
- **Window**: 15 minutes
- **Max Requests**: 10 per IP
- **Affected Endpoints**: `/auth/register`, `/auth/login`

### Password Reset (Future Implementation)
- **Window**: 1 hour
- **Max Requests**: 3 per IP

---

## Data Models

### User Model

```javascript
{
  "_id": "ObjectId",
  "username": "string (3-30 chars, required, unique)",
  "email": "string (required, unique, lowercase)",
  "password": "string (min 6 chars, hashed)",
  "role": "string (enum: ['user', 'admin'], default: 'user')",
  "isActive": "boolean (default: true)",
  "lastLogin": "Date",
  "passwordResetToken": "string",
  "passwordResetExpires": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Client Model

```javascript
{
  "_id": "ObjectId",
  "code": "number (required, unique)",
  "name": "string (required)",
  "email": "string (required, unique, lowercase)",
  "phone": "string (optional, 10-15 chars)",
  "address": "string (optional)",
  "telephone": "string (optional)",
  "status": "string (required, default: 'active')",
  "birthDate": "Date (optional)",
  "pincode": "string (required, exactly 6 digits)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## API Endpoints

### Authentication Endpoints

#### Register User
**POST** `/api/auth/register`

**Rate Limited**: 10 requests per 15 minutes per IP

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

**Validation Rules:**
- `username`: 3-30 characters, required, unique
- `email`: Valid email format, required, unique
- `password`: Minimum 6 characters, required
- `role`: Optional, must be 'user' or 'admin', defaults to 'user'

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### Login User
**POST** `/api/auth/login`

**Rate Limited**: 10 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "lastLogin": "2023-12-01T10:30:00.000Z",
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### Get User Profile
**GET** `/api/auth/profile`

**Authentication**: Required
**Headers**: `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "user": {
    "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "lastLogin": "2023-12-01T10:30:00.000Z",
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:30:00.000Z"
  }
}
```

---

#### Logout User
**POST** `/api/auth/logout`

**Authentication**: Required
**Headers**: `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

#### Refresh Token
**POST** `/api/auth/refresh`

**Authentication**: Required
**Headers**: `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Client Management Endpoints

#### List Clients
**GET** `/api/client`

**Authentication**: Required
**Headers**: `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1, min: 1)
- `limit`: Items per page (default: 10, min: 1, max: 100)

**Example**: `/api/client?page=2&limit=20`

**Success Response (200):**
```json
{
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
      "code": 1001,
      "name": "John Smith",
      "email": "john.smith@example.com",
      "phone": "+1234567890",
      "address": "123 Main St, City, State",
      "telephone": "+0987654321",
      "status": "active",
      "birthDate": "1990-01-15T00:00:00.000Z",
      "pincode": "123456",
      "createdAt": "2023-12-01T09:00:00.000Z",
      "updatedAt": "2023-12-01T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

#### Get Single Client
**GET** `/api/client/:id`

**Authentication**: Required
**Headers**: `Authorization: Bearer <token>`
**Path Parameters**: `id` - MongoDB ObjectId (24-character hex string)

**Success Response (200):**
```json
{
  "_id": "64f8a1b2c3d4e5f6g7h8i9j0",
  "code": 1001,
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "address": "123 Main St, City, State",
  "telephone": "+0987654321",
  "status": "active",
  "birthDate": "1990-01-15T00:00:00.000Z",
  "pincode": "123456",
  "createdAt": "2023-12-01T09:00:00.000Z",
  "updatedAt": "2023-12-01T09:00:00.000Z"
}
```

---

#### Create Client
**POST** `/api/client`

**Authentication**: Required
**Headers**: `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "code": 1002,
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave, City, State",
  "telephone": "+0987654321",
  "status": "active",
  "birthDate": "1985-03-20",
  "pincode": "654321"
}
```

**Validation Rules:**
- `code`: Positive integer, required, unique
- `name`: 2-100 characters, required
- `email`: Valid email format, required, unique, converted to lowercase
- `phone`: 10-15 characters, optional, pattern: `/^[+]?[0-9\s\-\(\)]+$/`
- `address`: Max 500 characters, optional
- `telephone`: 10-15 characters, optional
- `status`: Must be 'active' or 'inactive', defaults to 'active'
- `birthDate`: Valid date, must not be in the future, optional
- `pincode`: Exactly 6 digits (0-9), required

**Success Response (201):**
```json
{
  "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
  "code": 1002,
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave, City, State",
  "telephone": "+0987654321",
  "status": "active",
  "birthDate": "1985-03-20T00:00:00.000Z",
  "pincode": "654321",
  "createdAt": "2023-12-01T11:00:00.000Z",
  "updatedAt": "2023-12-01T11:00:00.000Z"
}
```

---

#### Update Client
**PUT** `/api/client/:id`

**Authentication**: Required
**Headers**: `Authorization: Bearer <token>`
**Path Parameters**: `id` - MongoDB ObjectId

**Request Body:** (All fields optional)
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "phone": "+1234567890",
  "status": "inactive"
}
```

**Validation Rules**: Same as create, but all fields are optional

**Success Response (200):**
```json
{
  "_id": "64f8a1b2c3d4e5f6g7h8i9j1",
  "code": 1002,
  "name": "Jane Smith",
  "email": "jane.smith@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave, City, State",
  "telephone": "+0987654321",
  "status": "inactive",
  "birthDate": "1985-03-20T00:00:00.000Z",
  "pincode": "654321",
  "createdAt": "2023-12-01T11:00:00.000Z",
  "updatedAt": "2023-12-01T12:00:00.000Z"
}
```

---

#### Delete Client
**DELETE** `/api/client/:id`

**Authentication**: Required (Admin Role Only)
**Headers**: `Authorization: Bearer <token>`
**Path Parameters**: `id` - MongoDB ObjectId
**Authorization**: Only users with `admin` role can delete clients

**Success Response (200):**
```json
{
  "message": "Client deleted successfully"
}
```

---

### Health Check Endpoint

#### Health Check
**GET** `/health`

**Authentication**: Not required
**Rate Limiting**: Not applied

**Success Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2023-12-01T12:00:00.000Z",
  "uptime": 3600.5,
  "environment": "development",
  "version": "1.0.0"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Validation Error Format

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "\"email\" must be a valid email"
    },
    {
      "field": "name",
      "message": "\"name\" is required"
    }
  ]
}
```

### Common HTTP Status Codes

| Code | Description | Common Scenarios |
|------|-------------|------------------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 400 | Bad Request | Validation errors, invalid data format |
| 401 | Unauthorized | Missing/invalid token, expired token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate email/username |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side errors |

### Authentication Errors

**Missing Token (401):**
```json
{
  "error": "Access denied",
  "message": "No token provided"
}
```

**Invalid Token (403):**
```json
{
  "error": "Invalid token",
  "message": "Token verification failed"
}
```

**Expired Token (401):**
```json
{
  "error": "Token expired",
  "message": "Please login again"
}
```

**Insufficient Permissions (403):**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### Rate Limiting Errors

**General Rate Limit (429):**
```json
{
  "error": "Too many requests",
  "message": "Too many requests from this IP, please try again later.",
  "retryAfter": 900
}
```

**Auth Rate Limit (429):**
```json
{
  "error": "Too many authentication attempts",
  "message": "Too many login attempts from this IP, please try again later.",
  "retryAfter": 900
}
```

---

## Example Requests

### Using cURL

#### Register a New User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### Create a Client
```bash
curl -X POST http://localhost:3001/api/client \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "code": 1001,
    "name": "John Smith",
    "email": "john.smith@example.com",
    "phone": "+1234567890",
    "status": "active",
    "pincode": "123456"
  }'
```

#### Get All Clients with Pagination
```bash
curl -X GET "http://localhost:3001/api/client?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update a Client
```bash
curl -X PUT http://localhost:3001/api/client/64f8a1b2c3d4e5f6g7h8i9j0 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Updated",
    "status": "inactive"
  }'
```

#### Delete a Client (Admin Only)
```bash
curl -X DELETE http://localhost:3001/api/client/64f8a1b2c3d4e5f6g7h8i9j0 \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Using JavaScript Fetch

#### Login and Store Token
```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123'
  })
});

const data = await response.json();
const token = data.token;

// Store token for subsequent requests
localStorage.setItem('authToken', token);
```

#### Authenticated Request
```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('http://localhost:3001/api/client', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const clients = await response.json();
```

---

## Security Features

### Input Security
- **XSS Protection**: All string inputs are sanitized
- **Input Validation**: Joi schema validation for all endpoints
- **NoSQL Injection Protection**: Mongoose built-in protection
- **Request Size Limits**: 1MB limit on request bodies

### Security Headers
- **Helmet**: Comprehensive security headers
- **CORS**: Configurable cross-origin resource sharing
- **Content Security Policy**: Restrictive CSP headers

### Development Features
- **Request Logging**: All requests logged via Winston
- **Error Handling**: Development vs production error responses
- **Health Monitoring**: Uptime and status monitoring

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/nodeapi

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=24h

# Server Configuration
NODE_ENV=development
PORT=3001

# CORS Configuration
CORS_ORIGIN=http://localhost:4200

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_SALT_ROUNDS=12

# Development
DISABLE_AUTH=false
```

### Default Values
- **MongoDB URI**: `mongodb://localhost:27017/nodeapi`
- **JWT Expiration**: 24 hours
- **Port**: 3001
- **CORS Origin**: `http://localhost:4200`
- **Rate Limit Window**: 15 minutes (900000ms)
- **Rate Limit Max**: 100 requests
- **BCrypt Salt Rounds**: 12

---

This documentation provides comprehensive coverage of all API endpoints, authentication mechanisms, validation rules, and security features implemented in the Angular-Node.js CRUD application backend.