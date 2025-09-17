const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = mongoose.model('User');

const authenticateToken = async (req, res, next) => {
    // Development stub - bypass authentication
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
        // Create a mock user for development
        req.user = {
            _id: 'dev-user-id',
            email: 'dev@example.com',
            role: 'admin',
            isActive: true
        };
        return next();
    }

    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Invalid token or user not active'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                message: 'Please login again'
            });
        }

        return res.status(403).json({
            error: 'Invalid token',
            message: 'Token verification failed'
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
    );
};

module.exports = {
    authenticateToken,
    authorizeRoles,
    generateToken
};