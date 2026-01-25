const express = require("express");
const SME = require("../models/sme");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Create SME (protected)
router.post("/", authMiddleware, async (req, res) => {
    try {
        const sme = await SME.create({
            ...req.body,
            owner: req.user.id,
        });
        res.json(sme);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all SMEs
router.get("/", async (req, res) => {
    const smes = await SME.find().populate("owner", "name email");
    res.json(smes);
});

module.exports = router;
