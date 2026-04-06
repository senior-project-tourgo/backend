/**
 * STEP 4 — routes/recommend.js  (drop-in replacement)
 * =====================================================
 * Improvements over the original:
 *
 *  1. Two-tier vibe system
 *     Broad vibes (budget, nature, scenic, foodie) and sparse vibes
 *     (romantic, intimate, backpacker, relaxing) never hard-filter —
 *     they only add score. This prevents 0-result itineraries.
 *
 *  2. Quality-weighted scoring
 *     Every score is multiplied by qualityTier (gold=1.15x … unverified=0.6x).
 *     Unverified Reddit-only places can still appear but rank lower.
 *
 *  3. Review volume signal
 *     log10(reviewCount) adds up to +2 pts. 40k reviews beats 40 reviews
 *     without dominating the vibe match signal.
 *
 *  4. Sentiment signal
 *     Reddit sentimentScore (-1 → +1) adds up to ±1.2 pts.
 *
 *  5. Season bonus
 *     If tripDate falls in a place's bestSeason, +0.8 pts.
 *
 *  6. UNESCO bonus
 *     isUnescoSite adds +1.5 pts (iconic first-timer highlights).
 *
 *  7. Source trust bonus
 *     Places verified by 2–3 sources score slightly higher than single-source.
 *
 *  8. Difficulty penalty
 *     family/elderly groups get a -3 penalty for challenging/hard/extreme places.
 *
 *  9. budget/luxury price cross-signal
 *     Picking "budget" vibe also boosts priceLevel:low places even if the
 *     vibe tag is missing. Same for "luxury".
 *
 * 10. hoursUnconfirmed flag passed through to frontend.
 */

const express = require("express");
const router = express.Router();
const Place = require("../models/place");
const Trip = require("../models/trip");
const UserVibe = require("../models/userVibe");
const { authenticate } = require("../middleware/auth.middleware");

// ── Vibe tiers ────────────────────────────────────────────────────────────────
//
// SOFT_ONLY: never used as a hard filter, only contribute to score.
// Reason: broad (budget=63%, nature=55%) or sparse (<55 places).

const SOFT_ONLY_VIBES = new Set([
  "budget", "nature", "scenic", "foodie",   // too broad
  "romantic", "intimate", "backpacker",      // too sparse
  "relaxing",                                // 45 places, near-dup of chill
]);

// nature+scenic are the same population (100% overlap) — expand automatically
function expandVibes(vibes) {
  const expanded = [...vibes];
  if (vibes.includes("nature") && !expanded.includes("scenic")) expanded.push("scenic");
  if (vibes.includes("scenic") && !expanded.includes("nature")) expanded.push("nature");
  return expanded;
}

// ── Quality multiplier ────────────────────────────────────────────────────────

const QUALITY_MULT = { gold: 1.15, silver: 1.0, bronze: 0.8, unverified: 0.6 };

// ── Season helper ─────────────────────────────────────────────────────────────

function getSeason(dateStr) {
  if (!dateStr) return null;
  const m = new Date(dateStr).getMonth() + 1;
  if ([3, 4, 5].includes(m)) return "spring";
  if ([6, 7, 8].includes(m)) return "monsoon";
  if ([9, 10, 11].includes(m)) return "autumn";
  return "winter";
}

// ── Distance helpers ──────────────────────────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const BASE_RADIUS_KM = { walking: 2, cycling: 8, motorbike: 20, car: 35 };
const PACE_MULT = { relaxed: 0.7, balanced: 1.0, packed: 1.4 };

function computeRadius(mode, pace, nPlaces, startTime, endTime) {
  const base = BASE_RADIUS_KM[mode] ?? BASE_RADIUS_KM.car;
  const paceMult = PACE_MULT[pace] ?? 1.0;
  const placeFact = Math.max(1 + (nPlaces - 5) * 0.05, 0.5);

  let timeMult = 1.0;
  if (startTime && endTime) {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
    timeMult = Math.max(0.5, Math.min(1.3, hours / 8));
  }
  return base * paceMult * placeFact * timeMult;
}

// ── numberOfPlaces from time window ──────────────────────────────────────────

const AVG_VISIT = { relaxed: 90, balanced: 60, packed: 40 };
const TRAVEL_BUF = { walking: 20, cycling: 15, motorbike: 10, car: 10 };
const PACE_DEFAULT = { relaxed: 3, balanced: 5, packed: 7 };

function computeNumberOfPlaces(startTime, endTime, pace, mode) {
  if (!startTime || !endTime) return PACE_DEFAULT[pace] ?? 5;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const avail = (eh * 60 + em) - (sh * 60 + sm);
  if (avail <= 0) return PACE_DEFAULT[pace] ?? 5;
  const visit = AVG_VISIT[pace] ?? 60;
  const buffer = TRAVEL_BUF[mode] ?? 10;
  return Math.max(2, Math.min(8, Math.floor(avail / (visit + buffer))));
}

// ── Hours filter ──────────────────────────────────────────────────────────────

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function toMins(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function slotsOverlap(slots, userOpen, userClose) {
  for (const { open, close } of slots) {
    let pOpen = toMins(open);
    let pClose = toMins(close);
    if (pOpen == null || pClose == null) continue;
    if (pClose <= pOpen) pClose += 24 * 60;          // overnight slot
    if (pOpen < userClose && pClose > userOpen) return true;
  }
  return false;
}

function checkHours(place, tripDate, startTime, endTime) {
  if (!tripDate || !startTime || !endTime)
    return { passes: true, hoursUnconfirmed: false };

  const conf = place.hoursConfidence ?? "none";
  if (conf === "none") return { passes: true, hoursUnconfirmed: true };

  const dayKey = DAY_NAMES[new Date(tripDate).getDay()];
  const slots = place.openingHours?.[dayKey] ?? [];
  const userOpen = toMins(startTime);
  const userClose = toMins(endTime);

  if (conf === "full") {
    if (slots.length === 0) return { passes: false, hoursUnconfirmed: false };
    return { passes: slotsOverlap(slots, userOpen, userClose), hoursUnconfirmed: false };
  }

  // partial: filter if slots exist and clearly don't overlap, flag either way
  if (slots.length === 0) return { passes: true, hoursUnconfirmed: true };
  return { passes: slotsOverlap(slots, userOpen, userClose), hoursUnconfirmed: true };
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.post("/", authenticate, async (req, res) => {
  try {
    const {
      area, vibes = [], groupType,
      startLat, startLng, transportMode, pace,
      startTime, endTime, tripDate,
    } = req.body;

    console.log({ area, vibes, groupType, transportMode, pace, startTime, endTime, tripDate });

    // ── Derived config ─────────────────────────────────────────────────────
    const expandedVibes = expandVibes(vibes);
    const hardVibes = expandedVibes.filter(v => !SOFT_ONLY_VIBES.has(v));
    const softVibes = expandedVibes.filter(v => SOFT_ONLY_VIBES.has(v));
    const season = getSeason(tripDate);
    const numberOfPlaces = computeNumberOfPlaces(startTime, endTime, pace ?? "balanced", transportMode);

    console.log({ hardVibes, softVibes, season, numberOfPlaces });

    // ── Step 1: area + active ──────────────────────────────────────────────
    let places = await Place.find({ "location.area": area, isActive: true });
    console.log(`After area filter: ${places.length}`);

    // ── Step 2: hard vibe filter (only for non-broad vibes) ───────────────
    if (hardVibes.length > 0) {
      places = places.filter(p =>
        p.vibe?.some(v => hardVibes.includes(v))
      );
      console.log(`After hard vibe filter: ${places.length}`);
    }

    // ── Step 3: proximity filter ───────────────────────────────────────────
    const hasStart = startLat != null && startLng != null
      && isFinite(+startLat) && isFinite(+startLng);

    if (hasStart && transportMode) {
      const radius = computeRadius(transportMode, pace ?? "balanced", numberOfPlaces, startTime, endTime);
      console.log(`Radius: ${radius.toFixed(2)} km`);
      places = places.filter(p => {
        if (p.location?.lat == null || p.location?.lng == null) return true;
        return haversine(+startLat, +startLng, p.location.lat, p.location.lng) <= radius;
      });
      console.log(`After proximity filter: ${places.length}`);
    }

    // ── Step 4: opening hours filter ──────────────────────────────────────
    const hoursChecked = places.map(p => ({
      place: p,
      ...checkHours(p, tripDate, startTime, endTime),
    }));
    places = hoursChecked.filter(r => r.passes);
    console.log(`After hours filter: ${places.length}`);

    // ── Step 5: user vibe affinity ────────────────────────────────────────
    const userVibes = await UserVibe.find({ userId: req.user._id });
    const vibeAffinity = {};
    for (const uv of userVibes) vibeAffinity[uv.vibeId] = uv.score;
    const maxAffinity = Math.max(1, ...Object.values(vibeAffinity));

    // ── Step 6: scoring ────────────────────────────────────────────────────
    const scored = places.map(({ place, hoursUnconfirmed }) => {
      let score = 0;

      // Hard vibe match — strongest signal
      if (hardVibes.length > 0 && place.vibe?.length) {
        const matches = place.vibe.filter(v => hardVibes.includes(v)).length;
        score += matches * 3;
      }

      // Soft vibe match — nudge only
      if (softVibes.length > 0 && place.vibe?.length) {
        const matches = place.vibe.filter(v => softVibes.includes(v)).length;
        score += matches * 0.8;
      }

      // Budget/luxury → cross-signal with priceLevel
      if (vibes.includes("budget")) {
        if (place.priceLevel === "low") score += 1.5;
        if (place.priceLevel === "high") score -= 1.0;
      }
      if (vibes.includes("luxury")) {
        if (place.priceLevel === "high") score += 1.5;
        if (place.priceLevel === "low") score -= 1.0;
      }

      // User affinity (personalisation)
      for (const v of (place.vibe ?? [])) {
        if (vibeAffinity[v]) score += (vibeAffinity[v] / maxAffinity) * 1.5;
      }

      // Group suitability — soft bonus
      if (groupType && place.suitableFor?.includes(groupType)) score += 1.5;

      // Difficulty penalty for vulnerable groups
      if (["family", "elderly"].includes(groupType) &&
        ["challenging", "hard", "extreme"].includes(place.difficulty)) {
        score -= 3;
      }

      // Rating boost (–1.5 to +1.5, centred on 3 stars)
      const rating = place.averageRating ?? 0;
      score += ((rating - 3) / 2) * 1.5;

      // Review volume — log-scaled, max +2
      if (place.reviewCount > 0) {
        score += Math.min(Math.log10(place.reviewCount) * 0.4, 2);
      }

      // Reddit sentiment (–1 → +1)
      if (place.sentimentScore != null) score += place.sentimentScore * 1.2;

      // UNESCO
      if (place.isUnescoSite) score += 1.5;

      // Season match
      if (season && place.bestSeason?.includes(season)) score += 0.8;

      // Cross-source trust
      if (place.sourcesCount > 1) score += (place.sourcesCount - 1) * 0.3;

      // Quality multiplier — applied last, gates everything above
      score *= (QUALITY_MULT[place.qualityTier] ?? 0.8);

      return { ...place.toObject(), score, hoursUnconfirmed };
    });

    // ── Step 7: sort + slice ───────────────────────────────────────────────
    scored.sort((a, b) => b.score - a.score);
    console.log("Top 5:", scored.slice(0, 5).map(p => `${p.placeName}: ${p.score.toFixed(2)}`));

    const recommended = scored.slice(0, numberOfPlaces);

    // Average budget (for trip cost estimate)
    const budgetMap = { "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 };
    const avgBudget = recommended.reduce((s, p) => s + (budgetMap[p.priceRange] || 1), 0)
      / (recommended.length || 1);

    res.json({
      recommendedPlaces: recommended,
      averageBudgetLevel: avgBudget.toFixed(1),
      numberOfPlaces,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Recommendation failed" });
  }
});

// ── /home ─────────────────────────────────────────────────────────────────────
// GET /api/recommend/home?vibe=all&page=0&limit=10
// Returns personalised place feed + trip suggestions with reason strings.
// Algorithm:
//   1. Pull user's completed trips and extract vibes of visited places.
//   2. Pick the most-visited vibes as the user's "taste profile".
//   3. If a vibe filter is active, filter to that vibe; else use taste profile.
//   4. Return paginated places (excluding already-visited ones) + trip suggestions.

const REASON_TEMPLATES = [
  name => `Because you visited ${name}, you may like`,
  name => `Since you loved ${name}, you may enjoy`,
  name => `Inspired by your visit to ${name}`,
  name => `Fans of ${name} also love`,
  name => `After ${name}, try`,
];

router.get("/home", authenticate, async (req, res) => {
  try {
    const { vibe = "all", page = "0", limit = "10" } = req.query;
    const pageNum  = Math.max(0, parseInt(page,  10) || 0);
    const limitNum = Math.min(30, Math.max(1, parseInt(limit, 10) || 10));
    const userId = req.user._id;

    // 1. Completed trips (most recent 15)
    const completedTrips = await Trip.find({ userId, status: "completed" })
      .sort({ completedAt: -1 })
      .limit(15);

    const visitedPlaceIds = [
      ...new Set(completedTrips.flatMap(t => t.places.map(p => p.placeId)))
    ];

    // 2. Fetch visited place docs for vibe extraction
    const visitedPlaces = visitedPlaceIds.length > 0
      ? await Place.find({ placeId: { $in: visitedPlaceIds } }).lean()
      : [];

    // 3. Build vibe affinity map
    const vibeCount = {};
    for (const p of visitedPlaces) {
      for (const v of (p.vibe || [])) {
        vibeCount[v] = (vibeCount[v] || 0) + 1;
      }
    }
    const topVibes = Object.entries(vibeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([v]) => v);

    // 4. Active vibe filter
    let targetVibes = [];
    if (vibe !== "all") {
      targetVibes = [vibe];
    } else if (topVibes.length > 0) {
      targetVibes = topVibes.slice(0, 3);
    }

    // 5. Query places (exclude visited)
    const vibeFilter = targetVibes.length > 0
      ? { vibe: { $in: targetVibes } }
      : {};

    const places = await Place.find({
      isActive: true,
      placeId: { $nin: visitedPlaceIds },
      ...vibeFilter,
    })
      .sort({ averageRating: -1, placeScore: -1 })
      .skip(pageNum * limitNum)
      .limit(limitNum)
      .lean();

    const hasMore = places.length === limitNum;

    // 6. Trip suggestions — only on first page
    let tripSuggestions = [];
    if (pageNum === 0 && visitedPlaces.length > 0) {
      // Build 2–3 grouped suggestions keyed on a dominant vibe
      const usedVibes = new Set();
      const suggestionVibes = topVibes.slice(0, 3);

      for (const sv of suggestionVibes) {
        if (tripSuggestions.length >= 3) break;
        if (usedVibes.has(sv)) continue;
        usedVibes.add(sv);

        // Find a recent visited place with this vibe for the reason string
        const anchorPlace = visitedPlaces.find(p => p.vibe?.includes(sv));
        if (!anchorPlace) continue;

        const template = REASON_TEMPLATES[tripSuggestions.length % REASON_TEMPLATES.length];
        const reason = template(anchorPlace.placeName);

        // Suggest 3–4 unvisited places with this vibe
        const suggestedPlaces = await Place.find({
          isActive: true,
          placeId: { $nin: visitedPlaceIds },
          vibe: sv,
        })
          .sort({ averageRating: -1 })
          .limit(4)
          .lean();

        if (suggestedPlaces.length >= 2) {
          tripSuggestions.push({ reason, vibe: sv, places: suggestedPlaces });
        }
      }
    }

    res.json({ places, tripSuggestions, topVibes, hasMore, page: pageNum });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Home recommendations failed" });
  }
});

// ── /surprise ─────────────────────────────────────────────────────────────────
// POST /api/recommend/surprise
// Picks a random vibe combo + time window and returns a ready-to-go itinerary.

const ALL_VIBE_IDS = [
  "thrill","mountain","spiritual","culture","nature","foodie",
  "chill","social","photo","budget","luxury","family",
  "romantic","solo","offbeat","wellness",
];

const SURPRISE_TAGLINES = [
  "Ready for the unexpected?",
  "We picked something fresh for you!",
  "Adventure awaits — trust us on this one.",
  "Feeling spontaneous? Here you go!",
  "Something new, just for you.",
];

router.post("/surprise", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Detect user's preferred area from recent trips
    const recentTrips = await Trip.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPlaceIds = recentTrips.flatMap(t => t.places.map(p => p.placeId));
    const recentPlaces = recentPlaceIds.length > 0
      ? await Place.find({ placeId: { $in: recentPlaceIds } }, { "location.area": 1 }).lean()
      : [];

    const areaCounts = {};
    for (const p of recentPlaces) {
      const a = p.location?.area;
      if (a) areaCounts[a] = (areaCounts[a] || 0) + 1;
    }
    const AREAS = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara"];
    const area = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      || AREAS[Math.floor(Math.random() * AREAS.length)];

    // 2. Random vibes (2–3, prefer vibes the user hasn't done much)
    const visitedPlaceIds = [
      ...new Set(recentTrips.flatMap(t => t.places.map(p => p.placeId)))
    ];
    const visitedDocs = visitedPlaceIds.length > 0
      ? await Place.find({ placeId: { $in: visitedPlaceIds } }, { vibe: 1 }).lean()
      : [];
    const usedVibeSet = new Set(visitedDocs.flatMap(p => p.vibe || []));

    const freshVibes = ALL_VIBE_IDS.filter(v => !usedVibeSet.has(v));
    const vibePool = freshVibes.length >= 2 ? freshVibes : ALL_VIBE_IDS;
    const shuffled = [...vibePool].sort(() => Math.random() - 0.5);
    const vibes = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));

    // 3. Random time window (3–6 hours, starting 8am–2pm)
    const startHour = 8 + Math.floor(Math.random() * 7);
    const duration  = 3 + Math.floor(Math.random() * 4);
    const endHour   = Math.min(startHour + duration, 23);
    const startTime = `${String(startHour).padStart(2, "0")}:00`;
    const endTime   = `${String(endHour).padStart(2, "0")}:00`;
    const PACES = ["balanced", "relaxed", "packed"];
    const pace  = PACES[Math.floor(Math.random() * PACES.length)];

    // 4. Run scoring logic (reuse helpers)
    const expandedVibes = expandVibes(vibes);
    const hardVibes = expandedVibes.filter(v => !SOFT_ONLY_VIBES.has(v));
    const softVibes = expandedVibes.filter(v =>  SOFT_ONLY_VIBES.has(v));
    const numberOfPlaces = computeNumberOfPlaces(startTime, endTime, pace, "car");

    let candidates = await Place.find({ "location.area": area, isActive: true }).lean();
    if (hardVibes.length > 0) {
      candidates = candidates.filter(p => p.vibe?.some(v => hardVibes.includes(v)));
    }
    // Fallback — if hard filter killed all results, relax it
    if (candidates.length < 2) {
      candidates = await Place.find({ "location.area": area, isActive: true }).lean();
    }

    const scored = candidates.map(p => {
      let score = (p.averageRating || 0) * 0.6 + Math.random() * 2.5;
      if (hardVibes.length > 0 && p.vibe?.some(v => hardVibes.includes(v))) score += 1.5;
      if (softVibes.length > 0 && p.vibe?.some(v => softVibes.includes(v))) score += 0.5;
      return { ...p, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const recommendedPlaces = scored.slice(0, numberOfPlaces);

    const tagline = SURPRISE_TAGLINES[Math.floor(Math.random() * SURPRISE_TAGLINES.length)];

    res.json({
      recommendedPlaces,
      vibes,
      startTime,
      endTime,
      area,
      pace,
      tagline,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Surprise recommendation failed" });
  }
});

module.exports = router;