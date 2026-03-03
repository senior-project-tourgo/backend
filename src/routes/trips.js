const express = require("express");
const router = express.Router();
const Trip = require("../models/trip");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * @swagger
 * /api/trips/create-trip:
 *   post:
 *     summary: Create a new trip
 *     description: Create a new trip or itinerary. If status is "current", all existing current trips are marked as completed.
 *     tags:
 *       - Trips
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itineraryName
 *               - places
 *               - status
 *             properties:
 *               itineraryName:
 *                 type: string
 *                 example: Summer Paris Trip 2026
 *               places:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of place IDs
 *                 example: ['507f1f77bcf86cd799439001', '507f1f77bcf86cd799439002']
 *               status:
 *                 type: string
 *                 enum: ['current', 'completed']
 *                 example: current
 *     responses:
 *       201:
 *         description: Trip created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Trip'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/create-trip", authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("User ID from token:", userId);

        if (req.body.status === "current") {
            await Trip.updateMany(
                { userId, status: "current" },
                { status: "completed", completedAt: new Date() }
            );
        }
        console.log("Creating trip with data:", userId, req.body);
        const trip = await Trip.create({
            userId: req.user.userId,
            itineraryName: req.body.itineraryName,
            places: req.body.places,
            status: req.body.status,
            startedAt:
                req.body.status === "current" ? new Date() : null
        });
        console.log("New trip created:", trip);
        res.status(201).json(trip);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Trip creation failed" });
    }
});

/**
 * @swagger
 * /api/trips/fetch-all-user-trips:
 *   get:
 *     summary: Fetch all trips for the authenticated user
 *     description: Retrieve all trips (current and completed) for the logged-in user, sorted by creation date
 *     tags:
 *       - Trips
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all user trips
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Trip'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/fetch-all-user-trips', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;   // from JWT

        const trips = await Trip.find({ userId })
            .sort({ createdAt: -1 });  // newest first

        res.status(200).json(trips);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch trips' });
    }
});

module.exports = router;