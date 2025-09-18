# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a full-stack Angular-Node.js CRUD application with MongoDB. The frontend is built with Angular 15 and the backend uses Express.js with Mongoose for MongoDB integration.

## Project Structure

The project consists of two main parts:
- `frontend/` - Angular 15 application with Bootstrap UI
- `server/` - Node.js Express API server with MongoDB
- `docker/` - Docker configuration for MongoDB

## Development Commands

### Backend (server/)
```bash
# Install dependencies and start development server
npm install
npm run dev          # Start with nodemon (auto-restart)
npm start           # Start production server

# Testing
npm test            # Run Jest tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Frontend (frontend/)
```bash
# Install dependencies and start development server
npm install
npm run start       # Start Angular dev server with proxy to backend
npm run build       # Build for production
npm test           # Run Karma/Jasmine tests
npm run lint       # Run Angular linter
npm run e2e        # Run end-to-end tests
```

### Database
```bash
# Start MongoDB with Docker
cd docker
docker-compose up -d
```

## Architecture

### Backend Architecture
- **Entry Point**: `server.js` - Express server with security middleware (helmet, CORS, rate limiting)
- **Authentication**: JWT-based auth with bcrypt password hashing
- **Models**: Mongoose schemas in `src/models/` (Client.js, User.js)
- **Controllers**: Business logic in `src/controllers/` (ClientController.js, AuthController.js)
- **Routes**: API endpoints in `src/routes.js` with middleware validation
- **Middleware**:
  - Authentication (`src/middleware/auth.js`)
  - Input validation and sanitization (`src/middleware/validation.js`, `src/middleware/sanitizer.js`)
  - Rate limiting (`src/middleware/rateLimiter.js`)
- **Logging**: Winston logger in `src/utils/logger.js`

### Frontend Architecture
- **Components**:
  - `ClienteCadComponent` - Client registration/editing form
  - `ClienteListComponent` - Client listing with pagination and export
- **Services**:
  - `ClienteService` - HTTP client for API communication
  - `ExportService` - Excel export functionality
- **Routing**: Angular Router with lazy loading
- **Proxy**: Development proxy configured to forward `/api/*` to `localhost:3001`

### Database Schema
- **Client Model**: code, name, email (unique), phone, address, telephone, status, birthDate, pincode (required, 6 digits)
- **User Model**: Authentication with roles (admin/user)
- **Indexes**: Optimized for email uniqueness, name/status queries, and temporal sorting

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (authenticated)
- `POST /api/auth/logout` - Logout (authenticated)

### Client Management
- `GET /api/client` - List clients with pagination (authenticated)
- `GET /api/client/:id` - Get single client (authenticated)
- `POST /api/client` - Create client (authenticated)
- `PUT /api/client/:id` - Update client (authenticated)
- `DELETE /api/client/:id` - Delete client (admin only)

## Environment Configuration

### Backend (.env)
```
MONGODB_URI=mongodb://localhost:27017/nodeapi
JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:4200
```

### Database Connection
- Default: `mongodb://localhost:27017/nodeapi`
- Docker: Use `docker-compose up -d` in `/docker` folder

## Security Features
- JWT authentication with role-based authorization
- Input validation and sanitization
- Rate limiting (stricter for auth endpoints)
- Helmet security headers
- CORS configuration
- Password hashing with bcryptjs
- MongoDB injection protection

## Field Validation Rules

### Client Model Validations
- **code**: Positive integer, required, unique
- **name**: 2-100 characters, required
- **email**: Valid email format, required, unique, lowercase
- **phone**: 10-15 characters, optional, pattern validation
- **address**: Max 200 characters, optional
- **telephone**: 10-15 characters, optional
- **status**: 'active' or 'inactive', defaults to 'active'
- **birthDate**: Valid date, cannot be future date, optional
- **pincode**: Exactly 6 digits (0-9), required, string type to preserve leading zeros

## Testing
- **Backend**: Jest with supertest for API testing, MongoDB Memory Server for test database
- **Frontend**: Karma + Jasmine for unit tests
- **Coverage**: Jest coverage reports for backend code