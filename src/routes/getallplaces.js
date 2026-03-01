const express = require('express');
const router = express.Router();
const Place = require('../models/place');

// GET all places
router.get("/", async (req, res) => {
    try {
        const { active, limit = 10, page = 1 } = req.query;

        const filter = {};
        if (active === "true") {
            filter.isActive = true;
        }

        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const skip = (parsedPage - 1) * parsedLimit;

        const places = await Place.find(filter)
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(parsedLimit);

        res.json(places);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;