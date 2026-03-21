const express = require('express');
const router = express.Router();
const Reward = require('../models/reward');
const User = require('../models/user');
const { authenticate } = require('../middleware/auth.middleware');

/**
 * GET /api/rewards
 * Returns all active rewards from the catalog.
 */
router.get('/', async (req, res) => {
    try {
        const rewards = await Reward.find({ isActive: true });
        res.json(rewards);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch rewards' });
    }
});

/**
 * POST /api/rewards/:rewardId/redeem
 * Redeem a reward by spending XP. Requires authentication.
 */
router.post('/:rewardId/redeem', authenticate, async (req, res) => {
    try {
        const reward = await Reward.findOne({ rewardId: req.params.rewardId });
        if (!reward) return res.status(404).json({ message: 'Reward not found' });
        if (!reward.isActive) return res.status(400).json({ message: 'Reward is no longer active' });

        const user = await User.findById(req.user._id);

        if (user.redeemedRewards.includes(reward.rewardId)) {
            return res.status(400).json({ message: 'You have already redeemed this reward' });
        }

        if (user.xp < reward.xpCost) {
            return res.status(400).json({
                message: `Not enough XP. Need ${reward.xpCost} XP but you have ${user.xp} XP.`
            });
        }

        user.xp -= reward.xpCost;
        user.redeemedRewards.push(reward.rewardId);
        user.badge = user.computeBadge();
        await user.save();

        res.json({
            message: 'Reward redeemed successfully',
            reward,
            remainingXp: user.xp,
            badge: user.badge
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to redeem reward' });
    }
});

module.exports = router;
