const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            lowercase: true,
            minlength: [3, 'Username must be at least 3 characters'],
        },
        email: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: function (v) {
                    if (!v) return true;
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Invalid email format',
            },
        },
        phoneNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            validate: {
                validator: function (v) {
                    if (!v) return true;
                    return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(v);
                },
                message: 'Invalid phone number format',
            },
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
        },
        profilePicture: {
            type: String,
            default: null,
        },
        // Saved places (array of placeIds)
        savedPlaces: {
            type: [String],
            default: [],
        },
        // Saved promotion IDs
        savedPromotions: {
            type: [String],
            default: [],
        },
        // Redeemed reward IDs (User ↔ Rewards relationship)
        redeemedRewards: {
            type: [String],
            default: [],
        },
        // Gamification
        xp: {
            type: Number,
            default: 0,
        },
        badge: {
            type: String,
            enum: ['Newcomer', 'Explorer', 'Adventurer', 'Legend'],
            default: 'Newcomer',
        },
    },
    {
        timestamps: true,
    }
);

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Compute badge from XP
 */
UserSchema.methods.computeBadge = function () {
    if (this.xp >= 1000) return 'Legend';
    if (this.xp >= 500) return 'Adventurer';
    if (this.xp >= 100) return 'Explorer';
    return 'Newcomer';
};

module.exports = mongoose.model('User', UserSchema);
