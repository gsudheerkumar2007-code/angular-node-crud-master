const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    passwordResetToken: String,
    passwordResetExpires: Date
}, {
    timestamps: true
});

// Add indexes for better performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ lastLogin: 1 });
UserSchema.index({ createdAt: 1 });

// Compound indexes for common queries
UserSchema.index({ isActive: 1, role: 1 });
UserSchema.index({ email: 1, isActive: 1 });

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    try {
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.passwordResetToken;
    delete userObject.passwordResetExpires;
    return userObject;
};

mongoose.model('User', UserSchema);