const express = require('express');
const router = express.Router();
const Place = require('../models/place');

/**
 * @swagger
 * /api/places:
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