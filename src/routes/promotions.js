const express = require('express');
const router = express.Router();
const Promotion = require('../models/promotion');

/**
 * GET /api/promotions
 * Returns all active, non-expired promotions.
 */
router.get('/', async (req, res) => {
    try {
        const now = new Date();
        const promotions = await Promotion.find({
            isActive: true,
            endDate: { $gte: now }
        });
        res.json(promotions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch promotions' });
    }
});

/**
 * GET /api/promotions/:promotionId
 * Returns a single promotion by promotionId.
 */
router.get('/:promotionId', async (req, res) => {
    try {
        const promo = await Promotion.findOne({ promotionId: req.params.promotionId });
        if (!promo) return res.status(404).json({ message: 'Promotion not found' });
        res.json(promo);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch promotion' });
    }
});

/**
 * GET /api/promotions/by-place/:placeId
 * Returns all active promotions for a specific place.
 */
router.get('/by-place/:placeId', async (req, res) => {
    try {
        const now = new Date();
        const promotions = await Promotion.find({
            placeId: req.params.placeId,
            isActive: true,
            endDate: { $gte: now }
        });
        res.json(promotions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch promotions for place' });
    }
});

module.exports = router;
