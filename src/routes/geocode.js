const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");

/**
 * GET /api/geocode/autocomplete?input=Thamel
 * Proxies to Google Places Autocomplete — keeps the API key server-side.
 * Results are biased to Nepal (componentRestrictions=np).
 */
router.get("/autocomplete", authenticate, async (req, res) => {
  const { input } = req.query;
  if (!input || typeof input !== "string" || input.trim().length < 2) {
    return res.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "GOOGLE_PLACES_API_KEY not set in .env" });
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(input.trim())}` +
      `&components=country:np` +
      `&types=establishment|geocode` +
      `&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("[Geocode] Autocomplete error:", data.status, data.error_message);
      return res.status(400).json({ message: `Google API: ${data.status}` });
    }

    const predictions = (data.predictions || []).map(p => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text ?? p.description,
      secondaryText: p.structured_formatting?.secondary_text ?? ""
    }));

    res.json({ predictions });
  } catch (err) {
    console.error("Autocomplete proxy error:", err);
    res.status(500).json({ message: "Failed to fetch autocomplete" });
  }
});

/**
 * GET /api/geocode/details?placeId=ChIJ...
 * Returns lat/lng and derived area for a Google place_id.
 */
const KNOWN_AREAS = ["Kathmandu", "Pokhara", "Bhaktapur", "Lalitpur"];

router.get("/details", authenticate, async (req, res) => {
  const { placeId } = req.query;
  if (!placeId) {
    return res.status(400).json({ message: "placeId is required" });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "GOOGLE_PLACES_API_KEY not set in .env" });
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=geometry,address_components,formatted_address` +
      `&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("[Geocode] Details error:", data.status, data.error_message);
      return res.status(400).json({ message: `Google API: ${data.status}` });
    }

    const result = data.result;
    const lat = result.geometry.location.lat;
    const lng = result.geometry.location.lng;

    // Derive area from address components
    let area = null;
    const components = result.address_components || [];
    for (const comp of components) {
      const name = comp.long_name;
      if (KNOWN_AREAS.includes(name)) {
        area = name;
        break;
      }
    }
    // Fallback: check if the formatted address contains a known area
    if (!area && result.formatted_address) {
      for (const a of KNOWN_AREAS) {
        if (result.formatted_address.includes(a)) {
          area = a;
          break;
        }
      }
    }

    res.json({ lat, lng, area, formattedAddress: result.formatted_address });
  } catch (err) {
    console.error("Place details proxy error:", err);
    res.status(500).json({ message: "Failed to fetch place details" });
  }
});

module.exports = router;
