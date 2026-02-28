const express = require("express");
const Place = require("../models/place");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const mood = req.body.mood?.toLowerCase();
        const budget = Number(req.body.budget);
        const numberOfPeople = Number(req.body.numberOfPeople);

        if (!mood || !budget || !numberOfPeople) {
            return res.status(400).json({ message: "Missing filters" });
        }

        const places = await Place.find({
            moodTags: mood,
            minBudget: { $lte: budget },
            maxBudget: { $gte: budget },
            minPeople: { $lte: numberOfPeople },
            maxPeople: { $gte: numberOfPeople }
        }).sort({ rating: -1 });

        res.json(places);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;