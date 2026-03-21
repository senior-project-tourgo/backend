const mongoose = require("mongoose");

/**
 * Reward catalog — items users can redeem using XP points.
 * User ↔ Rewards relationship tracked via User.redeemedRewards array.
 */
const rewardSchema = new mongoose.Schema({
    rewardId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    xpCost: { type: Number, required: true },           // XP required to redeem
    rewardType: {
        type: String,
        enum: ['discount', 'freebie', 'badge_boost', 'exclusive_access'],
        required: true,
    },
    // Optional link to a Promotion document
    promotionId: { type: String, ref: 'Promotion', default: null },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },            // null = no expiry
}, { timestamps: true });

module.exports = mongoose.model("Reward", rewardSchema);
