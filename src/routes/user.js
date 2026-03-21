const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Place = require('../models/place');
const Promotion = require('../models/promotion');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * GET /api/user/me
 * Get authenticated user's profile.
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
});

/**
 * POST /api/user/save-place/:placeId
 * Toggle save/unsave a place for the authenticated user.
 */
router.post('/save-place/:placeId', authenticate, async (req, res) => {
    try {
        const { placeId } = req.params;
        const user = await User.findById(req.user._id);

        const isSaved = user.savedPlaces.includes(placeId);
        if (isSaved) {
            user.savedPlaces = user.savedPlaces.filter(p => p !== placeId);
        } else {
            user.savedPlaces.push(placeId);
        }
        await user.save();

        res.json({ saved: !isSaved, savedPlaces: user.savedPlaces });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update saved places' });
    }
});

/**
 * POST /api/user/save-promotion/:promotionId
 * Toggle save/unsave a promotion for the authenticated user.
 */
router.post('/save-promotion/:promotionId', authenticate, async (req, res) => {
    try {
        const { promotionId } = req.params;
        const user = await User.findById(req.user._id);

        const isSaved = user.savedPromotions.includes(promotionId);
        if (isSaved) {
            user.savedPromotions = user.savedPromotions.filter(p => p !== promotionId);
        } else {
            user.savedPromotions.push(promotionId);
        }
        await user.save();

        res.json({ saved: !isSaved, savedPromotions: user.savedPromotions });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update saved promotions' });
    }
});

/**
 * GET /api/user/saved-places
 * Returns full Place objects for the user's saved places.
 */
router.get('/saved-places', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const places = await Place.find({ placeId: { $in: user.savedPlaces } });
        res.json(places);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch saved places' });
    }
});

/**
 * GET /api/user/saved-promotions
 * Returns full Promotion objects for the user's saved promotions.
 */
router.get('/saved-promotions', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const promotions = await Promotion.find({
            promotionId: { $in: user.savedPromotions }
        });
        res.json(promotions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch saved promotions' });
    }
});

module.exports = router;
