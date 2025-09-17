const Joi = require('joi');

// XSS protection function
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/&/g, '&amp;')
        .trim();
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    return obj;
};

// Middleware to sanitize request body
const sanitizeInput = (req, res, next) => {
    try {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }

        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeObject(req.params);
        }

        next();
    } catch (error) {
        console.error('Input sanitization error:', error);
        res.status(500).json({
            error: 'Input processing error',
            message: 'Failed to process request input'
        });
    }
};

// Specific validation schemas
const clientValidationSchema = Joi.object({
    code: Joi.number().integer().positive().required(),
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().trim().lowercase().required(),
    phone: Joi.string().trim().min(10).max(15).optional(),
    address: Joi.string().trim().max(500).optional(),
    telephone: Joi.string().trim().min(10).max(15).optional(),
    status: Joi.string().valid('active', 'inactive').default('active'),
    birthDate: Joi.date().max('now').optional()
});

const validateClient = (req, res, next) => {
    const { error, value } = clientValidationSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        return res.status(400).json({
            error: 'Validation error',
            message: 'Request validation failed',
            details: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }

    req.body = value;
    next();
};

module.exports = {
    sanitizeInput,
    validateClient,
    sanitizeString,
    sanitizeObject
};