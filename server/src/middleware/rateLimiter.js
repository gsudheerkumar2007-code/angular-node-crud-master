const rateLimit = require('express-rate-limit');

// General API rate limiting
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
        });
    }
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs for auth endpoints
    message: {
        error: 'Too many authentication attempts',
        message: 'Too many login attempts from this IP, please try again later.',
        retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many authentication attempts',
            message: 'Too many login attempts from this IP, please try again later.',
            retryAfter: 900
        });
    }
});

// Very strict rate limiting for password reset
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 password reset requests per hour
    message: {
        error: 'Too many password reset attempts',
        message: 'Too many password reset attempts from this IP, please try again later.',
        retryAfter: 3600 // 1 hour in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many password reset attempts',
            message: 'Too many password reset attempts from this IP, please try again later.',
            retryAfter: 3600
        });
    }
});

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter
};