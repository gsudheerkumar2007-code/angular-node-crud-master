const mongoose = require('mongoose');
const Joi = require('joi');
const { generateToken } = require('../middleware/auth');

const User = mongoose.model('User');

// Validation schemas
const registerSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('user', 'admin').default('user')
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

class AuthController {
    // Register new user
    async register(req, res) {
        try {
            const { error, value } = registerSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    error: 'Validation error',
                    details: error.details.map(detail => ({
                        field: detail.path.join('.'),
                        message: detail.message
                    }))
                });
            }

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [
                    { email: value.email },
                    { username: value.username }
                ]
            });

            if (existingUser) {
                const field = existingUser.email === value.email ? 'email' : 'username';
                return res.status(409).json({
                    error: 'User already exists',
                    message: `User with this ${field} already exists`
                });
            }

            // Create new user
            const user = new User(value);
            await user.save();

            // Generate token
            const token = generateToken(user);

            res.status(201).json({
                message: 'User registered successfully',
                user: user.toJSON(),
                token
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to register user'
            });
        }
    }

    // Login user
    async login(req, res) {
        try {
            const { error, value } = loginSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    error: 'Validation error',
                    details: error.details.map(detail => ({
                        field: detail.path.join('.'),
                        message: detail.message
                    }))
                });
            }

            // Find user
            const user = await User.findOne({ email: value.email });
            if (!user) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    message: 'Email or password is incorrect'
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({
                    error: 'Account disabled',
                    message: 'Your account has been disabled'
                });
            }

            // Verify password
            const isPasswordValid = await user.comparePassword(value.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    error: 'Invalid credentials',
                    message: 'Email or password is incorrect'
                });
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Generate token
            const token = generateToken(user);

            res.json({
                message: 'Login successful',
                user: user.toJSON(),
                token
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to login'
            });
        }
    }

    // Get current user profile
    async getProfile(req, res) {
        try {
            res.json({
                user: req.user.toJSON()
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to get user profile'
            });
        }
    }

    // Logout (client-side token removal)
    async logout(req, res) {
        res.json({
            message: 'Logged out successfully'
        });
    }

    // Refresh token
    async refreshToken(req, res) {
        try {
            const newToken = generateToken(req.user);
            res.json({
                message: 'Token refreshed successfully',
                token: newToken
            });
        } catch (error) {
            console.error('Refresh token error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to refresh token'
            });
        }
    }
}

module.exports = new AuthController();