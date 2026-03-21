const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Trip = require("../models/trip");
const User = require("../models/user");
const Place = require("../models/place");
const UserVibe = require("../models/userVibe");
const { authenticate } = require("../middleware/auth.middleware");

// XP constants
const XP_CHECKIN = 10;
const XP_COMPLETE_TRIP = 50;

/**
 * POST /api/trips/create-trip
 * Create a saved or current trip.
 */
router.post("/create-trip", authenticate, async (req, res) => {
    try {
        const userId = req.user._id; // fixed: was req.user.userId

        if (req.body.status === "current") {
            await Trip.updateMany(
                { userId, status: "current" },
                { status: "completed", completedAt: new Date() }
            );
        }

        const trip = await Trip.create({
            userId,
            itineraryName: req.body.itineraryName,
            places: req.body.places,
            status: req.body.status,
            startedAt: req.body.status === "current" ? new Date() : null,
        });

        res.status(201).json(trip);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Trip creation failed" });
    }
});

/**
 * GET /api/trips/fetch-all-user-trips
 * Fetch all trips for the authenticated user.
 */
router.get("/fetch-all-user-trips", authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const trips = await Trip.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(trips);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch trips" });
    }
});

/**
 * GET /api/trips/:tripId
 * Fetch a single trip by ID.
 */
router.get("/:tripId", authenticate, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.tripId)) {
            return res.status(400).json({ message: "Invalid trip ID" });
        }
        const trip = await Trip.findOne({
            _id: req.params.tripId,
            userId: req.user._id
        });
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        res.json(trip);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch trip" });
    }
});

/**
 * PATCH /api/trips/:tripId/start
 * Start a saved trip — sets status to 'current'.
 */
router.patch("/:tripId/start", authenticate, async (req, res) => {
    try {
        const userId = req.user._id;

        // Mark any existing current trip as completed first
        await Trip.updateMany(
            { userId, status: "current" },
            { status: "completed", completedAt: new Date() }
        );

        const trip = await Trip.findOneAndUpdate(
            { _id: req.params.tripId, userId },
            { status: "current", startedAt: new Date(), pausedAt: null },
            { new: true }
        );

        if (!trip) return res.status(404).json({ message: "Trip not found" });
        res.json(trip);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to start trip" });
    }
});

/**
 * PATCH /api/trips/:tripId/pause
 * Pause an active trip.
 */
router.patch("/:tripId/pause", authenticate, async (req, res) => {
    try {
        const trip = await Trip.findOneAndUpdate(
            { _id: req.params.tripId, userId: req.user._id, status: "current" },
            { pausedAt: new Date() },
            { new: true }
        );
        if (!trip) return res.status(404).json({ message: "Active trip not found" });
        res.json(trip);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to pause trip" });
    }
});

/**
 * PATCH /api/trips/:tripId/checkin
 * Check in at a place during a trip.
 * Body: { placeId }
 * Awards XP_CHECKIN XP, updates UserVibe scores.
 */
router.patch("/:tripId/checkin", authenticate, async (req, res) => {
    try {
        const { placeId } = req.body;
        if (!placeId) return res.status(400).json({ message: "placeId required" });

        const userId = req.user._id;

        const trip = await Trip.findOne({
            _id: req.params.tripId,
            userId,
            status: "current",
        });
        if (!trip) return res.status(404).json({ message: "Active trip not found" });

        // Mark the place as visited
        const placeEntry = trip.places.find((p) => p.placeId === placeId);
        if (!placeEntry) return res.status(400).json({ message: "Place not in trip" });
        if (placeEntry.visitedAt) return res.status(400).json({ message: "Already checked in" });

        placeEntry.visitedAt = new Date();
        await trip.save();

        // Award XP
        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { xp: XP_CHECKIN } },
            { new: true }
        );
        // Recompute badge
        user.badge = user.computeBadge();
        await user.save();

        // Update UserVibe scores for this place's vibes
        const place = await Place.findOne({ placeId });
        if (place && place.vibe && place.vibe.length > 0) {
            for (const vibeId of place.vibe) {
                await UserVibe.findOneAndUpdate(
                    { userId, vibeId },
                    { $inc: { score: 1 }, lastUpdated: new Date() },
                    { upsert: true, new: true }
                );
            }
        }

        res.json({
            trip,
            xpEarned: XP_CHECKIN,
            totalXp: user.xp,
            badge: user.badge,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Check-in failed" });
    }
});

/**
 * PATCH /api/trips/:tripId/complete
 * Complete an active trip.
 * Body: { totalDuration } (minutes, optional — calculated from startedAt if omitted)
 * Awards XP_COMPLETE_TRIP XP.
 */
router.patch("/:tripId/complete", authenticate, async (req, res) => {
    try {
        const userId = req.user._id;

        const trip = await Trip.findOne({
            _id: req.params.tripId,
            userId,
            status: "current",
        });
        if (!trip) return res.status(404).json({ message: "Active trip not found" });

        const completedAt = new Date();
        const totalDuration =
            req.body?.totalDuration ||
            (trip.startedAt
                ? Math.round((completedAt - trip.startedAt) / 60000)
                : null);

        trip.status = "completed";
        trip.completedAt = completedAt;
        trip.totalDuration = totalDuration;
        trip.xpEarned = (trip.xpEarned || 0) + XP_COMPLETE_TRIP;
        await trip.save();

        // Award XP
        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { xp: XP_COMPLETE_TRIP } },
            { new: true }
        );
        user.badge = user.computeBadge();
        await user.save();

        // Count visited places
        const visitedCount = trip.places.filter((p) => p.visitedAt).length;

        res.json({
            trip,
            xpEarned: XP_COMPLETE_TRIP,
            totalXp: user.xp,
            badge: user.badge,
            visitedCount,
            totalDuration,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to complete trip" });
    }
});

/**
 * PATCH /api/trips/:tripId
 * Update a trip's name and/or places.
 * Body: { itineraryName?, places?: [{ placeId, order }] }
 */
router.patch("/:tripId", authenticate, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.tripId)) {
            return res.status(400).json({ message: "Invalid trip ID" });
        }

        const updates = {};
        if (req.body.itineraryName !== undefined) {
            updates.itineraryName = req.body.itineraryName;
        }
        if (req.body.places !== undefined) {
            // Merge visitedAt from existing places so check-ins aren't lost
            const existing = await Trip.findOne({
                _id: req.params.tripId,
                userId: req.user._id
            });
            if (!existing) return res.status(404).json({ message: "Trip not found" });

            const visitedMap = {};
            existing.places.forEach(p => {
                if (p.visitedAt) visitedMap[p.placeId] = p.visitedAt;
            });

            updates.places = req.body.places.map(p => ({
                placeId: p.placeId,
                order: p.order,
                visitedAt: visitedMap[p.placeId] || null
            }));
        }

        const trip = await Trip.findOneAndUpdate(
            { _id: req.params.tripId, userId: req.user._id },
            updates,
            { new: true }
        );
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        res.json(trip);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update trip" });
    }
});

/**
 * DELETE /api/trips/:tripId
 * Delete a trip owned by the authenticated user.
 */
router.delete("/:tripId", authenticate, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.tripId)) {
            return res.status(400).json({ message: "Invalid trip ID" });
        }
        const trip = await Trip.findOneAndDelete({
            _id: req.params.tripId,
            userId: req.user._id
        });
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        res.json({ message: "Trip deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete trip" });
    }
});

module.exports = router;
