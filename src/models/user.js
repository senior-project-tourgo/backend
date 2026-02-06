const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User Schema Definition
 * Defines structure and validation rules for User documents
 */
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
            sparse: true, // Allows multiple null values for optional unique field
            trim: true,
            lowercase: true,
            // Only validate if email is provided
            validate: {
                validator: function (v) {
                    if (!v) return true; // Allow empty/null
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Invalid email format',
            },
        },
        phoneNumber: {
            type: String,
            unique: true,
            sparse: true, // Allows multiple null values for optional unique field
            trim: true,
            // Only validate if phone number is provided
            validate: {
                validator: function (v) {
                    if (!v) return true; // Allow empty/null
                    // Basic phone validation (adjust regex based on your needs)
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
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

/**
 * Pre-save middleware to hash password before saving to database
 * Only hashes if password is new or modified
 */
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});


/**
 * Instance method to compare password for login
 * @param {string} candidatePassword - Plain text password from login attempt
 * @returns {Promise<boolean>} - True if passwords match
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
