const mongoose = require("mongoose");

/**
 * Tracks how much affinity a user has for each vibe.
 * Score increases each time the user visits a place with that vibe.
 * Used to personalise the home feed.
 */
const userVibeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    vibeId: { type: String, required: true },
    score: { type: Number, default: 1 },
    lastUpdated: { type: Date, default: Date.now },
});

// Compound unique index — one record per user+vibe pair
userVibeSchema.index({ userId: 1, vibeId: 1 }, { unique: true });

module.exports = mongoose.model("UserVibe", userVibeSchema);
