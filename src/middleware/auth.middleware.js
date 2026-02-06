const { verifyToken } = require('../utils/jwt');

/**
 * Middleware to protect routes requiring authentication
 * Verifies JWT token from Authorization header
 * Attaches user data to request object if valid
 */
const authenticate = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Authorization denied.',
            });
        }

        // Extract token (remove 'Bearer ' prefix)
        const token = authHeader.substring(7);

        // Verify token
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token. Authorization denied.',
            });
        }

        // Attach user data to request
        req.user = decoded;

        // Continue to next middleware/route handler
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error during authentication.',
        });
    }
};

module.exports = { authenticate };
