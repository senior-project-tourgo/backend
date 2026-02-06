/**
 * Utility functions for input validation
 * Helps determine if identifier is email or phone number
 */

/**
 * Validates if string is a valid email format
 * @param {string} identifier - String to validate
 * @returns {boolean} - True if valid email
 */
const isEmail = (identifier) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(identifier);
};

/**
 * Validates if string is a valid phone number format
 * @param {string} identifier - String to validate
 * @returns {boolean} - True if valid phone number
 */
const isPhoneNumber = (identifier) => {
    // Adjust this regex based on your phone number format requirements
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(identifier);
};

/**
 * Determines the type of identifier (email or phone)
 * @param {string} identifier - String to check
 * @returns {'email' | 'phone' | 'invalid'}
 */
const getIdentifierType = (identifier) => {
    if (isEmail(identifier)) return 'email';
    if (isPhoneNumber(identifier)) return 'phone';
    return 'invalid';
};

module.exports = {
    isEmail,
    isPhoneNumber,
    getIdentifierType,
};
