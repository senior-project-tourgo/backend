const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — each team member needs to do this once:
//
//   1. Go to https://console.cloud.google.com
//   2. Create or select a project
//   3. Enable "Directions API" (under Maps section)
//   4. Go to Credentials → Create API Key
//   5. Restrict the key to "Directions API" only (recommended)
//   6. Add this line to your .env file:
//
//        GOOGLE_DIRECTIONS_API_KEY=AIzaSy...
//
//   The key stays server-side and is never sent to the mobile app.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_MODES = ['driving', 'walking', 'bicycling', 'transit'];

/**
 * GET /api/directions
 * Proxy to Google Directions API — keeps the API key server-side.
 *
 * Query params:
 *   origin      {string}  "lat,lng"
 *   destination {string}  "lat,lng"
 *   mode        {string}  driving | walking | bicycling | transit  (default: driving)
 *
 * Response:
 *   { points: string }   — Google encoded polyline string
 */
router.get('/', authenticate, async (req, res) => {
    const { origin, destination, mode = 'driving' } = req.query;

    if (!origin || !destination) {
        return res.status(400).json({ message: 'origin and destination are required' });
    }

    if (!VALID_MODES.includes(mode)) {
        return res.status(400).json({ message: `mode must be one of: ${VALID_MODES.join(', ')}` });
    }

    const apiKey = process.env.GOOGLE_DIRECTIONS_API_KEY;

    if (!apiKey) {
        // No key configured — tell the frontend to fall back to straight-line polyline
        return res.status(503).json({ message: 'GOOGLE_DIRECTIONS_API_KEY not set in .env' });
    }

    try {
        const url =
            `https://maps.googleapis.com/maps/api/directions/json` +
            `?origin=${encodeURIComponent(origin)}` +
            `&destination=${encodeURIComponent(destination)}` +
            `&mode=${mode}` +
            `&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'ZERO_RESULTS') {
            return res.status(404).json({ message: 'No route found for this transport mode' });
        }

        if (data.status !== 'OK') {
            // Log full Google response so you can see the exact error in your server console
            console.error('[Directions] Google API error:', JSON.stringify({ status: data.status, error_message: data.error_message }));
            return res.status(400).json({ message: `Google API returned: ${data.status} — ${data.error_message ?? 'check server logs'}` });
        }

        const points = data.routes[0].overview_polyline.points;
        const duration = data.routes[0].legs[0].duration.text; // e.g. "12 mins"
        res.json({ points, duration });
    } catch (err) {
        console.error('Directions proxy error:', err);
        res.status(500).json({ message: 'Failed to fetch directions' });
    }
});

module.exports = router;
