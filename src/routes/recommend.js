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

module.exports = router;