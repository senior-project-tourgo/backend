/**
 * JWT Configuration
 * Centralizes JWT-related constants
 */
const JWT_CONFIG = {
    SECRET: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    EXPIRATION: '7d', // Token expires in 7 days
};

module.exports = JWT_CONFIG;
