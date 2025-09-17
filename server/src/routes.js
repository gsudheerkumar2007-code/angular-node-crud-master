const express = require('express');
const router = express.Router();

// Controllers
const ClientController = require('./controllers/ClientController');
const AuthController = require('./controllers/AuthController');

// Middleware
const { validateClient, validateClientUpdate, validateObjectId } = require('./middleware/validation');
const { authenticateToken, authorizeRoles } = require('./middleware/auth');
const { sanitizeInput, validateClient: validateClientSanitized } = require('./middleware/sanitizer');
const { authLimiter, generalLimiter } = require('./middleware/rateLimiter');

// Apply general rate limiting to all routes
router.use(generalLimiter);

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Public authentication routes with stricter rate limiting
router.post('/auth/register', authLimiter, AuthController.register);
router.post('/auth/login', authLimiter, AuthController.login);

// Protected authentication routes
router.get('/auth/profile', authenticateToken, AuthController.getProfile);
router.post('/auth/logout', authenticateToken, AuthController.logout);
router.post('/auth/refresh', authenticateToken, AuthController.refreshToken);

// Protected client routes - require authentication
router.get('/client', authenticateToken, ClientController.index);
router.get('/client/:id', authenticateToken, validateObjectId, ClientController.show);
router.post('/client', authenticateToken, validateClientSanitized, ClientController.store);
router.put('/client/:id', authenticateToken, validateObjectId, validateClientSanitized, ClientController.update);

// Admin-only routes
router.delete('/client/:id', authenticateToken, authorizeRoles('admin'), validateObjectId, ClientController.destroy);

// Health check endpoint (public)
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

module.exports = router;
