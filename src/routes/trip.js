const express = require("express");
const router = express.Router();
const Trip = require("../models/trip");
const { authenticate } = require("../middleware/auth.middleware");
router.post("/", authenticate, async (req, res) => {
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

router.get('/fetchalltrips', authenticate, async (req, res) => {
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