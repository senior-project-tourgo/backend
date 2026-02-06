const express = require('express');
const User = require('../models/user.js');
const { generateToken } = require('../utils/jwt');
const { getIdentifierType } = require('../utils/validation');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
    try {
        const { name, username, identifier, password } = req.body;

        // Validation: Check required fields
        if (!name || !username || !identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: name, username, identifier (email or phone), and password.',
            });
        }

        // Validate identifier type
        const identifierType = getIdentifierType(identifier);

        if (identifierType === 'invalid') {
            return res.status(400).json({
                success: false,
                message: 'Invalid identifier. Please provide a valid email or phone number.',
            });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists. Please choose another.',
            });
        }

        // Check if email/phone already exists
        const query = identifierType === 'email'
            ? { email: identifier.toLowerCase() }
            : { phoneNumber: identifier };

        const existingIdentifier = await User.findOne(query);
        if (existingIdentifier) {
            return res.status(400).json({
                success: false,
                message: `This ${identifierType} is already registered.`,
            });
        }

        // Create user object based on identifier type
        const userData = {
            name,
            username: username.toLowerCase(),
            password,
        };

        if (identifierType === 'email') {
            userData.email = identifier.toLowerCase();
        } else {
            userData.phoneNumber = identifier;
        }

        // Create and save new user
        const user = new User(userData);
        await user.save();

        // Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            username: user.username,
        });

        // Send response
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                },
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message,
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post('/login', async (req, res) => {
    console.log("Login route accessed");
    console.log(req.body);
    try {
        const { identifier, password } = req.body;
        console.log("Identifier:", identifier);
        // Validation: Check required fields
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both identifier (email or phone) and password.',
            });
        }

        // Validate identifier type
        const identifierType = getIdentifierType(identifier);

        if (identifierType === 'invalid') {
            return res.status(400).json({
                success: false,
                message: 'Invalid identifier. Please provide a valid email or phone number.',
            });
        }

        // Find user by email or phone number
        const query = identifierType === 'email'
            ? { email: identifier.toLowerCase() }
            : { phoneNumber: identifier };

        const user = await User.findOne(query);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. User not found.',
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. Incorrect password.',
            });
        }

        // Generate JWT token
        const token = generateToken({
            userId: user._id.toString(),
            username: user.username,
        });

        // Send response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                },
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message,
        });
    }
});

module.exports = router;
