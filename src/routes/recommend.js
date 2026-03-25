const express = require("express");
const router = express.Router();
const Place = require("../models/place");
const UserVibe = require("../models/userVibe");
const { authenticate } = require("../middleware/auth.middleware");

/**
 * Haversine distance between two lat/lng points, returns km.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Compute dynamic search radius (km) based on transport mode, pace, and
 * how many places the user wants to visit.
 *
 * Base radii (km) reflect realistic travel ranges in Nepal:
 *   walking  →  2 km  (Thamel/lakeside stroll)
 *   cycling  →  8 km  (outer neighbourhood)
 *   motorbike → 20 km (cross-valley)
 *   car      → 35 km  (regional)
 *
 * Pace multiplier: relaxed trips stay compact, packed trips cast wider.
 * Place-count factor: +5% per place above 5, −5% per place below 5.
 */
const BASE_RADIUS_KM = {
  walking: 2,
  cycling: 8,
  motorbike: 20,
  car: 35
};

const PACE_MULTIPLIER = {
  relaxed: 0.7,
  balanced: 1.0,
  packed: 1.4
};

/**
 * Compute how many places fit in the user's time window.
 * Falls back to pace-based defaults when times are missing.
 * Clamped to 2–8.
 */
const AVG_VISIT_MINS = { relaxed: 90, balanced: 60, packed: 40 };
const TRAVEL_BUFFER_MINS = { walking: 20, cycling: 15, motorbike: 10, car: 10 };
const PACE_FALLBACK_PLACES = { relaxed: 3, balanced: 5, packed: 7 };

function computeNumberOfPlaces(startTime, endTime, pace, transportMode) {
  if (!startTime || !endTime) {
    return PACE_FALLBACK_PLACES[pace] ?? 5;
  }
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const availableMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (availableMinutes <= 0) return PACE_FALLBACK_PLACES[pace] ?? 5;

  const visit = AVG_VISIT_MINS[pace] ?? 60;
  const buffer = TRAVEL_BUFFER_MINS[transportMode] ?? 10;
  const n = Math.floor(availableMinutes / (visit + buffer));
  return Math.max(2, Math.min(8, n));
}

function computeRadius(transportMode, pace, numberOfPlaces, startTime, endTime) {
  const base = BASE_RADIUS_KM[transportMode] ?? BASE_RADIUS_KM.car;
  const paceMult = PACE_MULTIPLIER[pace] ?? 1.0;
  const placeFactor = 1 + (numberOfPlaces - 5) * 0.05;

  // Time-window multiplier: shorter windows compress the radius
  let timeMult = 1.0;
  if (startTime && endTime) {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const windowHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    timeMult = Math.max(0.5, Math.min(1.3, windowHours / 8));
  }

  return base * paceMult * Math.max(placeFactor, 0.5) * timeMult;
}

/**
 * Check if a place is open during any part of the user's time window
 * on the given trip date.
 */
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function isOpenDuringWindow(openingHours, tripDate, startTime, endTime) {
  if (!openingHours || !tripDate || !startTime || !endTime) return true; // no data → keep

  const date = new Date(tripDate);
  const dayKey = DAY_NAMES[date.getDay()];
  const slots = openingHours[dayKey];
  if (!slots || slots.length === 0) return false; // no hours listed for that day → closed

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const userOpen = sh * 60 + sm;
  const userClose = eh * 60 + em;

  for (const { open, close } of slots) {
    if (!open || !close) continue;
    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    let placeOpen = oh * 60 + om;
    let placeClose = ch * 60 + cm;

    // Overnight slot (e.g. 18:00–02:00) → treat close as next-day minutes
    if (placeClose <= placeOpen) placeClose += 24 * 60;

    // Overlap check: place is open during at least part of the user's window
    if (placeOpen < userClose && placeClose > userOpen) return true;
  }
  return false;
}

/**
 * @swagger
 * /api/recommend:
 *   post:
 *     summary: Get place recommendations
 *     description: Get recommended places based on area, vibes, and number of places
 *     tags:
 *       - Recommendations
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - area
 *               - numberOfPlaces
 *             properties:
 *               area:
 *                 type: string
 *                 example: Paris
 *               vibes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of vibes/tags to match places
 *                 example: ['historic', 'romantic']
 *               numberOfPlaces:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Recommended places with average budget level
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendedPlaces:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Place'
 *                       - type: object
 *                         properties:
 *                           score:
 *                             type: number
 *                             example: 15.5
 *                 averageBudgetLevel:
 *                   type: string
 *                   example: "2.3"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { area, vibes, groupType, startLat, startLng, transportMode, pace, startTime, endTime, tripDate } = req.body;

    console.log("Vibes received:", vibes);
    console.log("Area chosen", area);
    console.log("Group type:", groupType);
    console.log("Transport mode:", transportMode, "| Pace:", pace);
    console.log("Starting point:", startLat, startLng);
    console.log("Time window:", startTime, "–", endTime, "| Trip date:", tripDate);

    // ── Compute numberOfPlaces from time budget ──
    const numberOfPlaces = computeNumberOfPlaces(startTime, endTime, pace ?? "balanced", transportMode);
    console.log("Computed numberOfPlaces:", numberOfPlaces);

    // Step 1: filter by area & active
    let places = await Place.find({
      "location.area": area,
      isActive: true
    });

    // Step 1b: hard vibe filter — drop places with zero vibe matches
    if (vibes && vibes.length > 0) {
      places = places.filter(place => {
        if (!place.vibe || place.vibe.length === 0) return false;
        return place.vibe.some(v => vibes.includes(v));
      });
      console.log(`Places after vibe filter: ${places.length}`);
    }

    // Step 1c: proximity filter — only when a starting point is provided
    const hasStartingPoint =
      startLat != null && startLng != null &&
      Number.isFinite(Number(startLat)) && Number.isFinite(Number(startLng));

    if (hasStartingPoint && transportMode) {
      const radius = computeRadius(
        transportMode,
        pace ?? "balanced",
        numberOfPlaces,
        startTime,
        endTime
      );
      console.log(`Proximity radius: ${radius.toFixed(2)} km`);

      places = places.filter(place => {
        const lat = place.location?.lat;
        const lng = place.location?.lng;
        if (lat == null || lng == null) return true;
        const dist = haversineDistance(Number(startLat), Number(startLng), lat, lng);
        return dist <= radius;
      });

      console.log(`Places after proximity filter: ${places.length}`);
    }

    // Step 1d: opening hours filter — drop places closed during the time window
    places = places.filter(place =>
      isOpenDuringWindow(place.openingHours, tripDate, startTime, endTime)
    );
    console.log(`Places after opening-hours filter: ${places.length}`);

    // Step 2: load this user's vibe affinity scores (vibeId → score)
    const userVibes = await UserVibe.find({ userId: req.user._id });
    const vibeAffinity = {};
    for (const uv of userVibes) {
      vibeAffinity[uv.vibeId] = uv.score;
    }

    const maxAffinity = Math.max(1, ...Object.values(vibeAffinity));

    // Step 3: scoring
    const scored = places.map(place => {
      let score = 0;

      if (place.vibe) {
        if (vibes) {
          const matchCount = place.vibe.filter(v => vibes.includes(v)).length;
          score += matchCount * 3;
        }

        for (const v of place.vibe) {
          if (vibeAffinity[v]) {
            score += (vibeAffinity[v] / maxAffinity) * 1.5;
          }
        }
      }

      if (groupType && place.suitableFor && place.suitableFor.length > 0) {
        if (place.suitableFor.includes(groupType)) {
          score += 2;
        }
      }

      // Capped rating boost: normalised to −1.5 … +1.5
      // A 4.8 → +1.35, a 3.0 → 0, below 3 → slight penalty
      const rating = place.averageRating || 0;
      score += ((rating - 3) / 2) * 1.5;

      return { ...place.toObject(), score };
    });

    // Step 4: sort by score descending, take top N
    scored.sort((a, b) => b.score - a.score);

    console.log("Scored places (top 10):", scored.slice(0, 10).map(p => `${p.placeName}: ${p.score.toFixed(2)}`));
    const recommended = scored.slice(0, numberOfPlaces);

    // calculate average budget
    const budgetMap = { "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 };

    const avgBudget =
      recommended.reduce(
        (sum, p) => sum + (budgetMap[p.priceRange] || 1),
        0
      ) / (recommended.length || 1);

    res.json({
      recommendedPlaces: recommended,
      averageBudgetLevel: avgBudget.toFixed(1),
      numberOfPlaces
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Recommendation failed" });
  }
});

module.exports = router;