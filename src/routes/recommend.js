const express = require("express");
const router = express.Router();
const Place = require("../models/place");

router.post("/", async (req, res) => {
  try {
    const { area, vibes, numberOfPlaces } = req.body;

    console.log("Vibes received:", vibes);
    console.log("Area chosen", area);
    console.log("Number of places", numberOfPlaces);
    // Step 1: filter by area & active
    const places = await Place.find({
      "location.area": area,
      isActive: true
    });

    // Step 2: scoring
    const scored = places.map(place => {
      let score = 0;

      // vibe matching
      if (place.vibe && vibes) {
        const matchCount = place.vibe.filter(v =>
          vibes.includes(v)
        ).length;

        score += matchCount * 3;
      }
      // rating boost
      score += (place.averageRating || 0);

      return { ...place.toObject(), score };
    });

    // Step 3: sort by score
    scored.sort((a, b) => b.score - a.score);

    console.log("Scored places:", scored);
    // Step 4: limit
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
      averageBudgetLevel: avgBudget.toFixed(1)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Recommendation failed" });
  }
});

module.exports = router;