const express = require('express');
const router = express.Router();
const Place = require('../models/place');

/**
 * @swagger
 * /api/places/get-all-places:
 *   get:
 *     summary: Get all places
 *     description: Retrieve a paginated list of places with optional filtering
 *     tags:
 *       - Places
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Filter by active status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of places per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of places
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Place'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
// GET all places
router.get("/get-all-places", async (req, res) => {
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

//get one place based on id


/**
 * @swagger
 * /api/get-places/{placeId}:
 *   get:
 *     summary: Get a single place by placeId
 *     tags: [Places]
 *     parameters:
 *       - in: path
 *         name: placeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the place
 *         example: central-world
 *     responses:
 *       200:
 *         description: Successfully retrieved place details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Place'
 *       404:
 *         description: Place not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Place not found
 *       500:
 *         description: Server error
 */
router.get("/get-places/:placeId", async (req, res) => {
    const place = await Place.findOne({
        placeId: req.params.placeId,
        isActive: true   // business rule
    });

    if (!place) return res.status(404).json({ message: "Not found" });

    res.json(place);
});


/**
 * GET /api/places/search?q=<text>&limit=20
 * Case-insensitive name search on active places.
 */
router.get("/search", async (req, res) => {
    try {
        const { q = '', limit = 20 } = req.query;
        const filter = { isActive: true };
        if (q.trim()) {
            filter.placeName = { $regex: q.trim(), $options: 'i' };
        }
        const places = await Place.find(filter).limit(parseInt(limit));
        res.json(places);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;