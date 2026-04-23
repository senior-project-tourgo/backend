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
 * /api/places/get-places/{placeId}:
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

/**
 * GET /api/places/static-map?lat=&lng=
 * Proxies Google Static Maps API securely.
 */
router.get("/static-map", async (req, res) => {
    const { lat, lng } = req.query;
    const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;

    // 1. API key check
    if (!GOOGLE_KEY) {
        return res.status(503).json({ error: "Missing Google API key" });
    }

    // 2. Validate coordinates
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        return res.status(400).json({ error: "Invalid lat/lng" });
    }

    try {
        // 3. Build Google Static Map URL safely
        const url = new URL("https://maps.googleapis.com/maps/api/staticmap");

        url.searchParams.set("center", `${latNum},${lngNum}`);
        url.searchParams.set("zoom", "15");
        url.searchParams.set("size", "600x300");
        url.searchParams.set("scale", "2");
        url.searchParams.set(
            "markers",
            `color:0xFF7D00|${latNum},${lngNum}`
        );
        url.searchParams.set("key", GOOGLE_KEY);

        // 4. Fetch from Google
        const response = await fetch(url.toString());

        // 5. Handle Google API failure properly
        if (!response.ok) {
            const errorText = await response.text();

            return res.status(response.status).json({
                error: "Google Maps API error",
                details: errorText
            });
        }

        // 6. Set correct headers for React Native Image
        res.setHeader(
            "Content-Type",
            response.headers.get("content-type") || "image/png"
        );

        // 7. Cache aggressively (important for mobile + cost)
        res.setHeader("Cache-Control", "public, max-age=86400");

        // 8. Send binary image
        const buffer = Buffer.from(await response.arrayBuffer());
        return res.send(buffer);

    } catch (err) {
        console.error("Static map error:", err);

        return res.status(500).json({
            error: "Failed to fetch static map"
        });
    }
});

/**
 * GET /api/places/:placeId/google-details
 * Proxies a Google Places Details request server-side so the API key
 * never reaches the client bundle.
 */
router.get("/:placeId/google-details", async (req, res) => {
    const { placeId } = req.params;
    const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;

    if (!GOOGLE_KEY) {
        return res.status(503).json({ error: "Google Places API not configured" });
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=editorial_summary,user_ratings_total,reviews,formatted_address,photos&key=${GOOGLE_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        const result = data?.result ?? {};

        // Build a photo URL using the old Places API (no billing required beyond basic tier)
        const photoRef = result.photos?.[0]?.photo_reference ?? null;
        const photoUrl = photoRef
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoRef}&key=${GOOGLE_KEY}`
            : null;

        res.json({
            description: result.editorial_summary?.overview ?? null,
            address: result.formatted_address ?? null,
            totalRatings: result.user_ratings_total ?? null,
            reviews: result.reviews?.slice(0, 3) ?? [],
            photoUrl
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;