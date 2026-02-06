const jwt = require('jsonwebtoken');
const JWT_CONFIG = require('../config/jwt');

/**
 * Generates a JWT token for authenticated user
 * @param {Object} payload - User data to encode in token
 * @param {string} payload.userId - User's ID
 * @param {string} payload.username - User's username
 * @returns {string} Signed JWT token string
 */
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_CONFIG.SECRET, {
        expiresIn: JWT_CONFIG.EXPIRATION,
    });
};

/**
 * Verifies and decodes a JWT token
 * @param {string} token - JWT token string
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
        return decoded;
    } catch (error) {
        // Token is invalid or expired
        return null;
    }
};

module.exports = {
    generateToken,
    verifyToken,
};
